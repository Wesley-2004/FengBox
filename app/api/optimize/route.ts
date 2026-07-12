import { NextResponse } from 'next/server';
import { checkAndRecordUsage } from '@/lib/usage';

export const maxDuration = 60;

interface OptimizeRequest {
  resume: string;
  targetJob: string;
}

export async function POST(request: Request) {
  const usage = await checkAndRecordUsage('resume');
  if (!usage.allowed) {
    return NextResponse.json({ error: usage.reason }, { status: 403 });
  }

  try {
    const { resume, targetJob } = (await request.json()) as OptimizeRequest;

    if (!resume || resume.trim().length < 50) {
      return NextResponse.json(
        { error: '请提供简历内容（至少 50 字）' },
        { status: 400 }
      );
    }

    if (!targetJob || targetJob.trim().length === 0) {
      return NextResponse.json(
        { error: '请填写目标岗位（这能让我们给更精准的建议）' },
        { status: 400 }
      );
    }

    const fullPrompt = buildV2Prompt(resume.trim(), targetJob.trim(), resume.includes('[UPLOADED]') || resume.length > 500);

    const aiResponse = await callDeepSeek([
      {
        role: 'system',
        content: '你是一个顶级的中国互联网公司资深 HR 总监 + 简历优化专家，拥有 15 年招聘经验，看过 10 万+简历。你既懂"通用简历建议"，更懂"针对具体岗位的具体改写"。请严格按照 JSON 格式输出。',
      },
      {
        role: 'user',
        content: fullPrompt,
      },
    ]);

    let parsed: any;
    try {
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('AI 响应中没有 JSON');
      }
      parsed = JSON.parse(jsonMatch[0]);
    } catch (e) {
      console.error('JSON 解析失败:', aiResponse.slice(0, 300));
      return NextResponse.json(
        { error: '简历解析失败，请重试（可能是简历格式太特殊）' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      targetJob: targetJob.trim(),
      diagnosis: parsed.diagnosis || [],
      comparisons: parsed.comparisons || [],
      rewrite: parsed.rewrite || '',
      summary: parsed.summary || '',
    });
  } catch (error) {
    console.error('优化出错:', error);
    return NextResponse.json(
      { error: '简历优化服务出错，请稍后重试' },
      { status: 500 }
    );
  }
}

function buildV2Prompt(resume: string, targetJob: string, isPdfUpload: boolean): string {
  const pdfWarning = isPdfUpload ? `

【⚠️ 重要：PDF 来源说明】
这份简历来自 PDF 上传。PDF 文本提取会**丢失**以下信息：
- ❌ 图标 / 颜色 / 排版布局
- ❌ 重点标记（高亮、底色、加粗视觉）
- ❌ 表格 / 时间线 / 分割线等视觉结构
- ❌ Logo / 头像等图片
- ❌ 字号大小、字体差异等视觉层次

**你看到的"文本看起来乱" ≠ 用户简历真的乱** — 这只是 PDF 提取技术的限制。

**你的评分要求（针对 PDF 来源）**：
- ✅ 只评估**内容质量**：清晰度、量化数据、关键词匹配、岗位匹配度
- ❌ **不要评分排版 / 视觉 / 图标使用** — 你看不到这些
- ❌ 如果文本片段不连贯，**不要假设是用户排版差**，那是 PDF 提取问题
- ❌ **不要因为 PDF 提取造成的"乱"** 来扣分
` : '';

  return `你现在是顶级 HR 总监，给一份求职"${targetJob}"岗位的简历做深度优化。${pdfWarning}

【用户简历】
${resume}

【目标岗位】
${targetJob}

【任务 — 3 步输出】

## 第 1 步：结构化诊断（必做）

把简历解析成 5 个部分：
- 基本信息（姓名 / 联系方式 / 工作年限 / 当前职位 / 行业）
- 教育背景
- 工作经历
- 项目经验
- 技能

每部分按这个标准打分（满分 100 分，分数尽量拉开档次）：
- 90-100：清晰、详细、有数据、亮点突出
- 75-89：基本齐全，有亮点但描述不够有力
- 60-74：明显缺内容或描述粗糙
- 40-59：需要重大改进
- 0-39：几乎缺失或严重失分

每部分给一个 score（0-100 整数），一个 verdict（"优秀"/"良好"/"需改进"/"重大问题"），一个 shortComment（一句话说明）。

最后给一个 overallScore（必须是 5 部分 score 的**算术平均值**，四舍五入到整数）和一个 verdict（综合评价）。

**重要**：
1. overallScore 必须 = (基本信息 + 教育背景 + 工作经历 + 项目经验 + 技能) / 5，四舍五入到整数
2. 每个 score 必须是 0-100 之间的**整数**
3. verdict 对应规则：≥85 优秀 / ≥70 良好 / ≥55 需改进 / <55 重大问题

## 第 2 步：找最弱的 3-5 段，给"原文 vs 改后"对比

从简历里挑出 3-5 段**最弱的内容**（"负责网站开发"、"参与了项目"这种笼统描述），每段都要包含：

{
  "original": "原文（完整一句话，从简历里复制）",
  "rewritten": "改写后（符合 ${targetJob} 岗位要求，动词开头 + 量化数据 + 突出成果）",
  "reason": "为什么这样改（一句话）"
}

**这一步是核心 — 用户最看重的就是看"具体改写"。** 改写不能是空话套话，必须真有信息量。

## 第 3 步：完整改写版

基于原简历 + 目标岗位 ${targetJob}，重写一份"高分简历"——按以下结构：

【基本信息】
姓名 / 联系方式 / 工作年限

【教育背景】
学校 / 专业 / 学历 / 时间

【工作经历】
（按时间倒序，重写每段经历）

【项目经验】
（挑选 2-3 个最相关的项目，重写）

【技能】
（按"熟练 / 掌握 / 了解"分级）

**格式要求**：使用 Markdown 排版（标题用 #，列表用 -）。

## 最后：总结（一段话）

针对目标岗位 ${targetJob}，用 3-5 句话总结：
- 这份简历最大的 3 个优点
- 投递 ${targetJob} 岗位的竞争力评估
- 1 句话行动建议

【输出格式 — 严格的 JSON 对象】
{
  "diagnosis": [
    {
      "category": "基本信息",
      "score": 85,
      "verdict": "优秀",
      "comment": "联系方式完整，工作年限清晰"
    },
    {
      "category": "教育背景",
      "score": 70,
      "verdict": "良好",
      "comment": "..."
    },
    { "category": "工作经历", "score": 50, "verdict": "需改进", "comment": "..." },
    { "category": "项目经验", "score": 60, "verdict": "需改进", "comment": "..." },
    { "category": "技能", "score": 65, "verdict": "需改进", "comment": "..." }
  ],
  "overallScore": 66,
  "overallVerdict": "整体合格（66/100），但工作经历描述过于笼统，需要补充量化数据",
  "comparisons": [
    {
      "original": "负责网站开发",
      "rewritten": "主导公司主站从 0 到 1 重构，引入 SSR 架构使首屏加载速度提升 65%",
      "reason": "动词开头 + 量化数据 + 突出成果"
    },
    // 至少 3 条，最多 5 条
  ],
  "rewrite": "# 完整改写简历\\n\\n## 基本信息\\n...\\n\\n## 教育背景\\n...\\n\\n## 工作经历\\n...\\n\\n## 项目经验\\n...\\n\\n## 技能\\n...",
  "summary": "针对 ${targetJob} 岗位...（3-5 句话总结）"
}

请直接返回 JSON 对象，不要任何 markdown 代码块标记。`;
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
      temperature: 0.7,
      max_tokens: 4000,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`DeepSeek API 错误: ${JSON.stringify(data)}`);
  }

  return data.choices[0].message.content;
}
