import { NextResponse } from 'next/server';
import { checkAndRecordUsage } from '@/lib/usage';
import { callDeepSeek, parseJsonResponse } from '@/lib/ai/deepseek';

export const maxDuration = 60;

// ---------- 类型 ----------
interface XiaohongshuRequest {
  topic: string;                 // 用户主题（必填）
  style?: Style;                 // 风格（可选，默认 zhongcao）
  emojiLevel?: EmojiLevel;       // emoji 强度（可选，默认 medium）
}

type Style = 'zhongcao' | 'pingce' | 'ganhuo' | 'gushi';
type EmojiLevel = 'rich' | 'medium' | 'minimal';

// ---------- 入口 ----------
export async function POST(request: Request) {
  const usage = await checkAndRecordUsage('xiaohongshu');
  if (!usage.allowed) {
    return NextResponse.json({ error: usage.reason }, { status: 403 });
  }

  try {
    const body = await request.json();
    const {
      topic,
      style = 'zhongcao',
      emojiLevel = 'medium',
    } = body as XiaohongshuRequest;

    // 校验
    if (!topic || topic.trim().length === 0) {
      return NextResponse.json({ error: '请输入文案主题' }, { status: 400 });
    }
    if (topic.trim().length > 100) {
      return NextResponse.json({ error: '主题太长了（最多 100 字）' }, { status: 400 });
    }
    if (!['zhongcao', 'pingce', 'ganhuo', 'gushi'].includes(style)) {
      return NextResponse.json({ error: '风格参数无效' }, { status: 400 });
    }
    if (!['rich', 'medium', 'minimal'].includes(emojiLevel)) {
      return NextResponse.json({ error: 'emoji 强度参数无效' }, { status: 400 });
    }

    const fullPrompt = buildPrompt({
      topic: topic.trim(),
      style: style as Style,
      emojiLevel: emojiLevel as EmojiLevel,
    });

    const aiText = await callDeepSeek(
      [
        {
          role: 'system',
          content:
            '你是一名扎根小红书 5 年的头部博主，文案风格被新榜评为「年度最具感染力」前 10%。' +
            '你对小红书的算法、分发机制、爆款规律了如指掌——知道什么样的标题能撬动点击率（CTR），' +
            '什么样的开头能突破 3 秒跳出率，什么样的互动设计能拉爆评论数。' +
            '请严格按照用户要求的 JSON 格式输出，绝不输出任何 JSON 之外的文字。',
        },
        { role: 'user', content: fullPrompt },
      ],
      { temperature: 0.85, maxTokens: 4000 },
    );

    // 解析 JSON（三层兜底）
    const parsed = parseJsonResponse(aiText);
    const raw = extractObject(parsed, aiText);
    if (!raw) {
      console.error('小红书 AI 响应解析失败:', aiText.slice(0, 200));
      return NextResponse.json(
        { error: 'AI 这次没生成出文案，请重试' },
        { status: 500 }
      );
    }

    // 规范化
    const titles = Array.isArray(raw.titles)
      ? raw.titles
          .filter((t: any) => typeof t === 'string' && t.trim().length > 0)
          .map((t: string) => t.trim())
          .slice(0, 5)
      : [];
    if (titles.length === 0) {
      return NextResponse.json({ error: '没有生成出标题，请换个主题试试' }, { status: 500 });
    }

    const content = typeof raw.content === 'string' ? raw.content.trim() : '';
    if (content.length === 0) {
      return NextResponse.json({ error: '没有生成出正文，请重试' }, { status: 500 });
    }

    const tags = Array.isArray(raw.tags)
      ? raw.tags
          .filter((t: any) => typeof t === 'string' && t.trim().length > 0)
          .map((t: string) => t.trim().replace(/^#/, ''))
          .slice(0, 8)
      : [];

    return NextResponse.json({
      success: true,
      topic: topic.trim(),
      style,
      emojiLevel,
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

// ---------- Prompt 构建 ----------
function buildPrompt(params: { topic: string; style: Style; emojiLevel: EmojiLevel }): string {
  const { topic, style, emojiLevel } = params;

  // 风格定义（让 AI 模拟特定人格而不是泛泛"爆款"）
  const STYLE_GUIDE: Record<Style, { name: string; persona: string; skeleton: string; openers: string[] }> = {
    zhongcao: {
      name: '种草安利',
      persona: '热情、真诚的闺蜜，跟姐妹掏心窝推荐，"我自己用了一周/一个月/三个月"',
      skeleton: '钩子（个人体验反差）→ 上价值（为什么值得）→ 真实使用细节（材质/口感/使用场景）→ 自用图描述（替代）→ 利益点收尾（拉收藏）→ 互动提问',
      openers: ['姐妹们！', '家人们！', '求求你们试试！', '毫不夸张地说', '真的不是我夸张', '我宣布这是我的年度最爱'],
    },
    pingce: {
      name: '客观测评',
      persona: '理性的成分党/技术流，"我自费买了 X 款，帮你排雷"——专业、可信、有数据感',
      skeleton: '钩子（测评结论先抛）→ 测评维度（价格/材质/效果/使用感）→ 优缺点对比（用表格替代）→ 最终推荐（适合谁/不适合谁）→ 购买建议 → 互动',
      openers: ['自费测评', '绝不踩雷', '横向对比了 X 款后', '今天给大家交个作业', '用了 30 天', '成分党实测'],
    },
    ganhuo: {
      name: '干货教程',
      persona: '乐于分享的老师/学姐，"今天手把手教你们 X，从入门到精通"——有信息量、可操作',
      skeleton: '钩子（学习痛点/成果预告）→ 原理速览（1-2 句话）→ 分步骤教程（Step1-Step3）→ 常见避坑点 → 进阶小技巧 → 总结 + 互动（让读者交作业）',
      openers: ['今天手把手教', '保姆级教程！', '建议收藏', '看这一篇就够了', '从入门到精通', '学会这三个就够了'],
    },
    gushi: {
      name: '故事型',
      persona: '会讲故事的小姐姐/小哥哥，"上个月我遇到了 X，哭了/笑了/顿悟了……"——真实、有共鸣',
      skeleton: '钩子（氛围场景/反差结尾）→ 时间线（背景铺垫）→ 转折点 → 内心独白/感悟 → 升华（金句/价值感）→ 互动（你有没有过类似经历）',
      openers: ['上个月，我遇到了……', '凌晨 3 点，我突然……', '那一刻我才明白', '说实话，写这篇的时候我哭了', '你有过这种崩溃时刻吗', '那天发生了一件事'],
    },
  };

  // emoji 强度定义（精确控制密度，AI 知道每个强度的"量"）
  const EMOJI_GUIDE: Record<EmojiLevel, { count: string; rule: string }> = {
    rich: {
      count: '总 emoji 数 12-18 个',
      rule: '标题 2-3 个 + 每段开头 1 个 + 关键句中 1-2 个 + 结尾互动 1 个',
    },
    medium: {
      count: '总 emoji 数 6-10 个',
      rule: '标题 1 个 + 每段开头 1 个（可省略部分段） + 结尾互动 1 个',
    },
    minimal: {
      count: '总 emoji 数 3-5 个',
      rule: '标题 1 个 + 正文中间位置最多 2 个 + 结尾互动 1 个；正文段落开头一律不加 emoji',
    },
  };

  const s = STYLE_GUIDE[style];
  const e = EMOJI_GUIDE[emojiLevel];

  return `请为【主题：${topic}】创作一篇小红书爆款文案。

【你的人设】
${s.persona}

【本篇风格：${s.name}】
${s.skeleton}

【推荐开场白（挑一个用，别全用）】
${s.openers.map((o, i) => `${i + 1}. ${o}`).join('\n')}

【emoji 强度：${emojiLevel}】${e.count}
${e.rule}

【小红书爆款 6 大核心元素 — 你的文案必须包含】
1. **钩子标题**：12-20 字最佳，不超过 25 字。必须用数字 / 悬念 / 反差 / 痛点 中的一种或多种抓住眼球。
2. **前 3 秒抓人开头**：用上面的开场白之一作为第一句话，立刻让读者知道"这篇文章跟我有关"。
3. **清晰分段**：每段 2-3 行，**段落之间必须用空行分隔**（不是 emoji 分隔——emoji 是装饰，空行才是结构）。
4. **价值/利益点**：读者读完能记住的 1-2 个具体干货（数字/步骤/对比/亲测细节）。
5. **个人体验/感受**：第一人称，"我"做了 X，发现了 Y——这是小红的灵魂，不是产品说明书。
6. **互动钩子结尾**：给一个具体的、能引发回复的提问（"你们觉得呢""评论区告诉我你们的 X"）。

【严格禁止】
- 不能写成"产品说明书"语气
- 不能用商家话术（"限时优惠""点击购买"——除非主题明确是带货）
- 不能 emoji 堆砌成一行（这种情况在真实小红书里会被读者一秒跳过）
- 不能用"姐妹们"以外的网络黑话你听不懂（"绝绝子""yyds"等过时梗不要再用了）
- 不能虚构数据（"100% 有效""销量第一"——会被算法判虚假）
- 不能段落堆在一起——每段之间**必须空行**

【emoji 使用规范（不管哪种强度）】
- emoji 用作情绪标点（"！" "？" 的视觉化），不要纯粹装饰
- 优先用：✨💕🔥⭐️📌💯🥺😭🤔👏💪🫶——这些是小红书高频的
- 避免：🚮💸🪙💺 等不相关的；🇨🇳 等国旗/政治；过度用 🌈🍄🎪

【输出格式 — 严格 JSON】
{
  "titles": [
    "标题 1（带 1-2 个 emoji）",
    "标题 2（带 1-2 个 emoji）",
    "标题 3（带 1-2 个 emoji）",
    "标题 4（可选）",
    "标题 5（可选）"
  ],
  "content": "完整的小红书帖子正文。换行用 \\n\\n（空行分隔段落）。emoji 按上面的密度规则。结尾要有互动提问。末尾跟着 3-5 个 # 标签（不带空格，用 # 开头）。",
  "tags": ["标签1", "标签2", "标签3", "标签4", "标签5"]
}

只输出 JSON，不要 markdown 代码块标记。`;
}

// ---------- helpers ----------
function extractObject(parsed: any, raw: string): any | null {
  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
  const m = raw.match(/\{[\s\S]*\}/);
  if (m) {
    try { return JSON.parse(m[0]); } catch { return null; }
  }
  return null;
}
