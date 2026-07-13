import { NextResponse } from 'next/server';
import { checkAndRecordUsage } from '@/lib/usage';

export const maxDuration = 60; // 给 DeepSeek 足够时间生成方案

interface FitnessRequest {
  height: number;          // 身高 cm
  weight: number;          // 体重 kg
  age?: number;            // 年龄（18-80）
  gender?: string;         // 男 / 女 / 其他
  broadGoal: string;       // 宽泛目的：减脂 / 增肌 / 塑形 / 提高体能 / 保持健康
  specificGoal?: string;   // 具体目标：自由文本
  experience?: string;     // 零基础 / 偶尔运动 / 经常运动
  equipment?: string;      // 器械 / 场地（自由文本，默认 "无"）
  sessionMinutes?: number; // 单次可投入时长（30 / 45 / 60 / 90）
  outputTypes: string[];   // 'workout' / 'nutrition'
}

export async function POST(request: Request) {
  // 检查试用限制 + 白名单
  const usage = await checkAndRecordUsage('fitness');
  if (!usage.allowed) {
    return NextResponse.json({ error: usage.reason }, { status: 403 });
  }

  try {
    const body = await request.json();
    const {
      height, weight, age, gender, broadGoal, specificGoal,
      experience, equipment, sessionMinutes, outputTypes,
    } = body as FitnessRequest;

    // ---------- 校验 ----------
    if (!height || !weight || height < 100 || height > 250 || weight < 30 || weight > 250) {
      return NextResponse.json(
        { error: '请填写合理的身高(100-250cm)和体重(30-250kg)' },
        { status: 400 }
      );
    }
    if (!broadGoal) {
      return NextResponse.json(
        { error: '请选择宽泛健身目的' },
        { status: 400 }
      );
    }
    if (!outputTypes || outputTypes.length === 0) {
      return NextResponse.json(
        { error: '请至少选择一种输出类型（运动计划 / 营养搭配）' },
        { status: 400 }
      );
    }
    if (age !== undefined && age !== null && (age < 10 || age > 100)) {
      return NextResponse.json(
        { error: '请填写合理的年龄(10-100)' },
        { status: 400 }
      );
    }
    if (sessionMinutes !== undefined && sessionMinutes !== null &&
        ![30, 45, 60, 90].includes(sessionMinutes)) {
      return NextResponse.json(
        { error: '请选择有效的单次时长(30/45/60/90 分钟)' },
        { status: 400 }
      );
    }

    // ---------- 计算 BMI ----------
    const bmi = weight / Math.pow(height / 100, 2);
    const bmiCategory = getBMICategory(bmi);

    // ---------- 构建 prompt ----------
    const wantsWorkout = outputTypes.includes('workout');
    const wantsNutrition = outputTypes.includes('nutrition');

    const prompt = buildPrompt({
      height, weight, bmi, bmiCategory,
      age, gender, broadGoal,
      specificGoal: specificGoal || '',
      experience: experience || '零基础',
      equipment: (equipment || '无').trim() || '无',
      sessionMinutes: sessionMinutes || 45,
      wantsWorkout,
      wantsNutrition,
    });

    // ---------- 调用 DeepSeek ----------
    const aiText = await callDeepSeek([
      {
        role: 'system',
        content:
          '你是一个专业、温暖的 AI 健身教练与营养师。' +
          '根据用户的身体数据和目标，给出具体、可执行、数据清晰的方案。' +
          '回答用中文。' +
          (wantsWorkout
            ? '运动部分给出训练分类（不是按周排期），每张动作卡片必须包含：动作名、组数×次数或时长、建议时长、估算消耗(kcal, 仅参考)、锻炼部位、难度(1-3 颗星)、动作要点。'
            : '') +
          (wantsNutrition
            ? '营养部分给出一日三餐卡片：每餐含菜品清单、卡路里、蛋白质/碳水/脂肪克数(g)，顶部给出当日总热量与三大营养素比例。'
            : '') +
          '所有热量与营养素数据必须是合理估算值，并加 "估算" 标注以避免误导。' +
          '务必只输出合法 JSON，不要输出任何 JSON 之外的文字。',
      },
      {
        role: 'user',
        content: prompt,
      },
    ]);

    // ---------- 解析 JSON（带兜底） ----------
    const structured = parseStructured(aiText);

    return NextResponse.json({
      success: true,
      bmi: Number(bmi.toFixed(1)),
      bmiCategory,
      structured,           // 结构化结果（可能为 null → 前端退回 markdown）
      plan: aiText,         // 原始 markdown 文本（兜底用 & 复制按钮用）
      warnings: structured?.warnings ?? [],
    });
  } catch (error) {
    console.error('生成健身方案出错:', error);
    return NextResponse.json(
      { error: '生成方案服务出错，请稍后重试' },
      { status: 500 }
    );
  }
}

// ---------------- helpers ----------------

function getBMICategory(bmi: number): { label: string; color: string; advice: string } {
  if (bmi < 18.5) {
    return {
      label: '偏瘦',
      color: 'blue',
      advice: 'BMI 偏低，建议增加营养摄入并配合力量训练',
    };
  } else if (bmi < 24) {
    return {
      label: '正常',
      color: 'green',
      advice: 'BMI 健康，请继续保持规律运动和均衡饮食',
    };
  } else if (bmi < 28) {
    return {
      label: '超重',
      color: 'yellow',
      advice: 'BMI 偏高，建议增加有氧运动并控制饮食',
    };
  } else {
    return {
      label: '肥胖',
      color: 'red',
      advice: 'BMI 偏高较多，建议循序渐进，必要时咨询专业医生',
    };
  }
}

function buildPrompt(params: {
  height: number;
  weight: number;
  bmi: number;
  bmiCategory: { label: string; advice: string };
  age?: number;
  gender?: string;
  broadGoal: string;
  specificGoal: string;
  experience: string;
  equipment: string;
  sessionMinutes: number;
  wantsWorkout: boolean;
  wantsNutrition: boolean;
}): string {
  const {
    height, weight, bmi, bmiCategory,
    age, gender, broadGoal, specificGoal,
    experience, equipment, sessionMinutes,
    wantsWorkout, wantsNutrition,
  } = params;

  const schemaSpec = wantsWorkout
    ? `
【运动方案 schema】
{
  "workout": {
    "summary": "一段话总结（50-100 字）",
    "groups": [
      {
        "category": "有氧运动" | "力量训练" | "拉伸放松" | "...",
        "emoji": "🏃" | "💪" | "🧘" | "...",
        "note": "该类训练的简短说明（一句话）",
        "exercises": [
          {
            "name": "动作名",
            "sets": "4 组 × 12 次" | "30 分钟匀速" | ...,
            "durationMin": 8,
            "caloriesKcal": 60,
            "muscles": "肩膀、三头",
            "difficulty": 1 | 2 | 3,
            "tips": "动作要点（一两句）"
          }
        ]
      }
    ],
    "totalDurationMin": 45,
    "totalCaloriesKcal": 320
  },`
    : '';

  const nutritionSpec = wantsNutrition
    ? `
【营养方案 schema】
{
  "nutrition": {
    "summary": "一段话总结（一日营养策略）",
    "totalCaloriesKcal": 1800,
    "macros": { "proteinG": 110, "carbsG": 220, "fatG": 60 },
    "meals": [
      {
        "time": "早餐" | "午餐" | "晚餐" | "加餐",
        "items": ["燕麦 50g", "鸡蛋 2 个", "..."],
        "caloriesKcal": 420,
        "proteinG": 28,
        "carbsG": 45,
        "fatG": 12
      }
    ],
    "tips": ["每天饮水 ≥ 1.5L", "..."]
  },`
    : '';

  const userInfo = [
    `身高：${height} cm`,
    `体重：${weight} kg`,
    `BMI：${bmi.toFixed(1)}（${bmiCategory.label}）`,
    age ? `年龄：${age} 岁` : '',
    gender ? `性别：${gender}` : '',
    `运动经验：${experience}`,
    `器械 / 场地：${equipment}`,
    `单次可投入时长：${sessionMinutes} 分钟`,
    `宽泛目的：${broadGoal}`,
    specificGoal ? `具体目标：${specificGoal}` : '',
  ].filter(Boolean).join('\n- ');

  return `请为以下用户生成个性化健身与营养方案（以 JSON 输出）：

【用户信息】
- ${userInfo}

【输出要求】
1. 严格只输出 JSON（不要 markdown 代码块、不要多余文字、不要注释）
2. JSON 顶层结构：
{
  "disclaimer": "⚠️ 本方案仅供参考，不能替代专业医生或教练。如有健康问题请咨询专业人士。",
  "warnings": ["重要警示（数组，可空，例如 ['膝关节有问题请避免深蹲']）"],
  "bmiSummary": "一句对用户 BMI 的解读（30 字内）",
  ${wantsWorkout ? '"workout": { ... },' : ''}
  ${wantsNutrition ? '"nutrition": { ... }' : ''}
}
3. 只输出用户勾选的部分：${wantsWorkout ? '【运动】' : ''}${wantsWorkout && wantsNutrition ? ' + ' : ''}${wantsNutrition ? '【营养】' : ''}
4. 动作方案中所有"估算消耗/估算时长"必须是基于该动作的常见经验值，并在文案中加 "估算" 字样
5. 难度用 1-3 颗星：1=入门 2=进阶 3=高强度
6. 整体单次时长不要超过用户给的 ${sessionMinutes} 分钟${schemaSpec}${nutritionSpec}

现在直接输出 JSON：`;
}

/**
 * 解析 AI 返回的 JSON。AI 偶尔会包 ```json``` 包裹或加前言，
 * 先尝试直接 parse，不行再用正则抠第一个 {...} 块再 parse。
 * 仍失败则返回 null（前端会回退到 markdown 渲染）。
 */
function parseStructured(raw: string): any | null {
  const candidates: string[] = [];
  candidates.push(raw.trim());

  // 抠 ```json ... ```
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) candidates.push(fence[1].trim());

  // 抠第一个 { 到最后一个 }
  const first = raw.indexOf('{');
  const last = raw.lastIndexOf('}');
  if (first !== -1 && last !== -1 && last > first) {
    candidates.push(raw.slice(first, last + 1));
  }

  for (const c of candidates) {
    try {
      return JSON.parse(c);
    } catch {
      // 尝试去掉尾巴/开头常见的 ",}" 和 ", ]" 等截断性修复
      try {
        return JSON.parse(c.replace(/,\s*([}\]])/g, '$1'));
      } catch {
        continue;
      }
    }
  }
  return null;
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
      max_tokens: 4000,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`DeepSeek API 错误: ${JSON.stringify(data)}`);
  }

  return data.choices[0].message.content;
}
