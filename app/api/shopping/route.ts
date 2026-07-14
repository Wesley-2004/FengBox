import { NextResponse } from 'next/server';
import { checkAndRecordUsage } from '@/lib/usage';
import { callDeepSeek, parseJsonResponse } from '@/lib/ai/deepseek';

export const maxDuration = 60;

// ---------- 类型 ----------
interface ShoppingRequest {
  product: string;        // 用户想买什么
  scenario?: string;      // 使用场景（学生 / 家用 / 办公 / 游戏 / 专业 / 其他）
  budget?: number | null; // 预算上限（元），null = 不限
}

// ---------- 入口 ----------
export async function POST(request: Request) {
  const usage = await checkAndRecordUsage('shopping');
  if (!usage.allowed) {
    return NextResponse.json({ error: usage.reason }, { status: 403 });
  }

  try {
    const body = await request.json();
    const {
      product,
      scenario,
      budget,
    } = body as ShoppingRequest;

    // 校验
    if (!product || product.trim().length === 0) {
      return NextResponse.json({ error: '请描述你想买什么' }, { status: 400 });
    }
    if (product.trim().length > 200) {
      return NextResponse.json({ error: '描述太长了（最多 200 字）' }, { status: 400 });
    }
    if (budget !== undefined && budget !== null && (typeof budget !== 'number' || budget < 0)) {
      return NextResponse.json({ error: '预算必须是正数' }, { status: 400 });
    }

    // 读取白名单状态
    const isWhitelist = usage.isWhitelist === true;

    const fullPrompt = buildPrompt({
      product: product.trim(),
      scenario: scenario || '',
      budget: budget ?? null,
      includeModels: isWhitelist,
    });

    const aiText = await callDeepSeek(
      [
        {
          role: 'system',
          content:
            '你是一名极度理性的资深购物顾问，对中国市场在售商品非常熟悉，擅长用「参数表 + 价位段 + 优缺点 + 具体型号」帮普通用户避坑。' +
            '你给出的每个数字、每个型号都必须真实存在；遇到拿不准的型号，宁可不给也不要编。' +
            '请严格按照用户要求的 JSON 格式输出，不要输出 JSON 之外的任何文字。',
        },
        { role: 'user', content: fullPrompt },
      ],
      { temperature: 0.7, maxTokens: 5000 },
    );

    const parsed = parseJsonResponse(aiText);
    const raw = extractObject(parsed, aiText);
    if (!raw) {
      console.error('商品导购 AI 响应解析失败:', aiText.slice(0, 200));
      return NextResponse.json(
        { error: 'AI 这次没生成出攻略，请重试' },
        { status: 500 }
      );
    }

    // 攻略
    const guide = typeof raw.guide === 'string' ? raw.guide.trim() : '';
    if (guide.length === 0) {
      return NextResponse.json({ error: '没有生成出攻略，请换个描述试试' }, { status: 500 });
    }

    // 参数详解
    const parameters = Array.isArray(raw.parameters)
      ? raw.parameters
          .filter((p: any) => p && (p.name || p.what))
          .slice(0, 8)
          .map((p: any) => ({
            name: String(p.name || p.what || '').trim(),
            importance: String(p.importance || '').trim(),
            tip: String(p.tip || p.how || '').trim(),
          }))
          .filter((p: any) => p.name)
      : [];

    // 价位区间
    const priceRange = raw.priceRange && typeof raw.priceRange.low === 'number'
      ? {
          low: Math.max(0, Math.round(raw.priceRange.low)),
          high: Math.max(raw.priceRange.low, Math.round(raw.priceRange.high || raw.priceRange.low)),
          note: String(raw.priceRange.note || '参考价位基于历史经验').trim(),
        }
      : { low: 0, high: 0, note: '参考价位基于历史经验' };

    // 避坑提示（区分"参数"和"其他坑"）
    const tips = Array.isArray(raw.tips)
      ? raw.tips.filter((t: any) => typeof t === 'string' && t.trim().length > 0)
          .map((t: string) => t.trim())
          .slice(0, 6)
      : [];

    // 品牌推荐（保留旧字段，全部用户都能看，给"指导选购")
    const brands = Array.isArray(raw.brands)
      ? raw.brands.filter((b: any) => b && b.name).slice(0, 5).map((b: any) => ({
          name: String(b.name).trim(),
          reason: String(b.reason || '').trim(),
          level: String(b.level || '推荐').trim(),
        }))
      : [];

    // 构造响应：型号推荐仅白名单返回
    const response: any = {
      success: true,
      product: product.trim(),
      scenario: scenario || null,
      budget: budget ?? null,
      isWhitelist,
      guide,
      parameters,
      priceRange,
      brands,
      tips,
    };

    // 仅白名单返回型号推荐（防前端绕过）
    if (isWhitelist && Array.isArray(raw.models)) {
      const models = raw.models
        .filter((m: any) => m && m.name)
        .slice(0, 5)
        .map((m: any) => ({
          name: String(m.name).trim(),
          price: String(m.price || '').trim(),
          pros: Array.isArray(m.pros) ? m.pros.filter((s: any) => typeof s === 'string').map((s: string) => s.trim()).slice(0, 4) : [],
          cons: Array.isArray(m.cons) ? m.cons.filter((s: any) => typeof s === 'string').map((s: string) => s.trim()).slice(0, 4) : [],
          bestFor: String(m.bestFor || '').trim(),
        }))
        .filter((m: any) => m.name);
      if (models.length > 0) {
        response.models = models;
      }
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('商品导购出错:', error);
    return NextResponse.json(
      { error: '商品导购服务出错，请稍后重试' },
      { status: 500 }
    );
  }
}

// ---------- Prompt 构建 ----------
function buildPrompt(params: {
  product: string;
  scenario: string;
  budget: number | null;
  includeModels: boolean;
}): string {
  const { product, scenario, budget, includeModels } = params;

  // 场景描述
  const scenarioMap: Record<string, string> = {
    'student': '学生用户（预算敏感、轻度使用、关注便携和续航）',
    'home': '家庭日常使用（多人共用、稳定性、易上手）',
    'office': '办公商务（稳定性、续航、文档处理效率）',
    'gaming': '游戏玩家（性能优先、散热、屏幕刷新率）',
    'pro': '专业创作/设计（性能要求高、色彩/精度/扩展性）',
  };
  const scenarioDesc = scenario ? (scenarioMap[scenario] || scenario) : '未指定';

  return `请为【想买：${product}】的用户提供一份购物指南。

【用户情况】
- 用途 / 场景：${scenarioDesc}
- 预算上限：${budget ? `¥${budget}` : '不限（请根据常识给常见区间）'}

【你的任务 — 严格只输出 JSON】

**第一部分：购买攻略**
- \`guide\`: 200-350 字，告诉用户选购这类商品该从哪几个维度对比、常见认知误区、如何判断性价比。**不要笼统**，要给出"考虑 X、Y、Z 三个维度"这种明确指引。

**第二部分：参数详解（重点，要详细）**
- \`parameters\`: 数组（5-8 项），每项包含：
  - \`name\`: 参数名（如"处理器"、"内存"、"色域覆盖率"等具体名词，**不要写"性能"这种泛泛的**）
  - \`importance\`: 重要性（"核心 / 重要 / 次要"三档）
  - \`tip\`: 给普通用户的选购建议（如"看 Intel i5 起步"、"避开 4GB 内存款"、"色域 100% sRGB 是底线"等**具体可执行的建议**）

**第三部分：价位区间**
- \`priceRange\`: { low, high, note }
  - low 和 high 必须是数字（元）
  - 给常见价位区间（如"主流中端 3000-5000"）
  - note 一句话说明这个价位段的特点

**第四部分：品牌推荐（普适，每人都看）**
- \`brands\`: 3-5 个品牌 / 系列名（不是具体型号，是品牌或产品线）
- 每个含 name / reason / level（入门/主流/高端/旗舰）

**第五部分：避坑提示**
- \`tips\`: 4-6 条实用避坑
- 区分"参数坑"（避坑型号）和"使用坑"（避免被忽悠、宣传词汇迷惑）
- 必须具体：不要写"小心假货"这种空话，写"避开型号 X 系列的早期批次（已知 Y 问题）"

${includeModels ? `**第六部分：【仅会员/白名单可见】具体型号推荐**
- \`models\`: 3-5 款**真实存在的具体型号**（如"联想小新 Pro 14 2024 锐龙 R7 版"）
- 每款含：
  - \`name\`: 完整型号名
  - \`price\`: 当前参考价位（如"约 ¥5499"或"¥4500-5500"）
  - \`pros\`: 数组 2-4 个具体优点（不要写"性能强"，写"12 代 i5 + 16G 内存，剪视频不卡"）
  - \`cons\`: 数组 1-3 个具体缺点（重要！诚实点出哪方面不足，不要光夸）
  - \`bestFor\`: 一句话说明"这款最适合谁"（如"适合预算 5000 以内的设计学生"）
- **诚实原则**：不知道具体型号时宁可不写。如果不确定型号，干脆返回 2-3 个你最确定的，其他空着` : '**【非会员用户】第六部分不需要输出**。请只输出 5 个字段：guide、parameters、priceRange、brands、tips。'}

【输出格式 — 严格 JSON】
{
  "guide": "...",
  "parameters": [
    { "name": "处理器", "importance": "核心", "tip": "看 Intel i5 起步或同等性能" }
  ],
  "priceRange": { "low": 3000, "high": 6000, "note": "主流中端笔记本价位段" },
  "brands": [
    { "name": "联想", "reason": "产品线丰富，性价比款多", "level": "主流" }
  ],
  "tips": [
    "避开型号 X 的早期批次...",
    "..."
  ]
  ${includeModels ? ', "models": [ { "name": "...", "price": "...", "pros": ["..."], "cons": ["..."], "bestFor": "..." } ]' : ''}
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
