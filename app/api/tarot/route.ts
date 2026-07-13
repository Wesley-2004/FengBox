import { NextResponse } from 'next/server';
import { checkAndRecordUsage } from '@/lib/usage';
import { callDeepSeek, parseJsonResponse } from '@/lib/ai/deepseek';

export const maxDuration = 60;

// 78 张韦特塔罗牌数据（精简版 — 用于 DeepSeek 解牌）
// 每张牌：name(中文名) + keywords(关键词) + upright(正位含义) + reversed(逆位含义)
const TAROT_DECK: Array<{
  id: number;
  name: string;
  keywords: string;
  upright: string;
  reversed: string;
}> = [
  // === 大阿尔克那 (Major Arcana) - 22 张 ===
  { id: 1, name: '愚者', keywords: '新开始、纯真、自由、冒险', upright: '新的旅程即将开始，保持开放心态，相信直觉', reversed: '鲁莽行事、不计后果、需要谨慎思考' },
  { id: 2, name: '魔术师', keywords: '创造力、技能、行动力、专注', upright: '你拥有实现目标的能力和资源，集中精力去行动', reversed: '才能未被发挥、操纵、缺乏方向感' },
  { id: 3, name: '女祭司', keywords: '直觉、潜意识、神秘、智慧', upright: '倾听内心的声音，相信你的直觉', reversed: '忽略直觉、表面化、秘密被揭露' },
  { id: 4, name: '皇后', keywords: '丰盛、母性、滋养、感官', upright: '富足与创造力正围绕你，享受当下的美好', reversed: '过度依赖、创造力受阻、忽视自我照顾' },
  { id: 5, name: '皇帝', keywords: '权威、结构、稳定、父亲', upright: '通过纪律和领导力建立稳定', reversed: '专制、僵化、失去控制' },
  { id: 6, name: '教皇', keywords: '传统、信仰、教导、指引', upright: '寻求智者的建议，遵循传统的智慧', reversed: '教条主义、反叛传统、自我质疑' },
  { id: 7, name: '恋人', keywords: '爱情、选择、和谐、关系', upright: '重要的选择即将到来，跟随你的心', reversed: '关系失衡、错误选择、价值观冲突' },
  { id: 8, name: '战车', keywords: '胜利、决心、行动、意志力', upright: '凭借坚定的意志克服挑战', reversed: '失去方向、强行推进、内在冲突' },
  { id: 9, name: '力量', keywords: '勇气、内在力量、耐心、柔克刚', upright: '用爱和耐心而非强制来克服困难', reversed: '自我怀疑、力量被压抑、愤怒' },
  { id: 10, name: '隐者', keywords: '内省、独处、智慧、寻求', upright: '退后一步，反思和寻找内在答案', reversed: '孤立、拒绝指导、迷失方向' },
  { id: 11, name: '命运之轮', keywords: '变化、循环、机遇、转折', upright: '转折点即将到来，顺应变化', reversed: '抗拒变化、坏运气、停滞' },
  { id: 12, name: '正义', keywords: '公平、真相、因果、决断', upright: '你会得到应得的结果，诚实面对', reversed: '不公、逃避责任、判断失误' },
  { id: 13, name: '倒吊人', keywords: '牺牲、新视角、暂停、放下', upright: '换个角度看待问题，暂时放下控制', reversed: '无谓牺牲、抗拒改变、固执' },
  { id: 14, name: '死神', keywords: '结束、转变、重生、放下', upright: '一个阶段结束，新的开始即将到来', reversed: '抗拒改变、停滞不前、害怕失去' },
  { id: 15, name: '节制', keywords: '平衡、调和、中庸、耐心', upright: '在生活各方面找到平衡点', reversed: '失衡、过度、不耐烦' },
  { id: 16, name: '恶魔', keywords: '束缚、欲望、执着、阴影', upright: '注意是什么在束缚你，识别不健康执着', reversed: '打破束缚、面对阴影、获得自由' },
  { id: 17, name: '塔', keywords: '突变、崩塌、觉醒、冲击', upright: '突然的变化将带来觉醒和突破', reversed: '避免的灾难、缓慢的觉醒、抗拒改变' },
  { id: 18, name: '星星', keywords: '希望、灵感、宁静、信念', upright: '保持信念，希望之光正在前方', reversed: '失去希望、信心动摇、迷茫' },
  { id: 19, name: '月亮', keywords: '幻觉、潜意识、恐惧、梦境', upright: '事情不像表面那样，深入内省', reversed: '走出迷茫、释放恐惧、真相浮现' },
  { id: 20, name: '太阳', keywords: '成功、快乐、活力、光明', upright: '充满能量与喜悦，成功在望', reversed: '暂时的挫折、过度乐观、延迟的成功' },
  { id: 21, name: '审判', keywords: '觉醒、反思、重生、召唤', upright: '听到内心的召唤，迎接新的人生阶段', reversed: '自我批判、拒绝召唤、逃避过去' },
  { id: 22, name: '世界', keywords: '完成、圆满、成就、整合', upright: '一个周期的圆满完成，庆祝你的成就', reversed: '未完成的事、停滞、缺乏结束感' },

  // === 小阿尔克那 - 权杖 (Wands) - 火 - 14 张 ===
  { id: 23, name: '权杖 A', keywords: '灵感、新行动、潜力', upright: '新事业的火花，把握机会开始行动', reversed: '延迟的开始、缺乏方向、新计划停滞' },
  { id: 24, name: '权杖 2', keywords: '规划、决策、未来视野', upright: '制定计划，展望未来', reversed: '犹豫不决、害怕未知、计划受阻' },
  { id: 25, name: '权杖 3', keywords: '扩张、远见、初步成功', upright: '你的努力开始看到成果，扩大视野', reversed: '计划延误、视野受限、缺乏远见' },
  { id: 26, name: '权杖 4', keywords: '稳定、庆祝、归属、家庭', upright: '稳固的基础，享受努力的成果', reversed: '不稳定、家庭冲突、过渡期' },
  { id: 27, name: '权杖 5', keywords: '冲突、竞争、分歧', upright: '面对竞争和挑战，坚持你的立场', reversed: '避免冲突、内在斗争、妥协' },
  { id: 28, name: '权杖 6', keywords: '胜利、认可、进步', upright: '你的努力得到认可，享受成功的喜悦', reversed: '延迟的胜利、自我怀疑、缺乏认可' },
  { id: 29, name: '权杖 7', keywords: '防守、挑战、坚持', upright: '面对挑战保持坚定', reversed: '屈服、放弃、防御过当' },
  { id: 30, name: '权杖 8', keywords: '快速行动、消息、运动', upright: '事情快速发展，把握机会', reversed: '延迟、停滞、错过机会' },
  { id: 31, name: '权杖 9', keywords: '警觉、坚持、最后努力', upright: '坚持到底，胜利在望', reversed: '精疲力竭、放弃、过度防御' },
  { id: 32, name: '权杖 10', keywords: '负担、责任、压力', upright: '承担起你的责任，但注意不要过度', reversed: '卸下重担、委派任务、释放压力' },
  { id: 33, name: '权杖 侍从', keywords: '热情、探索、消息', upright: '充满热情地探索新事物', reversed: '三分钟热度、延迟的消息、不成熟' },
  { id: 34, name: '权杖 骑士', keywords: '行动、冲动、冒险', upright: '充满能量地追求目标', reversed: '鲁莽、冲动、缺乏耐心' },
  { id: 35, name: '权杖 皇后', keywords: '自信、独立、热情', upright: '充满魅力和自信，影响他人', reversed: '自私、嫉妒、情绪化' },
  { id: 36, name: '权杖 国王', keywords: '领导、远见、权威', upright: '成为你所在领域的领导者', reversed: '专制、滥用权力、独断' },

  // === 小阿尔克那 - 圣杯 (Cups) - 水 - 14 张 ===
  { id: 37, name: '圣杯 A', keywords: '新感情、爱、直觉', upright: '新的感情或精神觉醒即将到来', reversed: '情感空虚、错失机会、内心封闭' },
  { id: 38, name: '圣杯 2', keywords: '伙伴关系、连接、互相吸引', upright: '两个灵魂的和谐连接', reversed: '关系失衡、不和谐、分离' },
  { id: 39, name: '圣杯 3', keywords: '庆祝、友谊、社群', upright: '与朋友共度欢乐时光', reversed: '过度社交、孤立、流言蜚语' },
  { id: 40, name: '圣杯 4', keywords: '冷漠、沉思、错失', upright: '警惕错失的机会，反思自己的选择', reversed: '接受机会、走出冷漠、新视野' },
  { id: 41, name: '圣杯 5', keywords: '失望、悲伤、遗憾', upright: '关注你仍然拥有的，而非失去的', reversed: '走出悲伤、重新振作、宽恕' },
  { id: 42, name: '圣杯 6', keywords: '怀旧、纯真、回归', upright: '重温美好回忆，回归纯真', reversed: '活在过去、不愿成长、沉溺' },
  { id: 43, name: '圣杯 7', keywords: '幻想、选择、诱惑', upright: '分清真实和幻想，做出明智选择', reversed: '看清真相、做出选择、走出迷雾' },
  { id: 44, name: '圣杯 8', keywords: '放下、寻求、深度', upright: '放下不再适合你的，寻找更深的意义', reversed: '害怕改变、执着、原地踏步' },
  { id: 45, name: '圣杯 9', keywords: '满足、愿望成真、幸福', upright: '享受你应得的幸福和满足', reversed: '不满足、虚假快乐、愿望落空' },
  { id: 46, name: '圣杯 10', keywords: '情感圆满、家庭和谐', upright: '情感上的极大满足，家庭和睦', reversed: '家庭不和、价值观冲突、不圆满' },
  { id: 47, name: '圣杯 侍从', keywords: '敏感、创意、情感讯息', upright: '倾听你的情感和创意灵感', reversed: '情绪化、不成熟、忽视感受' },
  { id: 48, name: '圣杯 骑士', keywords: '浪漫、魅力、追求', upright: '跟随你的心，追求理想', reversed: '情绪化、不切实际、逃避现实' },
  { id: 49, name: '圣杯 皇后', keywords: '慈悲、直觉、情感智慧', upright: '用你的直觉和同理心关怀他人', reversed: '情绪化、依赖、忽视自我' },
  { id: 50, name: '圣杯 国王', keywords: '情感成熟、智慧、包容', upright: '用智慧和慈悲领导他人', reversed: '情绪操控、冷漠、不成熟' },

  // === 小阿尔克那 - 宝剑 (Swords) - 风 - 14 张 ===
  { id: 51, name: '宝剑 A', keywords: '清晰、新思想、突破', upright: '新的想法或真相带来突破', reversed: '混乱、缺乏清晰、判断错误' },
  { id: 52, name: '宝剑 2', keywords: '僵局、选择、平衡', upright: '面对两难，权衡后做出选择', reversed: '打破僵局、做出决定、逃避' },
  { id: 53, name: '宝剑 3', keywords: '心碎、痛苦、悲伤', upright: '经历痛苦，但痛苦会过去', reversed: '走出伤痛、愈合、释放痛苦' },
  { id: 54, name: '宝剑 4', keywords: '休息、恢复、沉思', upright: '给自己时间休息和恢复', reversed: '过度休息、停滞、需要行动' },
  { id: 55, name: '宝剑 5', keywords: '冲突、失败、争执', upright: '提醒你赢得争论不等于赢得一切', reversed: '和解、放下争执、寻求共识' },
  { id: 56, name: '宝剑 6', keywords: '过渡、改变、前行', upright: '从困难走向平静的过渡期', reversed: '抗拒改变、停滞、需要放手' },
  { id: 57, name: '宝剑 7', keywords: '策略、欺骗、谨慎', upright: '保持警惕，看清他人的意图', reversed: '坦白、真相浮现、放下伪装' },
  { id: 58, name: '宝剑 8', keywords: '束缚、限制、自我设限', upright: '识别是什么在限制你，挣脱束缚', reversed: '打破限制、获得自由、新视角' },
  { id: 59, name: '宝剑 9', keywords: '焦虑、恐惧、噩梦', upright: '正视你的恐惧，它可能比你想象的弱', reversed: '走出恐惧、希望、释怀' },
  { id: 60, name: '宝剑 10', keywords: '结束、低谷、新开始', upright: '最坏的已经过去，光明在前方', reversed: '触底反弹、缓慢恢复、结束痛苦' },
  { id: 61, name: '宝剑 侍从', keywords: '好奇、学习、警觉', upright: '保持好奇心和学习的态度', reversed: '八卦、欺骗、缺乏专注' },
  { id: 62, name: '宝剑 骑士', keywords: '行动、雄心、直率', upright: '勇敢追求你的目标', reversed: '鲁莽、言语伤人、好斗' },
  { id: 63, name: '宝剑 皇后', keywords: '独立、清晰、真理', upright: '用清晰的思维和独立判断', reversed: '冷酷、挑剔、孤立' },
  { id: 64, name: '宝剑 国王', keywords: '智慧、权威、公正', upright: '用智慧和公正做出决定', reversed: '专制、操控、滥用权力' },

  // === 小阿尔克那 - 金币 (Pentacles) - 土 - 14 张 ===
  { id: 65, name: '金币 A', keywords: '新机会、物质、繁荣', upright: '新的物质机会或财务增长', reversed: '错失机会、财务不稳、短视' },
  { id: 66, name: '金币 2', keywords: '平衡、适应、灵活', upright: '在变化中保持平衡', reversed: '失衡、过度工作、不会放松' },
  { id: 67, name: '金币 3', keywords: '合作、学习、技能', upright: '与他人合作，发挥你的专长', reversed: '缺乏合作、技能不足、独断' },
  { id: 68, name: '金币 4', keywords: '稳定、安全、保守', upright: '稳固的基础，珍惜你所拥有的', reversed: '过度保守、物质主义、固执' },
  { id: 69, name: '金币 5', keywords: '困难、贫困、孤立', upright: '寻求帮助，不要独自承受', reversed: '走出困境、获得支持、恢复' },
  { id: 70, name: '金币 6', keywords: '慷慨、公平、给予', upright: '在给予和接受之间找到平衡', reversed: '不平等、索取、吝啬' },
  { id: 71, name: '金币 7', keywords: '耐心、评估、长期视角', upright: '耐心等待，你的努力会有回报', reversed: '缺乏耐心、急功近利、怀疑' },
  { id: 72, name: '金币 8', keywords: '勤奋、技能、专注', upright: '专注和努力会带来精湛', reversed: '缺乏动力、捷径、不专注' },
  { id: 73, name: '金币 9', keywords: '独立、丰收、自给自足', upright: '享受你独立创造的成果', reversed: '过度依赖、虚假繁荣、孤立' },
  { id: 74, name: '金币 10', keywords: '财富、家庭、传承', upright: '物质和情感上的丰盛，可能涉及家庭', reversed: '家庭冲突、财富争议、传统束缚' },
  { id: 75, name: '金币 侍从', keywords: '学习、机会、新计划', upright: '抓住学习新技能的机会', reversed: '懒散、错失机会、不专注' },
  { id: 76, name: '金币 骑士', keywords: '稳健、可靠、坚持', upright: '通过坚持和努力达成目标', reversed: '停滞、懒散、缺乏动力' },
  { id: 77, name: '金币 皇后', keywords: '务实、滋养、富足', upright: '用你的实际能力创造丰盛', reversed: '过度依赖物质、忽视精神、失衡' },
  { id: 78, name: '金币 国王', keywords: '成功、稳健、富有', upright: '通过稳健努力获得成功', reversed: '物质主义、固执、贪婪' },
];

// 5 张牌阵位置含义
const POSITIONS = [
  { idx: 0, name: '现在 / 核心', desc: '你当前面临的核心问题或状态' },
  { idx: 1, name: '过去 / 根源', desc: '影响当前局面的过去因素' },
  { idx: 2, name: '未来 / 发展', desc: '事情可能的发展方向' },
  { idx: 3, name: '内在 / 自我', desc: '你内心的真实状态或想法' },
  { idx: 4, name: '建议 / 结果', desc: '给你的建议或最终走向' },
];

export async function POST(request: Request) {
  // 检查试用限制 + 白名单
  const usage = await checkAndRecordUsage('tarot');

  // 塔罗 API 有两个 action（shuffle/interpret），只在 interpret 时检查试用
  if (!usage.allowed) {
    const body = await request.clone().json().catch(() => ({}));
    if (body.action === 'interpret') {
      return NextResponse.json({ error: usage.reason }, { status: 403 });
    }
  }

  try {
    const body = await request.json();
    const { action } = body;

    if (action === 'shuffle') {
      return handleShuffle();
    } else if (action === 'interpret') {
      return handleInterpret(body);
    } else if (action === 'clarify') {
      return handleClarify(body);
    } else {
      return NextResponse.json({ error: '未知操作' }, { status: 400 });
    }
  } catch (error) {
    console.error('塔罗服务出错:', error);
    return NextResponse.json(
      { error: '塔罗服务出错，请稍后重试' },
      { status: 500 }
    );
  }
}

// 洗牌：返回一个洗好的"序号顺序"（每次洗牌顺序不同）
function handleShuffle() {
  const ids = TAROT_DECK.map((c) => c.id);
  // Fisher-Yates 洗牌
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  return NextResponse.json({
    success: true,
    deckSize: ids.length,
    deck: ids, // 洗好的顺序 — 前端用这个给每张牌背一个位置号
  });
}

// 解牌：用户选中的 5 张牌 + 问题 → AI 解牌
async function handleInterpret(body: {
  question: string;
  selectedCards: Array<{ cardId: number; reversed: boolean }>;
  history?: ClarifyTurn[];
}) {
  const { question, selectedCards, history } = body;

  if (!question || question.trim().length === 0) {
    return NextResponse.json({ error: '请输入你的问题' }, { status: 400 });
  }

  if (!Array.isArray(selectedCards) || selectedCards.length !== 5) {
    return NextResponse.json({ error: '请选择正好 5 张牌' }, { status: 400 });
  }

  // 验证每张牌
  for (let i = 0; i < selectedCards.length; i++) {
    const c = selectedCards[i];
    const card = TAROT_DECK.find((d) => d.id === c.cardId);
    if (!card) {
      return NextResponse.json({ error: `第 ${i + 1} 张牌无效` }, { status: 400 });
    }
  }

  // 构建牌阵描述
  const spread = selectedCards.map((c, i) => {
    const card = TAROT_DECK.find((d) => d.id === c.cardId)!;
    const pos = POSITIONS[i];
    const orientation = c.reversed ? '逆位' : '正位';
    const meaning = c.reversed ? card.reversed : card.upright;
    return `位置 ${i + 1}（${pos.name}）：${card.name}（${orientation}）
关键词：${card.keywords}
牌意：${meaning}`;
  }).join('\n\n');

  const fullPrompt = `你是一位富有同理心、温柔且善于倾听的塔罗解读师，**最擅长把抽象牌意落到用户的实际生活**。请为用户进行一场温暖、有洞察力、**内容丰富**的塔罗牌解读。

【重要立场】
塔罗牌本质是一种**心理学投射工具和自我反思媒介**，不是预测未来的算命术。
你的解读重点是：帮助用户看清自己的内在状态、提供新视角、激发自我反思。
避免：宿命论、恐吓、过度承诺。请保持温暖、尊重、有启发性。

【用户的问题】
${question.trim()}

${history && history.length > 0 ? formatHistoryForPrompt(history) : ''}

【5 张牌阵（十字牌阵 — 中间 1 + 四周 4）】
${spread}

【解读要求 — 务必丰富、有案例】
每张牌（位置 1-5）的 interpretation 字段必须包含以下 5 个小节，每节 1-3 句中文，**禁止笼统敷衍**：

1. **【牌意定位】** 这张牌在这个位置（现在/过去/未来/内在/建议）上代表什么意思。要说清"为什么是这个位置"，而不是把牌意复制一遍。
2. **【结合追问背景】** 把用户最初的问题和追问中提到的具体情况结合进来。**不要泛泛而谈**，要呼应用户提到的具体人物、事件、场景（哪怕追问只补充了"涉及感情"也要落到"现在的感情状态"）。
3. **【实际案例 / 场景对照】** ★关键★ 举 1-2 个**典型的现实场景**作为对照（比如"如果你最近经常因为这件事失眠，那这张牌在说你可能在...；如果你和对方已经冷战一周，那这张牌反映的是..."），让用户立刻能映射到自己的处境。
4. **【正逆位差异化解读】** ★关键★ 必须**结合正/逆位**说出不同的解读方向，不能"正位说一遍逆位反向再说一遍"。例如"正位的 XX 反映用户主动选择的勇气；逆位则提醒用户可能在用表面行动回避真正的痛点"。
5. **【行动建议】** 给出 1 个具体可执行的小动作（不是"加油"这种空话），例如"今天睡前把这件事最坏的结果写下来，你会发现其实没那么可怕"、"跟那个你回避的人说一句'我最近在想...'"。

【整体总结 summary 字段要求 — 4 个小节】
1. **【牌阵故事】** 把 5 张牌串成一个故事：现在怎么了 → 怎么走到这一步 → 会向哪里发展 → 内在真正的声音 → 该怎么做。要有叙事感，不要堆砌牌意。
2. **【核心洞察】** 一句话点破牌阵最想告诉用户的事（不超过 50 字，但要有冲击力）。
3. **【行动清单】** 3 条具体可执行的小动作（按优先级排序）。
4. **【温暖收尾】** 一段鼓励性的话，不要用"命运掌握在你手中"这种陈词，改用更具体的、贴合用户处境的鼓励。

【输出格式 — JSON 对象，interpretation 字段用换行符分段】
{
  "cards": [
    {
      "position": "现在/核心",
      "interpretation": "【牌意定位】...\\n\\n【结合追问背景】...\\n\\n【实际案例】...\\n\\n【正逆位差异化】...\\n\\n【行动建议】..."
    },
    { "position": "过去/根源", "interpretation": "..." },
    { "position": "未来/发展", "interpretation": "..." },
    { "position": "内在/自我", "interpretation": "..." },
    { "position": "建议/结果", "interpretation": "..." }
  ],
  "summary": "【牌阵故事】...\\n\\n【核心洞察】...\\n\\n【行动清单】...\\n\\n【温暖收尾】..."
}

【硬性要求】
1. 每张牌 interpretation **至少 350 字**，不要用"省略号"或"如上所述"等敷衍
2. summary 整体 **至少 400 字**
3. 不准 markdown 代码块包裹 JSON、不准注释、不准尾部逗号
4. 如果用户没有追问（直接洗牌），把"结合追问背景"换成"结合用户问题的字面意思"`;

  const aiResponse = await callDeepSeek(
    [
      {
        role: 'system',
        content: '你是一位温暖、有洞察力的塔罗解读师，擅长通过塔罗牌帮助人们自我反思和成长。',
      },
      {
        role: 'user',
        content: fullPrompt,
      },
    ],
    { temperature: 0.85, maxTokens: 5500 },
  );

  // 提取 JSON
  const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    console.error('AI 响应中没有 JSON:', aiResponse.slice(0, 200));
    return NextResponse.json(
      { error: 'AI 这次没解出牌，请重试' },
      { status: 500 }
    );
  }

  let parsed: { cards: Array<{ position: string; interpretation: string }>; summary: string };
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch (e) {
    console.error('JSON 解析失败:', jsonMatch[0].slice(0, 200));
    return NextResponse.json(
      { error: '解牌解析失败，请重试' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    question: question.trim(),
    spread: selectedCards.map((c, i) => {
      const card = TAROT_DECK.find((d) => d.id === c.cardId)!;
      const pos = POSITIONS[i];
      return {
        position: pos.name,
        positionDesc: pos.desc,
        cardId: card.id,
        cardName: card.name,
        reversed: c.reversed,
        keywords: card.keywords,
      };
    }),
    interpretation: parsed,
  });
}

// ============================================================================
//                          追问（clarify）
// ============================================================================

type ClarifyAnswer = string | string[];

type ClarifyTurn = {
  question: string;          // AI 问的问题
  type: 'single' | 'multi' | 'boolean';
  options: string[];         // 候选项
  answer: ClarifyAnswer;     // 用户答的内容
};

const MAX_CLARIFY_ROUNDS = 5;

async function handleClarify(body: {
  question: string;
  history?: ClarifyTurn[];
}) {
  const { question, history = [] } = body;

  if (!question || question.trim().length === 0) {
    return NextResponse.json({ error: '请输入你的问题' }, { status: 400 });
  }
  if (!Array.isArray(history)) {
    return NextResponse.json({ error: 'history 必须为数组' }, { status: 400 });
  }

  // 已到最大轮数，强制完成
  if (history.length >= MAX_CLARIFY_ROUNDS) {
    return NextResponse.json({
      success: true,
      infoComplete: true,
      reason: 'max_rounds',
      history,
    });
  }

  const prompt = buildClarifyPrompt(question.trim(), history);
  const aiText = await callDeepSeek(
    [
      {
        role: 'system',
        content:
          '你是一位富有同理心、擅长倾听的塔罗咨询师。' +
          '通过少量关键问题把用户的情况摸清，每一题都要"高信号"——' +
          '问完就能显著影响最终解牌的方向。' +
          '不要问已经能从上下文推断出的事。' +
          '只输出合法 JSON，不要 markdown 包裹。',
      },
      { role: 'user', content: prompt },
    ],
    { temperature: 0.7, maxTokens: 800 },
  );

  const parsed = parseJsonResponse(aiText);
  const raw = extractClarifyObj(parsed, aiText);
  if (!raw) {
    console.error('clarify AI 响应解析失败:', aiText.slice(0, 200));
    return NextResponse.json(
      { error: '追问生成失败，请重试' },
      { status: 500 }
    );
  }

  // 规范化
  const infoComplete = Boolean(raw.infoComplete);
  const type = (['single', 'multi', 'boolean'].includes(raw.type) ? raw.type : 'single') as ClarifyTurn['type'];
  const options = Array.isArray(raw.options)
    ? raw.options.map((s: any) => String(s).trim()).filter(Boolean).slice(0, 8)
    : [];

  // boolean 类型自动给是/否选项（如果 AI 没给）
  const finalOptions = type === 'boolean' && options.length === 0
    ? ['是', '否']
    : options;

  return NextResponse.json({
    success: true,
    infoComplete,
    question: String(raw.question || '').trim(),
    type,
    options: finalOptions,
    round: history.length + 1,
    maxRounds: MAX_CLARIFY_ROUNDS,
    reason: infoComplete ? (raw.reason || 'enough') : undefined,
  });
}

function buildClarifyPrompt(question: string, history: ClarifyTurn[]): string {
  const historyText = history.length === 0
    ? '（无 — 这是第一题）'
    : history.map((h, i) =>
        `${i + 1}. [问] ${h.question}\n   [类型] ${h.type}\n   [选项] ${h.options.join('、')}\n   [用户答] ${formatAnswer(h.answer)}`
      ).join('\n');

  return `你正在通过追问帮一位塔罗占卜师把用户的情况摸清。请生成下一题（或判断信息已足够可以结束追问）。

【用户的初始问题】
${question}

【已经问过的对话】
${historyText}

【决定 — 二选一】
A) 如果你认为信息已经足够理解"事情的全貌"（包括：涉及的人/事、关键背景、用户最关心的点），返回 infoComplete=true
B) 如果还需要更多信息，生成下一题。**最多再问 ${MAX_CLARIFY_ROUNDS - history.length} 题**。

【题目类型 — 三选一】
- "single"：单选题，2-5 个选项
- "multi"：多选题，3-6 个选项（用户可多选）
- "boolean"：判断题，选项固定为 ["是","否"]

【题目设计原则】
1. **高信号**：每题问完能显著影响解牌方向，避免"无关紧要的细节"
2. **不重复**：已经问过的不要再问
3. **易回答**：用户 5 秒内能选完，不需要长文本输入
4. **具体可选项**：选项要具体（"工作中" / "感情中" / "财务中"），不要抽象（"领域A"）

【输出 — 严格 JSON，不要 markdown】
{
  "infoComplete": false,
  "question": "你想问用户的问题（一句中文，简洁明了）",
  "type": "single",
  "options": ["选项1", "选项2", "选项3"],
  "reason": "为什么问这题（仅给后端日志看，前端不显示，可空）"
}

如果是 infoComplete:
{
  "infoComplete": true,
  "question": "",
  "type": "single",
  "options": [],
  "reason": "为什么信息够了"
}`;
}

function extractClarifyObj(parsed: any, raw: string): any | null {
  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
  const m = raw.match(/\{[\s\S]*\}/);
  if (m) {
    try { return JSON.parse(m[0]); } catch { return null; }
  }
  return null;
}

function formatAnswer(a: ClarifyAnswer): string {
  if (Array.isArray(a)) return a.join('、');
  return a;
}

function formatHistoryForPrompt(history: ClarifyTurn[]): string {
  const lines = history.map((h, i) =>
    `${i + 1}. [问] ${h.question}\n   [答] ${formatAnswer(h.answer)}`
  );
  return `【追问对话历史 — 用户补充的背景信息】
${lines.join('\n')}

（请把这些补充信息和初始问题一起纳入解读，针对用户具体处境给出建议。）`;
}