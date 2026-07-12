import { NextResponse } from 'next/server';
import { checkAndRecordUsage } from '@/lib/usage';

export const maxDuration = 60;

interface SloganRequest {
  keywords: string;        // 关键词
  count: number;           // 句数
  charPerLine: string;    // 每句字数：'4' / '7' / '8' / 'free' / '4-8'
  rhyme: boolean;         // 是否押韵
}

export async function POST(request: Request) {
  // 检查试用限制 + 白名单
  const usage = await checkAndRecordUsage('slogan');
  if (!usage.allowed) {
    return NextResponse.json({ error: usage.reason }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { keywords, count, charPerLine, rhyme } = body as SloganRequest;

    // 验证
    if (!keywords || keywords.trim().length === 0) {
      return NextResponse.json(
        { error: '请输入至少一个关键词' },
        { status: 400 }
      );
    }

    const validCount = Math.max(1, Math.min(20, parseInt(String(count)) || 5));
    const validCharPerLine = String(charPerLine || 'free').trim();

    const fullPrompt = buildPrompt({
      keywords: keywords.trim(),
      count: validCount,
      charPerLine: validCharPerLine,
      rhyme: Boolean(rhyme),
    });

    const aiResponse = await callDeepSeek([
      {
        role: 'system',
        content: '你是一个专业的文案撰写人，擅长写朗朗上口、有感染力的口号。请严格按照用户要求输出。',
      },
      {
        role: 'user',
        content: fullPrompt,
      },
    ]);

    // 提取 JSON 数组
    const jsonMatch = aiResponse.match(/\[[\s\S]*?\]/);
    if (!jsonMatch) {
      console.error('AI 响应中没有 JSON:', aiResponse.slice(0, 200));
      return NextResponse.json(
        { error: 'AI 这次没生成出口号，请重试' },
        { status: 500 }
      );
    }

    let slogans: string[];
    try {
      slogans = JSON.parse(jsonMatch[0]);
    } catch (e) {
      console.error('JSON 解析失败:', jsonMatch[0].slice(0, 200));
      return NextResponse.json(
        { error: '口号解析失败，请重试' },
        { status: 500 }
      );
    }

    // 验证 + 规范化
    const validSlogans = slogans
      .filter((s) => typeof s === 'string' && s.trim().length > 0)
      .map((s) => s.trim().replace(/^["']|["']$/g, '')) // 去掉多余引号
      .slice(0, validCount);

    if (validSlogans.length === 0) {
      return NextResponse.json(
        { error: '没有生成出有效的口号，请换个关键词试试' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      keywords: keywords.trim(),
      count: validCount,
      charPerLine: validCharPerLine,
      rhyme: Boolean(rhyme),
      slogans: validSlogans,
    });
  } catch (error) {
    console.error('生成口号出错:', error);
    return NextResponse.json(
      { error: '口号服务出错，请稍后重试' },
      { status: 500 }
    );
  }
}

function buildPrompt(params: {
  keywords: string;
  count: number;
  charPerLine: string;
  rhyme: boolean;
}): string {
  const { keywords, count, charPerLine, rhyme } = params;

  // 字数规则说明
  let charRule = '';
  if (charPerLine === 'free') {
    charRule = '每句字数不限（10-25 字之间较佳）';
  } else if (charPerLine.includes('-')) {
    charRule = `每句字数在 ${charPerLine} 之间`;
  } else {
    charRule = `每句严格 ${charPerLine} 个字`;
  }

  // 押韵规则说明
  const rhymeRule = rhyme
    ? '所有口号必须押韵（建议押 ang/eng/ing/ong/an/en/in 等开口韵）'
    : '不要求押韵';

  return `请根据用户提供的关键词，生成 ${count} 句口号。

【关键词】
${keywords}

【要求】
1. 字数：${charRule}
2. 韵律：${rhymeRule}
3. 风格：积极向上、朗朗上口、有感染力
4. 每句独立成行，能直接用作班级口号、广告语、运动会口号等

【输出格式 — 严格的 JSON 数组】
[
  "口号 1",
  "口号 2",
  "口号 3",
  ...
]

【注意】
- 如果用户要求很死（比如严格 4 字 + 押韵），可以适当减少 1-2 句，但绝不能凑出不通顺的句子
- 不要任何解释、markdown 代码块、说明文字
- 直接返回 JSON 数组`;
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
      temperature: 1.0,    // 口号要创意，温度调高
      max_tokens: 2000,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`DeepSeek API 错误: ${JSON.stringify(data)}`);
  }

  return data.choices[0].message.content;
}