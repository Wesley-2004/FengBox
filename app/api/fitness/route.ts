import { NextResponse } from 'next/server';
import { checkAndRecordUsage } from '@/lib/usage';

export const maxDuration = 60; // 给 DeepSeek 足够时间生成方案

interface FitnessRequest {
  height: number;       // 身高 cm
  weight: number;       // 体重 kg
  broadGoal: string;    // 宽泛目的：减肥/增肌/塑形/提高体能
  specificGoal: string; // 具体目标："练腹肌"、"瘦小腿"
  outputTypes: string[]; // 包含 'workout' / 'nutrition' / 两者
}

export async function POST(request: Request) {
  // 检查试用限制 + 白名单
  const usage = await checkAndRecordUsage('fitness');
  if (!usage.allowed) {
    return NextResponse.json({ error: usage.reason }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { height, weight, broadGoal, specificGoal, outputTypes } = body as FitnessRequest;

    // 验证必填字段
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

    // 计算 BMI
    const bmi = (weight / Math.pow(height / 100, 2));
    const bmiCategory = getBMICategory(bmi);

    // 构建 prompt
    const fullPrompt = buildPrompt({
      height, weight, bmi, bmiCategory,
      broadGoal, specificGoal: specificGoal || '',
      outputTypes,
    });

    const aiResponse = await callDeepSeek([
      {
        role: 'system',
        content: '你是一个专业且有同理心的 AI 健身教练。请根据用户的身体数据和目标，给出科学、具体、可执行的方案。回答要温暖友好但不过度承诺健康风险。',
      },
      {
        role: 'user',
        content: fullPrompt,
      },
    ]);

    return NextResponse.json({
      success: true,
      bmi: Number(bmi.toFixed(1)),
      bmiCategory,
      plan: aiResponse,
    });
  } catch (error) {
    console.error('生成健身方案出错:', error);
    return NextResponse.json(
      { error: '生成方案服务出错，请稍后重试' },
      { status: 500 }
    );
  }
}

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
  broadGoal: string;
  specificGoal: string;
  outputTypes: string[];
}): string {
  const { height, weight, bmi, bmiCategory, broadGoal, specificGoal, outputTypes } = params;

  const specificPart = specificGoal ? `\n- 具体目标：${specificGoal}` : '';

  const wantsWorkout = outputTypes.includes('workout');
  const wantsNutrition = outputTypes.includes('nutrition');

  const workoutSection = wantsWorkout ? `
【运动计划部分】
- 每周运动几天（建议 3-5 天）
- 每天每次多长时间（30-60 分钟）
- 具体动作：热身 → 主训练 → 拉伸
- 主训练分成有氧 + 力量或自重训练
- 每个动作写清楚：动作名 / 组数 / 每组次数 / 休息时间
- 用 emoji 分段让方案清晰易读` : '';

  const nutritionSection = wantsNutrition ? `
【营养搭配部分】
- 每日总热量建议（基于目标调整）
- 三大营养素比例：蛋白质 / 碳水 / 脂肪
- 一日三餐示例（含早餐 / 午餐 / 晚餐 / 加餐）
- 关键提醒：多喝水、避免极端节食
- 食材建议：列具体食物名（鸡胸肉、燕麦、糙米等）` : '';

  return `请为以下用户生成个性化的健身方案：

【用户信息】
- 身高：${height} cm
- 体重：${weight} kg
- BMI：${bmi.toFixed(1)}（${bmiCategory.label}）
- 宽泛健身目的：${broadGoal}${specificPart}

【输出要求】
- 用中文回答，温暖友好但专业
- 不要给出极端或不安全的建议（比如节食、过量运动）
- 强调循序渐进
- 用清晰的 emoji 分段和加粗标记${workoutSection}${nutritionSection}

【免责声明】
请在方案开头加一句简短提醒：'⚠️ 本方案仅供参考，不能替代专业医生或教练的建议。如有健康问题请咨询专业人士。'

请直接输出方案，不要其他解释。`;
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
      temperature: 0.8,    // 比简历优化稍高，方案要有创意
      max_tokens: 3000,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`DeepSeek API 错误: ${JSON.stringify(data)}`);
  }

  return data.choices[0].message.content;
}
