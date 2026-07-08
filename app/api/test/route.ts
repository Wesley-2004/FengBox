import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const { message } = await request.json();

    if (!message) {
      return NextResponse.json(
        { error: '请提供消息内容' },
        { status: 400 }
      );
    }

    // 调用 DeepSeek API
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: '你是一个友好的 AI 助手，请用简洁的中文回答用户问题。',
          },
          {
            role: 'user',
            content: message,
          },
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('DeepSeek API 错误:', data);
      return NextResponse.json(
        { error: 'AI 服务出错', details: data },
        { status: 500 }
      );
    }

    const aiReply = data.choices[0].message.content;

    return NextResponse.json({
      success: true,
      reply: aiReply,
    });
  } catch (error) {
    console.error('错误:', error);
    return NextResponse.json(
      { error: '服务器出错' },
      { status: 500 }
    );
  }
}
