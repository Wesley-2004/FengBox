import { NextResponse } from 'next/server';
import { checkAndRecordUsage } from '@/lib/usage';
import { callDeepSeek, parseJsonResponse } from '@/lib/ai/deepseek';

export const maxDuration = 60;

// ---------- 类型 ----------
interface Ingredient {
  name: string;
  amount: string;        // "200g" / "2 个" / "15ml" / "适量"
  note?: string;         // "可选 / 可替换..."
  category?: 'main' | 'seasoning';   // 主料 / 调料，给前端分两栏
}

interface Step {
  text: string;
  duration?: string;     // "中火 2 分钟"
  tip?: string;          // "看到表面金黄即可"
}

interface Dish {
  id: string;
  name: string;
  mainIngredient: string;
  otherIngredients: string[];  // 保留旧字段以便向后兼容（前端不再用）
  cookTime: string;
  difficulty: string;
  tags: string[];
  steps: string[];             // 旧字段（前端显示第一行 fallback）
  // 新增字段（前端主要用）
  servings?: string;           // "2 人份"
  kcalPerServing?: number;     // 380
  ingredients?: Ingredient[];  // 含克数
  stepsRich?: Step[];          // 含时长/要点
}

interface RecipeRequest {
  ingredients: string;
  servings?: number;           // 默认 2
}

// ---------- 入口 ----------
export async function POST(request: Request) {
  // 1. 试用 / 白名单 gate
  const usage = await checkAndRecordUsage('recipe');
  if (!usage.allowed) {
    return NextResponse.json({ error: usage.reason }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { ingredients, servings } = body as RecipeRequest;

    // 2. 校验
    if (!ingredients || ingredients.trim().length < 1) {
      return NextResponse.json(
        { error: '请输入至少一个食材' },
        { status: 400 }
      );
    }
    const servingsN = clampServings(servings);

    // 3. 调 AI
    const aiText = await callDeepSeek(
      [
        {
          role: 'system',
          content:
            '你是一个经验丰富的家常菜厨师，营养学知识扎实。' +
            '请根据用户的食材和份数生成 JSON 数组，不要任何解释、不要 markdown 代码块、不要多余文字。' +
            '所有克数 / 卡路里必须是合理估算，必要时注明"约"。',
        },
        { role: 'user', content: buildPrompt(ingredients.trim(), servingsN) },
      ],
      { temperature: 0.7, maxTokens: 6000 },
    );

    // 4. 解析 JSON（三层兜底；旧版只 regex 抠数组，单点脆弱）
    const parsed = parseJsonResponse(aiText);
    const rawArray = extractArray(parsed, aiText);
    if (!rawArray || rawArray.length === 0) {
      console.error('AI 响应中无法解析 JSON 数组:', aiText.slice(0, 200));
      return NextResponse.json(
        { error: 'AI 这次没生成出菜谱，请重试一次' },
        { status: 500 }
      );
    }

    // 5. 规范化 + 校验
    const validDishes: Dish[] = rawArray
      .filter((d: any) => d && d.name)
      .slice(0, 10)
      .map((d: any, idx: number) => normalizeDish(d, idx, ingredients.trim(), servingsN));

    if (validDishes.length === 0) {
      return NextResponse.json(
        { error: '没有生成出有效的菜谱，请换个食材试试' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      ingredients: ingredients.trim(),
      servings: servingsN,
      dishes: validDishes,
    });
  } catch (error) {
    console.error('生成菜谱出错:', error);
    return NextResponse.json(
      { error: '菜谱服务出错，请稍后重试' },
      { status: 500 }
    );
  }
}

// ---------- helpers ----------
function clampServings(n: number | undefined): 1 | 2 | 3 | 4 {
  if (n === 1 || n === 2 || n === 3 || n === 4) return n;
  return 2;
}

function buildPrompt(ingredients: string, servings: number): string {
  return `请基于以下食材和份数，生成 8-10 道家常菜的菜谱。要求"用户看完就能下厨"——所有时间/火候/克数/卡路里必须具体，不要写"适量"这种空话。

【用户食材】
${ingredients}

【份数】
${servings} 人份（所有克数按这个份数写）

【输出 — 严格 JSON 数组，不要任何解释、不要 markdown】
[
  {
    "id": "dish-id-pinyin-or-english",
    "name": "菜名（真实存在的家常菜，不要瞎编）",
    "mainIngredient": "用户输入的主料",
    "cookTime": "总制作时长，如 '30 分钟'",
    "difficulty": "简单 / 中等 / 困难",
    "tags": ["下饭", "快手", "清淡", ...1-3 个],
    "servings": "${servings} 人份",
    "kcalPerServing": 380,   // 每份估算卡路里，整数
    "ingredients": [
      { "name": "猪里脊", "amount": "${servings === 1 ? '100g' : servings === 2 ? '200g' : servings === 3 ? '300g' : '400g'}", "category": "main", "note": "可选换成鸡胸肉" },
      { "name": "大葱", "amount": "1 根", "category": "main" },
      { "name": "生抽", "amount": "15ml", "category": "seasoning" },
      { "name": "盐", "amount": "2g（约小半勺）", "category": "seasoning", "note": "可按口味增减" }
    ],
    "steps": [
      {
        "text": "猪里脊切片，厚度约 0.5 cm，逆纹理切口感更嫩",
        "duration": "5 分钟",
        "tip": "冷冻 15 分钟后再切更易切薄"
      },
      {
        "text": "热锅冷油，油温六成热时下肉片",
        "duration": "中火 3 分钟",
        "tip": "筷子插进油里周围冒小泡就表示六成热"
      }
    ]
  }
]

【硬性要求 — 不达标会被拒】
1. 数量：返回 8-10 道菜，不能少
2. 真实性：菜必须是真实存在的家常菜（如 西红柿炒蛋 / 麻婆豆腐 / 蒜蓉西兰花），不能瞎编
3. 克数：每道菜的 ingredients 至少 4 项，每项 amount 必须含数字和单位（g/ml/个/勺/瓣/根/勺），禁止 "适量"
4. 步骤：每道菜 steps 至少 4 步；每步必须有 duration（含火候/时间）字段；至少 50% 步骤有 tip
5. 卡路里：kcalPerServing 是合理的每份估算（炒菜 200-500，红烧 400-700），必须是整数
6. 食材分配：约 1/3 是主料（category=main），其余调料（category=seasoning）
7. 难度判断要真实：拍黄瓜=简单、红烧肉=中等、佛跳墙=困难
8. 严格 JSON：可被 JSON.parse 直接解析，不准加注释、不准有尾部逗号、不准加 markdown 标记`;
}

function extractArray(parsed: any, raw: string): any[] | null {
  if (Array.isArray(parsed)) return parsed;
  if (parsed && Array.isArray(parsed.dishes)) return parsed.dishes;
  if (parsed && Array.isArray(parsed.recipes)) return parsed.recipes;
  // 兜底：手抠第一个顶层数组（AI 偶尔仍会漏）
  const m = raw.match(/\[[\s\S]*\]/);
  if (m) {
    try { return JSON.parse(m[0]); } catch { return null; }
  }
  return null;
}

function normalizeDish(d: any, idx: number, userIngredients: string, servings: number): Dish {
  // 食材：用 AI 给的 ingredients[]，缺则从 otherIngredients 兜底
  const rawIngredients = Array.isArray(d.ingredients) ? d.ingredients : [];
  const ingredients: Ingredient[] = rawIngredients
    .filter((it: any) => it && it.name)
    .map((it: any) => ({
      name: String(it.name).trim(),
      amount: String(it.amount || '适量').trim() || '适量',
      note: it.note ? String(it.note).trim() : undefined,
      category: it.category === 'seasoning' ? 'seasoning' : 'main',
    }));

  // 步骤：优先用 stepsRich / steps 对象；旧版 steps[] string 兜底
  const rawSteps = Array.isArray(d.stepsRich) ? d.stepsRich
    : Array.isArray(d.steps) ? d.steps : [];
  const stepsRich: Step[] = rawSteps
    .filter((s: any) => s && (s.text || typeof s === 'string'))
    .map((s: any) => typeof s === 'string'
      ? { text: String(s).trim() }
      : {
          text: String(s.text || '').trim(),
          duration: s.duration ? String(s.duration).trim() : undefined,
          tip: s.tip ? String(s.tip).trim() : undefined,
        }
    )
    .filter((s: Step) => s.text);

  // 旧 steps 兼容（flat string[]），如果没拿到富步骤就退回这个
  const flatSteps = stepsRich.map((s) => s.text);

  // 兜底：如果 ingredients 为空（旧 prompt 也可能给），用 otherIngredients 拼
  if (ingredients.length === 0 && Array.isArray(d.otherIngredients)) {
    d.otherIngredients.forEach((it: any) => {
      ingredients.push({ name: String(it).trim(), amount: '适量', category: 'main' });
    });
  }

  return {
    id: d.id || `dish-${idx}-${Date.now()}`,
    name: String(d.name).trim(),
    mainIngredient: String(d.mainIngredient || userIngredients).trim(),
    otherIngredients: ingredients.filter((it) => it.category !== 'seasoning').map((it) => it.name),
    cookTime: String(d.cookTime || '未知').trim(),
    difficulty: String(d.difficulty || '中等').trim(),
    tags: Array.isArray(d.tags) ? d.tags.map((s: any) => String(s).trim()).filter(Boolean) : [],
    steps: flatSteps,
    servings: d.servings ? String(d.servings).trim() : `${servings} 人份`,
    kcalPerServing: typeof d.kcalPerServing === 'number' && d.kcalPerServing > 0
      ? Math.round(d.kcalPerServing)
      : undefined,
    ingredients: ingredients.length > 0 ? ingredients : undefined,
    stepsRich: stepsRich.length > 0 ? stepsRich : undefined,
  };
}
