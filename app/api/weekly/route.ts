import { NextResponse } from 'next/server';

export const maxDuration = 60;

interface WeeklyRequest {
  points: string[];     // 用户输入的工作要点
  style: string;        // 风格：formal/short/detailed/casual
}

const STYLE_CONFIG: Record<string, { label: string; tone: string; instruction: string }> = {
  formal: {
    label: '正式专业',
    tone: '严谨、有条理、量化成果',
    instruction: '采用传统专业风格。本周完成事项用"已完成/推进中/待解决"分类，每条带数据指标。结尾有"下周计划"和"个人反思"段落。适合国企、事业单位、传统行业。',
  },
  short: {
    label: '简洁明了',
    tone: '短句、bullet 列表、直奔主题',
    instruction: '采用互联网简洁风格。每条工作 1-2 行，不超过 15 字。用 bullet 列表。无废话、不解释。适合互联网公司、外企。',
  },
  detailed: {
    label: '详细展开',
    tone: '每个工作详细描述过程、难点、解决方案',
    instruction: '采用详细复盘风格。每个工作展开成 2-3 句话，包括做了什么、怎么做、结果怎样、遇到什么困难。适合项目复盘、技术报告。',
  },
  casual: {
    label: '轻松活泼',
    tone: '口语化、有温度、不端着',
    instruction: '采用轻松活泼风格。可以使用"搞定了"、"踩了个坑"、"还不错"等口语词汇。第一人称讲述，语气像跟同事聊天。结尾有个人感想。',
  },
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { points, style } = body as WeeklyRequest;

    // 验证
    if (!Array.isArray(points) || points.length === 0) {
      return NextResponse.json(
        { error: '请至少输入 1 条工作要点' },
        { status: 400 }
      );
    }

    // 过滤空的要点
    const validPoints = points.map((p) => String(p || '').trim()).filter((p) => p.length > 0);
    if (validPoints.length === 0) {
      return NextResponse.json(
        { error: '请至少输入 1 条工作要点' },
        { status: 400 }
      );
    }

    // 验证风格
    const styleKey = STYLE_CONFIG[style] ? style : 'formal';
    const styleConfig = STYLE_CONFIG[styleKey];

    const fullPrompt = buildPrompt(validPoints, styleConfig);

    const aiResponse = await callDeepSeek([
      {
        role: 'system',
        content: '你是一个资深职场人，擅长写周报。请严格按照用户要求的风格和 JSON 格式输出。',
      },
      {
        role: 'user',
        content: fullPrompt,
      },
    ]);

    // 提取 JSON 对象
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('AI 响应中没有 JSON:', aiResponse.slice(0, 200));
      return NextResponse.json(
        { error: 'AI 这次没生成出周报，请重试' },
        { status: 500 }
      );
    }

    let parsed: { report: string; nextWeek: string[] };
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch (e) {
      console.error('JSON 解析失败:', jsonMatch[0].slice(0, 200));
      return NextResponse.json(
        { error: '周报解析失败，请重试' },
        { status: 500 }
      );
    }

    const report = typeof parsed.report === 'string' ? parsed.report.trim() : '';
    if (report.length === 0) {
      return NextResponse.json(
        { error: '没有生成出周报内容，请重试' },
        { status: 500 }
      );
    }

    const nextWeek = Array.isArray(parsed.nextWeek)
      ? parsed.nextWeek.filter((n) => typeof n === 'string' && n.trim().length > 0).map((n) => n.trim()).slice(0, 5)
      : [];

    return NextResponse.json({
      success: true,
      points: validPoints,
      style: styleKey,
      styleLabel: styleConfig.label,
      report,
      nextWeek,
    });
  } catch (error) {
    console.error('生成周报出错:', error);
    return NextResponse.json(
      { error: '周报服务出错，请稍后重试' },
      { status: 500 }
    );
  }
}

function buildPrompt(points: string[], styleConfig: { label: string; tone: string; instruction: string }): string {
  return `根据用户输入的本周工作要点，生成一份周报。

【用户输入的工作要点】
${points.map((p, i) => `${i + 1}. ${p}`).join('\n')}

【风格要求】
${styleConfig.instruction}

【任务】
1. **周报全文（report）**：基于用户要点，扩展成完整的周报正文（300-600 字）
2. **下周建议（nextWeek）**：3-5 条下周可以做的工作建议

【输出格式 — 严格的 JSON 对象】
{
  "report": "周报完整内容...",
  "nextWeek": ["建议1", "建议2", "建议3"]
}

请直接返回 JSON 对象，不要 markdown 代码块标记。`;
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
      max_tokens: 2500,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`DeepSeek API 错误: ${JSON.stringify(data)}`);
  }

  return data.choices[0].message.content;
}