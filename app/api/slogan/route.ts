import { NextResponse } from 'next/server';
import { checkAndRecordUsage } from '@/lib/usage';
import { callDeepSeek, parseJsonResponse } from '@/lib/ai/deepseek';

export const maxDuration = 60;

// ---------- 类型 ----------
interface SloganItem {
  text: string;
  score: number;        // 1-5 创意评分
  rhyme: string;        // 押韵字 / 'free' / 'none'
  charCount: number;    // 字数（不含标点）
  scene: string;        // 适配场景
  tip?: string;         // 简短点评（可选）
}

interface SloganRequest {
  keywords: string;
  scene: string;        // 'class' | 'sports' | 'ad' | 'product' | 'company' | 'festival' | 'other'
  count: number;
  charPerLine: string;
  rhyme: boolean;
}

// ---------- 场景预设 ----------
const SCENE_PROMPTS: Record<string, { name: string; style: string }> = {
  class:    { name: '班级口号',   style: '适合学生班级、校园场景，青春励志、团结友爱、激励斗志' },
  sports:   { name: '运动会口号', style: '适合运动会、体育竞技场景，激情澎湃、热血昂扬、有体育精神' },
  ad:       { name: '广告语',     style: '适合品牌广告，简洁有力、突出卖点、让人记住、有营销感' },
  product:  { name: '产品宣传',   style: '适合产品宣传，突出产品价值、解决痛点、有说服力' },
  company:  { name: '企业文化',   style: '适合企业 Slogan，专业大气、有格局、体现愿景和价值观' },
  festival: { name: '节庆活动',   style: '适合节日庆典、促销活动，热闹喜庆、有节庆氛围' },
  other:    { name: '通用',       style: '通用场景，朗朗上口、积极向上' },
};

// ---------- 入口 ----------
export async function POST(request: Request) {
  // 1. 试用 / 白名单 gate
  const usage = await checkAndRecordUsage('slogan');
  if (!usage.allowed) {
    return NextResponse.json({ error: usage.reason }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { keywords, scene, count, charPerLine, rhyme } = body as SloganRequest;

    // 2. 校验
    if (!keywords || keywords.trim().length === 0) {
      return NextResponse.json({ error: '请输入至少一个关键词' }, { status: 400 });
    }

    const validCount = Math.max(1, Math.min(20, parseInt(String(count)) || 5));
    const validCharPerLine = String(charPerLine || 'free').trim();
    const validScene = SCENE_PROMPTS[scene] ? scene : 'other';

    // 3. 调 AI
    const aiText = await callDeepSeek(
      [
        {
          role: 'system',
          content:
            '你是一个专业的文案撰写人，擅长写朗朗上口、有感染力的口号。' +
            '请严格按照用户给定的场景、字数、韵律要求生成，并只输出合法 JSON，不要任何解释、不要 markdown 代码块。',
        },
        { role: 'user', content: buildPrompt({
            keywords: keywords.trim(),
            scene: validScene,
            count: validCount,
            charPerLine: validCharPerLine,
            rhyme: Boolean(rhyme),
          })
        },
      ],
      { temperature: 1.0, maxTokens: 3000 },
    );

    // 4. 解析 JSON
    const parsed = parseJsonResponse(aiText);
    const raw = extractArray(parsed, aiText);
    if (!raw || raw.length === 0) {
      console.error('AI 响应中无法解析 JSON:', aiText.slice(0, 200));
      return NextResponse.json(
        { error: 'AI 这次没生成出口号，请重试' },
        { status: 500 }
      );
    }

    // 5. 规范化
    const valid: SloganItem[] = raw
      .filter((it: any) => it && (it.text || typeof it === 'string'))
      .slice(0, validCount)
      .map((it: any): SloganItem => {
        const text = typeof it === 'string' ? it : String(it.text || '').trim();
        const cleanText = text.replace(/^["']|["']$/g, '').trim();
        return {
          text: cleanText,
          score: typeof it.score === 'number' ? Math.max(1, Math.min(5, Math.round(it.score))) : 3,
          rhyme: it.rhyme ? String(it.rhyme).trim() : (rhyme ? '押韵' : 'free'),
          charCount: typeof it.charCount === 'number'
            ? it.charCount
            : cleanText.replace(/[，。！？、,.!?\s]/g, '').length,
          scene: it.scene ? String(it.scene).trim() : SCENE_PROMPTS[validScene].name,
          tip: it.tip ? String(it.tip).trim() : undefined,
        };
      })
      .filter((it: SloganItem) => it.text.length > 0);

    if (valid.length === 0) {
      return NextResponse.json(
        { error: '没有生成出有效的口号，请换个关键词试试' },
        { status: 500 }
      );
    }

    // 6. 推荐：取 score 最高的 1-2 句作为"AI 精选"
    const recommended = [...valid]
      .sort((a, b) => b.score - a.score)
      .slice(0, 2)
      .map((it) => it.text);

    return NextResponse.json({
      success: true,
      keywords: keywords.trim(),
      scene: validScene,
      sceneLabel: SCENE_PROMPTS[validScene].name,
      count: validCount,
      charPerLine: validCharPerLine,
      rhyme: Boolean(rhyme),
      slogans: valid,
      recommended,
    });
  } catch (error) {
    console.error('生成口号出错:', error);
    return NextResponse.json(
      { error: '口号服务出错，请稍后重试' },
      { status: 500 }
    );
  }
}

// ---------- helpers ----------
function buildPrompt(params: {
  keywords: string;
  scene: string;
  count: number;
  charPerLine: string;
  rhyme: boolean;
}): string {
  const { keywords, scene, count, charPerLine, rhyme } = params;
  const sceneCfg = SCENE_PROMPTS[scene] || SCENE_PROMPTS.other;

  // 字数规则
  let charRule = '';
  if (charPerLine === 'free') {
    charRule = '每句字数不限（10-25 字之间较佳）';
  } else if (charPerLine.includes('-')) {
    charRule = `每句字数在 ${charPerLine} 之间`;
  } else {
    charRule = `每句严格 ${charPerLine} 个字`;
  }

  const rhymeRule = rhyme
    ? '所有口号必须押韵（建议押 ang/eng/ing/ong/an/en/in 等开口韵），并明确标出韵脚字'
    : '不要求押韵';

  return `请根据用户提供的关键词，生成 ${count} 句口号。

【关键词】
${keywords}

【场景】
${sceneCfg.name} —— ${sceneCfg.style}

【要求】
1. 字数：${charRule}
2. 韵律：${rhymeRule}
3. 风格：贴合"${sceneCfg.name}"场景，避免万能感
4. 每句独立成行，能直接使用

【输出 — 严格 JSON 数组，不要任何解释】
[
  {
    "text": "完整口号文本",
    "score": 5,                  // 1-5 整数，5 最有创意 / 最贴合场景 / 最朗朗上口
    "rhyme": "ang",              // 押韵时填韵脚（如 ang/eng），不押韵填 "free"
    "charCount": 12,             // 字数（不含标点）
    "scene": "${sceneCfg.name}", // 适配场景
    "tip": "为什么这句好（8-15 字点评，可选）"
  }
]

【硬性要求】
1. 数量：返回 ${count} 句
2. score 必须差异化：不要全部给 5，至少出现 3/4/5 三档
3. rhyme 字段要真实——押韵的填韵脚（如 ang/eng/an），不押韵明确填 "free"
4. tip 至少为一半的句子给出
5. 严格 JSON，不准 markdown 包裹、不准注释、不准尾部逗号`;
}

function extractArray(parsed: any, raw: string): any[] | null {
  if (Array.isArray(parsed)) return parsed;
  if (parsed && Array.isArray(parsed.slogans)) return parsed.slogans;
  const m = raw.match(/\[[\s\S]*?\]/);
  if (m) {
    try { return JSON.parse(m[0]); } catch { return null; }
  }
  return null;
}