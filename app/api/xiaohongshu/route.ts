import { NextResponse } from 'next/server';
import { checkAndRecordUsage } from '@/lib/usage';

export const maxDuration = 60;

interface XiaohongshuRequest {
  topic: string;
}

export async function POST(request: Request) {
  // 检查试用限制 + 白名单
  const usage = await checkAndRecordUsage('xiaohongshu');
  if (!usage.allowed) {
    return NextResponse.json({ error: usage.reason }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { topic } = body as XiaohongshuRequest;

    // 验证
    if (!topic || topic.trim().length === 0) {
      return NextResponse.json(
        { error: '请输入文案主题' },
        { status: 400 }
      );
    }

    if (topic.trim().length > 100) {
      return NextResponse.json(
        { error: '主题太长了（最多 100 字）' },
        { status: 400 }
      );
    }

    const fullPrompt = buildPrompt(topic.trim());

    const aiResponse = await callDeepSeek([
      {
        role: 'system',
        content: '你是一个小红书爆款文案写手，熟悉小红书平台的调性和爆款规律。请严格按照用户要求的 JSON 格式输出。',
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
        { error: 'AI 这次没生成出文案，请重试' },
        { status: 500 }
      );
    }

    let parsed: { titles: string[]; content: string; tags: string[] };
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch (e) {
      console.error('JSON 解析失败:', jsonMatch[0].slice(0, 200));
      return NextResponse.json(
        { error: '文案解析失败，请重试' },
        { status: 500 }
      );
    }

    // 验证 + 规范化
    const titles = Array.isArray(parsed.titles)
      ? parsed.titles.filter((t) => typeof t === 'string' && t.trim().length > 0).map((t) => t.trim()).slice(0, 5)
      : [];

    if (titles.length === 0) {
      return NextResponse.json(
        { error: '没有生成出标题，请换个主题试试' },
        { status: 500 }
      );
    }

    const content = typeof parsed.content === 'string' ? parsed.content.trim() : '';
    if (content.length === 0) {
      return NextResponse.json(
        { error: '没有生成出正文，请重试' },
        { status: 500 }
      );
    }

    const tags = Array.isArray(parsed.tags)
      ? parsed.tags.filter((t) => typeof t === 'string' && t.trim().length > 0).map((t) => t.trim().replace(/^#/, '')).slice(0, 8)
      : [];

    return NextResponse.json({
      success: true,
      topic: topic.trim(),
      titles,
      content,
      tags,
    });
  } catch (error) {
    console.error('生成小红书文案出错:', error);
    return NextResponse.json(
      { error: '小红书文案服务出错，请稍后重试' },
      { status: 500 }
    );
  }
}

function buildPrompt(topic: string): string {
  return `请根据用户的主题，生成一篇小红书爆款文案。

【用户主题】
${topic}

【任务】
1. 生成 3-5 个小红书爆款标题（让用户能挑选）
2. 生成 1 篇完整的小红书帖子正文
3. 推荐 5-8 个相关话题标签

【小红书爆款文案要求】

**标题特点**：
- 12-20 字最佳，不超过 25 字
- 大量使用 emoji（✨💕🔥📌⭐️💯）
- 用数字、悬念、对比、痛点
- 引发好奇或共鸣
- 例：「姐妹们！这个减脂早餐真的绝了🔥」
- 例：「求求你们试试！3 步搞定氛围感妆容💄」
- 例：「别再花冤枉钱了！这 5 个平价好物我能吹一辈子✨」

**正文结构**：
- 开头抓眼球（"姐妹们！"、"家人们！"、"绝了！"、"亲测有效！"）
- 段落用 emoji 分隔，每段 2-3 行
- 中间给出干货/步骤/对比
- 加个人体验、感受、效果
- 结尾互动引导（"评论区告诉我"、"点赞收藏不迷路"、"关注我看更多"）
- 适当使用 # 标签在末尾

**正文风格**：
- 像朋友聊天，口语化
- 多用感叹号、省略号
- 真诚、有梗、不端着
- 鼓励读者行动

【输出格式 — 严格的 JSON 对象】
{
  "titles": [
    "标题 1（带 emoji）",
    "标题 2（带 emoji）",
    "标题 3（带 emoji）",
    "标题 4（可选）",
    "标题 5（可选）"
  ],
  "content": "完整的小红书帖子正文（含 emoji、分段、标签），用户可以直接复制粘贴发布",
  "tags": ["标签 1", "标签 2", "标签 3", "标签 4", "标签 5"]
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
      temperature: 0.95,    // 文案要创意
      max_tokens: 2500,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`DeepSeek API 错误: ${JSON.stringify(data)}`);
  }

  return data.choices[0].message.content;
}