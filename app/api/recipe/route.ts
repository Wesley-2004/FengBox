import { NextResponse } from 'next/server';
import { checkAndRecordUsage } from '@/lib/usage';

export const maxDuration = 60;

interface Dish {
  id: string;
  name: string;
  mainIngredient: string;
  otherIngredients: string[];
  cookTime: string;
  difficulty: string;
  tags: string[];
  steps: string[];
}

interface RecipeRequest {
  ingredients: string;
}

export async function POST(request: Request) {
  // 检查试用限制 + 白名单
  const usage = await checkAndRecordUsage('recipe');
  if (!usage.allowed) {
    return NextResponse.json({ error: usage.reason }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { ingredients } = body as RecipeRequest;

    if (!ingredients || ingredients.trim().length < 1) {
      return NextResponse.json(
        { error: '请输入至少一个食材' },
        { status: 400 }
      );
    }

    const fullPrompt = buildPrompt(ingredients.trim());

    const aiResponse = await callDeepSeek([
      {
        role: 'system',
        content: '你是一个经验丰富的家常菜厨师。请严格按照用户要求的 JSON 格式输出，不要任何解释或 markdown 标记。',
      },
      {
        role: 'user',
        content: fullPrompt,
      },
    ]);

    // 提取 JSON — 处理 AI 偶尔在 JSON 前后加废话的情况
    const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error('AI 响应中没有 JSON 数组:', aiResponse.slice(0, 200));
      return NextResponse.json(
        { error: 'AI 这次没生成出菜谱，请重试一次' },
        { status: 500 }
      );
    }

    let dishes: Dish[];
    try {
      dishes = JSON.parse(jsonMatch[0]);
    } catch (e) {
      console.error('JSON 解析失败:', jsonMatch[0].slice(0, 200));
      return NextResponse.json(
        { error: '菜谱数据解析失败，请重试' },
        { status: 500 }
      );
    }

    // 验证 + 规范化
    const validDishes = dishes
      .filter((d) => d && d.name)
      .slice(0, 8) // 最多 8 道菜
      .map((d, idx) => ({
        id: d.id || `dish-${idx}-${Date.now()}`,
        name: String(d.name).trim(),
        mainIngredient: String(d.mainIngredient || ingredients).trim(),
        otherIngredients: Array.isArray(d.otherIngredients)
          ? d.otherIngredients.map((s: any) => String(s).trim())
          : [],
        cookTime: String(d.cookTime || '未知').trim(),
        difficulty: String(d.difficulty || '中等').trim(),
        tags: Array.isArray(d.tags) ? d.tags.map((s: any) => String(s).trim()) : [],
        steps: Array.isArray(d.steps)
          ? d.steps.map((s: any) => String(s).trim()).filter(Boolean)
          : [],
      }));

    if (validDishes.length === 0) {
      return NextResponse.json(
        { error: '没有生成出有效的菜谱，请换个食材试试' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      ingredients: ingredients.trim(),
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

function buildPrompt(ingredients: string): string {
  return `请基于用户提供的食材，生成 6-8 道家常菜的菜谱卡片数据。

【用户食材】
${ingredients}

【输出格式 — 严格的 JSON 数组】
[
  {
    "id": "菜的唯一标识，用菜名拼音或英文",
    "name": "菜的名称",
    "mainIngredient": "用户提供的主要食材（用用户输入的）",
    "otherIngredients": ["所需的其他食材1", "食材2", "..."],
    "cookTime": "制作时长，如 '30 分钟' 或 '1 小时'",
    "difficulty": "难度：简单 / 中等 / 困难",
    "tags": ["菜的特点标签，如 '下饭'、'快手'、'宴客'"],
    "steps": [
      "步骤1：具体做法",
      "步骤2：具体做法",
      "步骤3：具体做法"
    ]
  }
]

【要求】
1. 返回 6-8 道菜（不能少于 6 道）
2. 每道菜的 steps 至少 4 步
3. 菜名要真实存在的家常菜（不能瞎编）
4. otherIngredients 必须是家常菜里实际需要的
5. 难度要真实：炒青菜=简单，红烧肉=中等，佛跳墙=困难
6. 直接返回 JSON 数组，不要任何解释、markdown 代码块、说明文字`;
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
      temperature: 0.8,
      max_tokens: 4000, // 菜谱需要更多 token
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`DeepSeek API 错误: ${JSON.stringify(data)}`);
  }

  return data.choices[0].message.content;
}
