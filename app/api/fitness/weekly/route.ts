import { NextResponse } from 'next/server';
import { checkAndRecordUsage } from '@/lib/usage';
import { callDeepSeek, parseJsonResponse } from '@/lib/ai/deepseek';

export const maxDuration = 120; // 7 天内容，token 更大，给 DeepSeek 更宽裕的时间

interface WeeklyFitnessRequest {
  height: number;
  weight: number;
  age?: number;
  gender?: string;
  broadGoal: string;
  specificGoal?: string;
  experience?: string;
  equipment?: string;
  sessionMinutes?: number;
}

export async function POST(request: Request) {
  // 1. 白名单 / 试用 gate——白名单用户不计 daily limit
  const usage = await checkAndRecordUsage('fitness_weekly');
  if (!usage.allowed) {
    return NextResponse.json({ error: usage.reason }, { status: 403 });
  }

  try {
    const body = await request.json();
    const {
      height, weight, age, gender, broadGoal, specificGoal,
      experience, equipment, sessionMinutes,
    } = body as WeeklyFitnessRequest;

    // ---------- 校验 ----------
    if (!height || !weight || height < 100 || height > 250 || weight < 30 || weight > 250) {
      return NextResponse.json(
        { error: '请填写合理的身高(100-250cm)和体重(30-250kg)' },
        { status: 400 }
      );
    }
    if (!broadGoal) {
      return NextResponse.json({ error: '请选择宽泛健身目的' }, { status: 400 });
    }
    if (age !== undefined && age !== null && (age < 10 || age > 100)) {
      return NextResponse.json({ error: '请填写合理年龄(10-100)' }, { status: 400 });
    }
    if (sessionMinutes !== undefined && sessionMinutes !== null &&
        ![30, 45, 60, 90].includes(sessionMinutes)) {
      return NextResponse.json(
        { error: '请选择有效的单次时长(30/45/60/90 分钟)' },
        { status: 400 }
      );
    }

    const wantsSessionMin = sessionMinutes || 45;
    const wantsExperience = experience || '零基础';
    const wantsEquipment = (equipment || '无').trim() || '无';

    // ---------- prompt ----------
    const prompt = buildWeeklyPrompt({
      height, weight, age, gender, broadGoal, specificGoal,
      experience: wantsExperience, equipment: wantsEquipment,
      sessionMinutes: wantsSessionMin,
    });

    // ---------- call ----------
    const aiText = await callDeepSeek(
      [
        {
          role: 'system',
          content:
            '你是一个专业、温暖、严谨的 AI 健身教练与营养师。' +
            '根据用户身体数据和目标，输出"周一到周日"的训练日历与一日三餐。' +
            '回答用中文。每一天的训练必须分组（热身 + 主训练 + 拉伸），三餐必须给出具体食物名和卡路里、P/C/F 克数。' +
            '所有热量与营养素数据为估算，加"估算"字样。' +
            '务必只输出合法 JSON，不要输出任何 JSON 之外的文字。',
        },
        { role: 'user', content: prompt },
      ],
      { temperature: 0.7, maxTokens: 6000 },
    );

    const structured = parseJsonResponse(aiText);

    return NextResponse.json({
      success: true,
      structured,
      plan: aiText, // 兜底用，前端解析失败时渲染这个
    });
  } catch (error) {
    console.error('生成周历方案出错:', error);
    return NextResponse.json(
      { error: '生成周历方案服务出错，请稍后重试' },
      { status: 500 }
    );
  }
}

function buildWeeklyPrompt(params: {
  height: number; weight: number; age?: number; gender?: string;
  broadGoal: string; specificGoal?: string;
  experience: string; equipment: string; sessionMinutes: number;
}): string {
  const { height, weight, age, gender, broadGoal, specificGoal, experience, equipment, sessionMinutes } = params;

  const userInfo = [
    `身高：${height} cm`,
    `体重：${weight} kg`,
    age ? `年龄：${age} 岁` : '',
    gender ? `性别：${gender}` : '',
    `运动经验：${experience}`,
    `器械 / 场地：${equipment}`,
    `单次可投入：${sessionMinutes} 分钟`,
    `宽泛目的：${broadGoal}`,
    specificGoal ? `具体目标：${specificGoal}` : '',
  ].filter(Boolean).join('\n- ');

  return `请为以下用户生成"周一到周日"共 7 天的训练与饮食日历（严格只输出 JSON）：

【用户信息】
- ${userInfo}

【输出 schema（顶层）】
{
  "disclaimer": "⚠️ 本方案仅供参考，不能替代专业医生或教练。如有健康问题请咨询专业人士。",
  "overview": "一段话总结整周策略（60-120 字）",
  "week": [
    {
      "day": "周一",
      "theme": "胸部 · 有氧",
      "workout": {
        "warmup": "热身（5 分钟）内容",
        "main": [
          {
            "name": "哑铃卧推",
            "sets": "4 组 × 12 次",
            "durationMin": 15,
            "caloriesKcal": 80,
            "muscles": "胸、三头",
            "tips": "下放至胸部平行，肘部夹角约 45°"
          }
        ],
        "cooldown": "拉伸（5 分钟）内容"
      },
      "meals": [
        { "time": "早餐", "items": ["燕麦 50g", "鸡蛋 2 个", "蓝莓 100g"], "caloriesKcal": 420, "proteinG": 28, "carbsG": 45, "fatG": 12 },
        { "time": "午餐", "items": ["糙米饭 150g", "鸡胸肉 150g", "西兰花 200g"], "caloriesKcal": 580, "proteinG": 45, "carbsG": 65, "fatG": 14 },
        { "time": "晚餐", "items": ["红薯 200g", "三文鱼 120g", "芦笋 150g"], "caloriesKcal": 520, "proteinG": 35, "carbsG": 50, "fatG": 18 }
      ],
      "dayNote": "当日提醒（一句话，如 '今天训练强度较大，睡前避免高糖'）"
    },
    ... 周二 ~ 周日同结构
  ]
}

【天数固定】必须是 7 天："周一"、"周二"、"周三"、"周四"、"周五"、"周六"、"周日"。

【单天规则】
1. workout.main 至少 3 个动作、最多 6 个；动作按用户的"器械/场地"可行性编写，不可用请换
2. workout.main 整体时长不超过 ${sessionMinutes} 分钟（warmup + cooldown 另算）
3. meals 固定 3 餐：早餐、午餐、晚餐；卡路里合计 1200-2200 之间，根据目标调整
4. 给用户安排合理的休息日：例如 7 天里至少 1 天是"主动恢复/拉伸日"或"完全休息日"
5. 主题设计应有渐进性：例如减脂 → 周一上肢、周二下肢、周三休息、周四全身 HIIT、周五核心、周六有氧、周日休息

【数据要求】
- 所有 kcal 与 P/C/F 都是合理估算，必加"估算"意思
- 不要给出极端/不安全建议（极低热量、过量训练）
- JSON 必须能被严格解析——不要尾部逗号、不要注释、不要 markdown 包裹

现在直接输出 JSON：`;
}
