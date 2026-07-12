import { NextResponse } from 'next/server';

export const maxDuration = 60;

interface ShoppingRequest {
  product: string;  // 用户想买什么
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { product } = body as ShoppingRequest;

    // 验证
    if (!product || product.trim().length === 0) {
      return NextResponse.json(
        { error: '请描述你想买什么' },
        { status: 400 }
      );
    }

    if (product.trim().length > 200) {
      return NextResponse.json(
        { error: '描述太长了（最多 200 字）' },
        { status: 400 }
      );
    }

    const fullPrompt = buildPrompt(product.trim());

    const aiResponse = await callDeepSeek([
      {
        role: 'system',
        content: '你是一个资深购物顾问，擅长根据用户需求给出购买攻略、品牌推荐、避坑指南。请严格按照用户要求的 JSON 格式输出。',
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
        { error: 'AI 这次没生成出攻略，请重试' },
        { status: 500 }
      );
    }

    let parsed: {
      guide: string;
      priceRange: { low: number; high: number; note: string };
      brands: Array<{ name: string; reason: string; level: string }>;
      tips: string[];
    };
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch (e) {
      console.error('JSON 解析失败:', jsonMatch[0].slice(0, 200));
      return NextResponse.json(
        { error: '攻略解析失败，请重试' },
        { status: 500 }
      );
    }

    // 验证 + 规范化
    const guide = typeof parsed.guide === 'string' ? parsed.guide.trim() : '';
    if (guide.length === 0) {
      return NextResponse.json(
        { error: '没有生成出攻略，请换个描述试试' },
        { status: 500 }
      );
    }

    const priceRange = parsed.priceRange && typeof parsed.priceRange.low === 'number'
      ? {
          low: Math.max(0, Math.round(parsed.priceRange.low)),
          high: Math.max(parsed.priceRange.low, Math.round(parsed.priceRange.high || parsed.priceRange.low)),
          note: String(parsed.priceRange.note || '参考价位基于历史数据').trim(),
        }
      : { low: 0, high: 0, note: '参考价位基于历史数据' };

    const brands = Array.isArray(parsed.brands)
      ? parsed.brands
          .filter((b) => b && b.name)
          .slice(0, 5)
          .map((b) => ({
            name: String(b.name).trim(),
            reason: String(b.reason || '').trim(),
            level: String(b.level || '推荐').trim(),
          }))
      : [];

    const tips = Array.isArray(parsed.tips)
      ? parsed.tips.filter((t) => typeof t === 'string' && t.trim().length > 0).map((t) => t.trim()).slice(0, 6)
      : [];

    return NextResponse.json({
      success: true,
      product: product.trim(),
      guide,
      priceRange,
      brands,
      tips,
    });
  } catch (error) {
    console.error('商品导购出错:', error);
    return NextResponse.json(
      { error: '商品导购服务出错，请稍后重试' },
      { status: 500 }
    );
  }
}

function buildPrompt(product: string): string {
  return `根据用户想买的东西，给出购物攻略 + 品牌推荐。

【用户想买】
${product}

【任务】
根据用户描述（商品类别、品牌偏好、预算等），给出：

1. **购买攻略（guide）**：选购这类商品要看哪些关键参数？有什么常见坑要避开？200-400 字，要专业但通俗。

2. **参考价位（priceRange）**：基于历史经验，给出这类商品的常见价位区间（数字，单位：元）。注意：
   - low 和 high 必须是数字（元）
   - 如果用户没说明预算，给一个常见区间
   - note 简要说明这个价位的含义（如"入门款价位"或"主流中高端"）

3. **品牌推荐（brands）**：根据需求推荐 3-5 个品牌 / 系列，每个包含：
   - name：品牌名或具体系列名
   - reason：为什么推荐它（一句话）
   - level：定位（入门 / 主流 / 高端 / 旗舰）

4. **避坑提示（tips）**：3-6 条购买这种商品的实用建议（验机、促销时机、配件、售后等）。

【输出格式 — 严格的 JSON 对象】
{
  "guide": "购买攻略全文...",
  "priceRange": {
    "low": 1000,
    "high": 3000,
    "note": "主流中端价位"
  },
  "brands": [
    { "name": "小米 14", "reason": "性价比高，系统流畅", "level": "主流" },
    { "name": "iPhone 15", "reason": "保值耐用，生态好", "level": "高端" }
  ],
  "tips": [
    "618 / 双 11 价格最优",
    "记得验机后再签收",
    "官方渠道购买更放心"
  ]
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