import { NextResponse } from 'next/server';

export const maxDuration = 60;

interface LoveRequest {
  message: string;        // 对方发来的消息
  theirGender: string;    // 对方性别：男/女/不确定
  myGender: string;       // 自己的性别：男/女/其他
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { message, theirGender, myGender } = body as LoveRequest;

    // 验证
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

    const fullPrompt = buildPrompt({
      message: message.trim(),
      theirGender: theirGender || '不确定',
      myGender: myGender || '其他',
    });

    const aiResponse = await callDeepSeek([
      {
        role: 'system',
        content: '你是一个高情商、温暖、善解人意的社交沟通顾问。你帮助用户回复消息，让他们显得真诚、有礼貌、有吸引力。请始终保持尊重和得体的态度。',
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
        { error: 'AI 这次没生成出回复，请重试' },
        { status: 500 }
      );
    }

    let replies: Array<{ reply: string; style: string }>;
    try {
      replies = JSON.parse(jsonMatch[0]);
    } catch (e) {
      console.error('JSON 解析失败:', jsonMatch[0].slice(0, 200));
      return NextResponse.json(
        { error: '回复解析失败，请重试' },
        { status: 500 }
      );
    }

    // 验证 + 规范化
    const validReplies = replies
      .filter((r) => r && r.reply && typeof r.reply === 'string')
      .slice(0, 5)
      .map((r) => ({
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
}): string {
  const { message, theirGender, myGender } = params;

  return `用户收到了一条消息，需要你帮他/她想几条高情商的回复。

【对方发的消息】
"${message}"

【场景信息】
- 对方性别：${theirGender}
- 自己的性别：${myGender}

【你的任务】
根据消息的内容、语气、场景，生成 2-4 条不同风格的回复建议。

【要求】
1. 每条回复要有自己的风格（温柔/直接/幽默/礼貌/暧昧等），让用户有选择空间
2. 语气真诚得体，不要油腻、不要 PUA、不要物化对方
3. 根据双方性别调整称呼和语气
4. 简短自然（不超过 50 字）
5. 如果消息本身已经有点暧昧，回复可以稍主动；如果是普通朋友聊天，回复保持友好

【输出格式 — 严格的 JSON 数组】
[
  {
    "reply": "回复的内容",
    "style": "这条回复的风格标签（如：温柔含蓄 / 直接主动 / 幽默风趣 / 礼貌友好）"
  }
]

【注意】
- 直接返回 JSON 数组
- 不要任何解释、markdown 代码块、说明文字`;
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
      temperature: 0.9,    // 回复要灵活但不能太离谱
      max_tokens: 2000,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`DeepSeek API 错误: ${JSON.stringify(data)}`);
  }

  return data.choices[0].message.content;
}