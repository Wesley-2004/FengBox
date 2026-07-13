import { NextResponse } from 'next/server';
import { checkAndRecordUsage } from '@/lib/usage';
import { callDeepSeek, parseJsonResponse } from '@/lib/ai/deepseek';

export const maxDuration = 60;

interface ChatTurn {
  role: 'me' | 'them';   // 'me' = 我；'them' = TA（对方）
  text: string;
}

interface LoveRequest {
  message: string;           // 对方发来的消息
  theirGender: string;       // 对方性别：男/女/不确定
  myGender: string;          // 自己的性别：男/女/其他
  history?: ChatTurn[];      // 历史聊天记录（可选，最多 10 条）
}

export async function POST(request: Request) {
  // 1. 试用 / 白名单 gate
  const usage = await checkAndRecordUsage('love');
  if (!usage.allowed) {
    return NextResponse.json({ error: usage.reason }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { message, theirGender, myGender, history } = body as LoveRequest;

    // 2. 校验
    if (!message || message.trim().length === 0) {
      return NextResponse.json(
        { error: '请输入对方发来的消息' },
        { status: 400 }
      );
    }
    if (message.trim().length > 500) {
      return NextResponse.json(
        { error: '消息太长（最多 500 字）' },
        { status: 400 }
      );
    }
    if (history && !Array.isArray(history)) {
      return NextResponse.json(
        { error: 'history 必须为数组' },
        { status: 400 }
      );
    }
    // history 限长 + 限条目数（防 prompt 过长 / 防恶意大输入）
    const safeHistory = Array.isArray(history)
      ? history
          .filter((t) => t && typeof t.text === 'string' && (t.role === 'me' || t.role === 'them'))
          .slice(-10)
          .map((t) => ({ role: t.role, text: String(t.text).slice(0, 200) }))
      : [];

    const fullPrompt = buildPrompt({
      message: message.trim(),
      theirGender: theirGender || '不确定',
      myGender: myGender || '其他',
      history: safeHistory,
    });

    const aiText = await callDeepSeek(
      [
        {
          role: 'system',
          content:
            '你是一个高情商、温暖、善解人意的社交沟通顾问。' +
            '你帮助用户回复消息，让他们显得真诚、有礼貌、有吸引力。' +
            '请始终保持尊重和得体的态度。',
        },
        { role: 'user', content: fullPrompt },
      ],
      { temperature: 0.9, maxTokens: 2000 },
    );

    // 解析 JSON
    const parsed = parseJsonResponse(aiText);
    const raw = extractArray(parsed, aiText);
    if (!raw || raw.length === 0) {
      console.error('AI 响应中无法解析 JSON:', aiText.slice(0, 200));
      return NextResponse.json(
        { error: 'AI 这次没生成出回复，请重试' },
        { status: 500 }
      );
    }

    const validReplies = raw
      .filter((r: any) => r && r.reply && typeof r.reply === 'string')
      .slice(0, 5)
      .map((r: any) => ({
        reply: String(r.reply).trim().replace(/^["']|["']$/g, ''),
        style: String(r.style || '得体').trim(),
      }));

    if (validReplies.length === 0) {
      return NextResponse.json(
        { error: '没有生成出有效的回复，请换个消息试试' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      originalMessage: message.trim(),
      theirGender: theirGender || '不确定',
      myGender: myGender || '其他',
      historyUsed: safeHistory.length,
      replies: validReplies,
    });
  } catch (error) {
    console.error('生成回复出错:', error);
    return NextResponse.json(
      { error: '回复服务出错，请稍后重试' },
      { status: 500 }
    );
  }
}

function buildPrompt(params: {
  message: string;
  theirGender: string;
  myGender: string;
  history: ChatTurn[];
}): string {
  const { message, theirGender, myGender, history } = params;

  const historyBlock = history.length === 0
    ? '（用户未提供历史聊天记录——按通用情况给出回复即可。）'
    : `以下是用户与对方的真实历史聊天记录（最多 10 条），请仔细阅读，**从中分析 TA 的性格、说话习惯、情绪状态、对用户的态度**，让回复更贴合 TA 的风格。

【历史聊天记录】
${history.map((t, i) => `${i + 1}. [${t.role === 'me' ? '我' : 'TA'}] ${t.text}`).join('\n')}

【分析要求 — 内化在心里，不要写到回复里】
1. TA 说话风格：是话多还是话少？喜欢用 emoji 吗？语气正式还是随意？
2. TA 对用户的态度：热情？冷淡？敷衍？试探？暧昧？
3. 两人关系阶段：刚认识 / 老朋友 / 暧昧期 / 已表白 / 已在一起？
4. 用户的回复（[我] 部分）是什么风格：直接？含蓄？幽默？
5. 综合判断：这条新消息"TA 说..."的潜台词是什么？是字面意思还是有言外之意？`;

  return `用户收到了一条消息，需要你帮他/她想几条高情商的回复。

【对方发的消息】
"${message}"

【场景信息】
- 对方性别：${theirGender}
- 自己的性别：${myGender}

【历史聊天记录分析】
${historyBlock}

【你的任务 — 三步走】
1. **内部分析**（在心里进行，不要写到回复里）：
   - 如果有历史记录：基于 TA 的说话风格 + 对用户的态度 + 两人关系阶段，推断这条消息的真实意图
   - 如果没有历史记录：按通用情况处理（消息字面意思 + 双方性别）
2. **针对性生成**：根据内部分析，给出 3 条不同风格的回复，每条都贴合 TA 的性格特点
3. **避免套路**：不要千篇一律的"哈哈好的"、不要油腻、不要 PUA、不要物化对方

【要求】
1. 每条回复有自己的风格（温柔含蓄 / 直接主动 / 幽默风趣 / 礼貌友好 / 暧昧撩人等）
2. 语气真诚得体，**如果有历史记录，回复的语言风格要呼应 TA**（比如 TA 爱用 emoji 你就用，TA 简短你也别啰嗦）
3. 简短自然（不超过 60 字）
4. 如果有历史记录暗示两人已经很熟/暧昧，回复可以更亲近；如果是刚认识或不确定，保持友好距离

【输出格式 — 严格 JSON 数组，不要 markdown 包裹】
[
  {
    "reply": "回复的内容",
    "style": "这条回复的风格标签（如：温柔含蓄 / 直接主动 / 幽默风趣 / 礼貌友好 / 暧昧撩人）"
  }
]`;
}

function extractArray(parsed: any, raw: string): any[] | null {
  if (Array.isArray(parsed)) return parsed;
  if (parsed && Array.isArray(parsed.replies)) return parsed.replies;
  const m = raw.match(/\[[\s\S]*?\]/);
  if (m) {
    try { return JSON.parse(m[0]); } catch { return null; }
  }
  return null;
}