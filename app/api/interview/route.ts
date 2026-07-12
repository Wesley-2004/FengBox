import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';

export const maxDuration = 60;

interface InterviewRequest {
  rewrittenResume: string;
  targetJob: string;
  history: Array<{
    role: 'assistant' | 'user';
    content: string;
  }>;
  userAnswer?: string;        // 用户提交自己的回答后才有
  currentQuestion?: string;   // 当前问题（用户回答的是哪个）
  isFirstQuestion?: boolean;  // 是否第一次提问（没有 userAnswer）
}

interface InterviewResponse {
  question: string;             // 给候选人的问题
  aiAnswer?: string;            // AI 的标准答案（仅在用户提交答案后才返回）
  hint?: string;                // 提示（可选）
  roundNumber: number;          // 当前轮数（1-5）
  isFinished?: boolean;         // 是否到了结束轮次
  nextQuestion?: string;        // 下一个问题（用户提交答案后才会有）
}

const MAX_ROUNDS = 3;
const MIN_ROUNDS = 3;

export async function POST(request: Request) {
  const supabase = await createServerSupabase();

  // 1. 检查用户是否登录
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: '请先登录' }, { status: 401 });
  }

  // 2. 检查是否是白名单用户
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_whitelist')
    .eq('id', user.id)
    .single();

  if (!profile?.is_whitelist) {
    return NextResponse.json(
      {
        error: 'AI 面试官是会员/白名单专享功能，请先成为会员',
        code: 'NEED_MEMBERSHIP',
      },
      { status: 403 }
    );
  }

  try {
    const body = (await request.json()) as InterviewRequest;
    const { rewrittenResume, targetJob, history, userAnswer, currentQuestion } = body;

    if (!rewrittenResume || rewrittenResume.trim().length < 50) {
      return NextResponse.json({ error: '简历内容不完整' }, { status: 400 });
    }
    if (!targetJob) {
      return NextResponse.json({ error: '缺少目标岗位' }, { status: 400 });
    }

    // roundNumber = 当前历史中有几个 assistant（Q1=1, Q2=2, Q3=3）
    // 不要 +1（之前的 +1 在最后一题回答时算成 4，导致进结束态漏 AI 答案）
    const roundNumber = history.filter((m) => m.role === 'assistant').length;

    // 判断"是否真的结束"：答完最后一题（round === 3 且有 userAnswer）
    const isTrulyFinished = roundNumber === MAX_ROUNDS && !!userAnswer;

    // 判断场景：
    // - 第一轮（没 userAnswer）：只生成第一个问题
    // - 后续轮（有 userAnswer + currentQuestion）：生成 AI 标准答案 + 下一个问题
    const isFirstQuestion = !userAnswer && history.length === 0;

    // 是否是最后一轮（用户提交答案后进入下一轮前判断）
    const isLastRound = roundNumber >= MAX_ROUNDS;

    const fullPrompt = isFirstQuestion
      ? buildFirstQuestionPrompt(rewrittenResume, targetJob, roundNumber)
      : buildFollowUpPrompt({
          resume: rewrittenResume,
          job: targetJob,
          history,
          userAnswer: userAnswer || '',
          currentQuestion: currentQuestion || '',
          round: roundNumber,
          isLastRound,
        });

    const aiResponse = await callDeepSeek([
      {
        role: 'system',
        content: `你是一位资深的${targetJob}技术面试官，正在面试一位候选人。你已经看过了他的简历（改写版），现在要基于简历中的某一段经历深入提问。

你的风格：专业、友好、像真人在面试。你**只问一条经历**相关的细节问题，不要跨段经历跳来跳去。

输出格式：严格的 JSON 对象，不要任何 markdown 标记。`,
      },
      {
        role: 'user',
        content: fullPrompt,
      },
    ]);

    return NextResponse.json(parseAIResponse(aiResponse, roundNumber, isTrulyFinished));
  } catch (error) {
    console.error('面试官出错:', error);
    return NextResponse.json(
      { error: 'AI 面试官服务出错，请稍后重试' },
      { status: 500 }
    );
  }
}

// 生成第 1 个问题的 prompt
function buildFirstQuestionPrompt(
  resume: string,
  job: string,
  round: number
): string {
  return `这是面试的第 ${round} 轮，你要给出**第 1 个问题**。

【候选人简历（改写版）】
${resume}

【目标岗位】
${job}

你的任务：从简历中**挑一段最有意思的经历**（最有数字 / 最复杂的项目 / 最相关岗位的），针对这段经历提第 1 个问题。

要求：
- 问题要**具体**（不要"介绍一下 XX"，要"在 XX 项目中，你说的'性能优化 50%'具体是怎么测出来的？"）
- 只问 1 个问题
- 围绕简历中**真实细节**追问（数字、成果、技术栈、难点）
- 自然口语化（像真人在面试）

【输出格式 — 严格 JSON】
{
  "question": "你的问题",
  "hint": "给候选人的回答提示（可选，1-2 句话）"
}

请直接返回 JSON。`;
}

// 生成后续轮次的 prompt（同时给 AI 标准答案 + 下一个问题）
function buildFollowUpPrompt(params: {
  resume: string;
  job: string;
  history: Array<{ role: 'assistant' | 'user'; content: string }>;
  userAnswer: string;
  currentQuestion: string;
  round: number;
  isLastRound: boolean;  // 是否是最后一轮（已经到达 MAX_ROUNDS）
}): string {
  const { resume, job, history, userAnswer, currentQuestion, round, isLastRound } = params;

  // 之前的所有对话
  const conversationHistory = history
    .map((m) => `${m.role === 'assistant' ? '面试官' : '候选人'}：${m.content}`)
    .join('\n');

  // 最后一轮：只给 aiAnswer，不要 nextQuestion
  if (isLastRound) {
    return `这是面试的**第 ${round} 轮（最后一轮）**。候选人已经答完所有问题，你**只需要给 AI 标准答案**，不要再生成下一个问题。

【候选人简历（改写版）】
${resume}

【目标岗位】
${job}

【之前的对话历史】
${conversationHistory}

【本轮情况】
- 面试官刚才问：「${currentQuestion}」
- 候选人回答：「${userAnswer}」

【你的唯一任务：给 AI 标准答案（陈述句，详细）】
- 这个问题的"理想答案"应该包含哪些要点？
- 用陈述句写，**不要写成下一个问题**
- 内容要丰富（200-400 字），让候选人看到能学到东西
- 格式：先说"理想回答应该提到..."然后列要点

【输出格式 — 严格 JSON】
{
  "aiAnswer": "AI 标准答案 / 参考思路（陈述句，200-400 字）"
}

请直接返回 JSON。`;
  }

  // 非最后一轮：双重任务
  return `这是面试的第 ${round} 轮。

【候选人简历（改写版）】
${resume}

【目标岗位】
${job}

【之前的对话历史】
${conversationHistory}

【本轮情况】
- 面试官刚才问：「${currentQuestion}」
- 候选人回答：「${userAnswer}」

【你的双重任务】

**任务 1：给 AI 标准答案（陈述句，详细）**
- 这个问题的"理想答案"应该包含哪些要点？
- 用陈述句写，**不要写成下一个问题**
- 内容要丰富（200-400 字），让候选人看到能学到东西
- 格式：先说"理想回答应该提到..."然后列要点

**任务 2：基于候选人的回答，生成下一个追问**
- **必须基于同一段经历**继续追问（不要换到别的经历）
- 如果候选人回答**太笼统**（"做了 XX 优化"）→ 追问具体数字 / 细节 / 难点
- 如果候选人回答**有具体细节**→ 追问下一个相关的问题（"为什么选 XX 而不是 YY？"、"踩过什么坑？"）
- 如果候选人回答**不太清楚**→ 换个角度再问，但不要换经历
- 问题要**有深度**，不是上一题的简单重复

【输出格式 — 严格 JSON】
{
  "aiAnswer": "AI 标准答案 / 参考思路（陈述句，200-400 字）",
  "nextQuestion": "下一个追问（只 1 个）"
}

请直接返回 JSON。`;
}

// 解析 AI 响应
function parseAIResponse(text: string, round: number, isFinished: boolean): InterviewResponse {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      const base = {
        roundNumber: round,
        // isFinished 用调用方传入的（答完最后一题时为 true）
        isFinished,
      };

      // 第一轮（只有 question）
      if (parsed.question && !parsed.nextQuestion && !parsed.aiAnswer) {
        return {
          ...base,
          question: String(parsed.question).trim(),
          hint: parsed.hint ? String(parsed.hint).trim() : undefined,
        };
      }

      // 后续轮非最后一题（有 aiAnswer + nextQuestion）
      if (parsed.aiAnswer && parsed.nextQuestion) {
        return {
          ...base,
          question: String(parsed.nextQuestion).trim(),
          aiAnswer: String(parsed.aiAnswer).trim(),
        };
      }

      // ★ 最后一轮：AI 只返回 aiAnswer，没有 nextQuestion
      // 这种情况 question 设为空字符串，前端靠 isFinished=true 识别结束
      if (parsed.aiAnswer && !parsed.nextQuestion) {
        return {
          ...base,
          question: '',  // 不显示下一个问题
          aiAnswer: String(parsed.aiAnswer).trim(),
        };
      }

      // 兜底：有 aiAnswer 的话一定要带上
      if (parsed.aiAnswer) {
        return {
          ...base,
          question: String(parsed.nextQuestion || parsed.question || '').trim(),
          aiAnswer: String(parsed.aiAnswer).trim(),
        };
      }

      // 兜底（连 aiAnswer 都没有的极端情况）
      return {
        ...base,
        question: String(parsed.question || parsed.nextQuestion || '').trim(),
      };
    }
  } catch (e) {
    console.error('面试官 JSON 解析失败:', text.slice(0, 200));
  }

  return {
    question: text.trim(),
    roundNumber: round,
    isFinished,
  };
}

async function callDeepSeek(messages: Array<{ role: string; content: string }>) {
  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages,
      temperature: 0.85,
      max_tokens: 2000,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`DeepSeek API 错误: ${JSON.stringify(data)}`);
  }

  return data.choices[0].message.content;
}