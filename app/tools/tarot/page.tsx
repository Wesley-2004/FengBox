'use client';

import { useState } from 'react';
import Link from 'next/link';

interface Card {
  id: number;
  position: string;
  positionDesc: string;
  cardName: string;
  reversed: boolean;
  keywords: string;
}

interface Interpretation {
  cards: Array<{ position: string; interpretation: string }>;
  summary: string;
}

// 78 张牌的简化信息（前端展示用 — 不调 AI，本地数据）
const CARD_NAMES: Record<number, string> = {};
// 服务端返回的是 cardId (1-78)，前端用这个映射显示对应的塔罗牌 PNG 文件名
// 文件位于 public/tarot/，由 @cometpisces/tarot-kit-images 包提供
const CARD_IMAGES: Record<number, string> = {
  // 大阿尔克那 (1-22)
  1: '00-TheFool', 2: '01-TheMagician', 3: '02-TheHighPriestess', 4: '03-TheEmpress',
  5: '04-TheEmperor', 6: '05-TheHierophant', 7: '06-TheLovers', 8: '07-TheChariot',
  9: '08-Strength', 10: '09-TheHermit', 11: '10-WheelOfFortune', 12: '11-Justice',
  13: '12-TheHangedMan', 14: '13-Death', 15: '14-Temperance', 16: '15-TheDevil',
  17: '16-TheTower', 18: '17-TheStar', 19: '18-TheMoon', 20: '19-TheSun',
  21: '20-Judgement', 22: '21-TheWorld',
  // 权杖 Wands (23-36)
  23: 'Wands01', 24: 'Wands02', 25: 'Wands03', 26: 'Wands04',
  27: 'Wands05', 28: 'Wands06', 29: 'Wands07', 30: 'Wands08',
  31: 'Wands09', 32: 'Wands10', 33: 'Wands11', 34: 'Wands12',
  35: 'Wands13', 36: 'Wands14',
  // 圣杯 Cups (37-50)
  37: 'Cups01', 38: 'Cups02', 39: 'Cups03', 40: 'Cups04',
  41: 'Cups05', 42: 'Cups06', 43: 'Cups07', 44: 'Cups08',
  45: 'Cups09', 46: 'Cups10', 47: 'Cups11', 48: 'Cups12',
  49: 'Cups13', 50: 'Cups14',
  // 宝剑 Swords (51-64)
  51: 'Swords01', 52: 'Swords02', 53: 'Swords03', 54: 'Swords04',
  55: 'Swords05', 56: 'Swords06', 57: 'Swords07', 58: 'Swords08',
  59: 'Swords09', 60: 'Swords10', 61: 'Swords11', 62: 'Swords12',
  63: 'Swords13', 64: 'Swords14',
  // 金币 Pentacles (65-78)
  65: 'Pentacles01', 66: 'Pentacles02', 67: 'Pentacles03', 68: 'Pentacles04',
  69: 'Pentacles05', 70: 'Pentacles06', 71: 'Pentacles07', 72: 'Pentacles08',
  73: 'Pentacles09', 74: 'Pentacles10', 75: 'Pentacles11', 76: 'Pentacles12',
  77: 'Pentacles13', 78: 'Pentacles14',
};

// 塔罗牌名映射（前端显示用 — 简化版，主要名字从后端拿）
// 实际生产环境应该用完整数据库，这里我们硬编码 78 个名字以保证显示
const TAROT_NAMES: Record<number, string> = {
  1: '愚者', 2: '魔术师', 3: '女祭司', 4: '皇后', 5: '皇帝', 6: '教皇', 7: '恋人', 8: '战车', 9: '力量', 10: '隐者',
  11: '命运之轮', 12: '正义', 13: '倒吊人', 14: '死神', 15: '节制', 16: '恶魔', 17: '塔', 18: '星星', 19: '月亮', 20: '太阳',
  21: '审判', 22: '世界',
  23: '权杖 A', 24: '权杖 2', 25: '权杖 3', 26: '权杖 4', 27: '权杖 5', 28: '权杖 6', 29: '权杖 7', 30: '权杖 8', 31: '权杖 9', 32: '权杖 10',
  33: '权杖 侍从', 34: '权杖 骑士', 35: '权杖 皇后', 36: '权杖 国王',
  37: '圣杯 A', 38: '圣杯 2', 39: '圣杯 3', 40: '圣杯 4', 41: '圣杯 5', 42: '圣杯 6', 43: '圣杯 7', 44: '圣杯 8', 45: '圣杯 9', 46: '圣杯 10',
  47: '圣杯 侍从', 48: '圣杯 骑士', 49: '圣杯 皇后', 50: '圣杯 国王',
  51: '宝剑 A', 52: '宝剑 2', 53: '宝剑 3', 54: '宝剑 4', 55: '宝剑 5', 56: '宝剑 6', 57: '宝剑 7', 58: '宝剑 8', 59: '宝剑 9', 60: '宝剑 10',
  61: '宝剑 侍从', 62: '宝剑 骑士', 63: '宝剑 皇后', 64: '宝剑 国王',
  65: '金币 A', 66: '金币 2', 67: '金币 3', 68: '金币 4', 69: '金币 5', 70: '金币 6', 71: '金币 7', 72: '金币 8', 73: '金币 9', 74: '金币 10',
  75: '金币 侍从', 76: '金币 骑士', 77: '金币 皇后', 78: '金币 国王',
};

const POSITION_LABELS = ['现在 / 核心', '过去 / 根源', '未来 / 发展', '内在 / 自我', '建议 / 结果'];

export default function TarotPage() {
  const [question, setQuestion] = useState('');
  const [phase, setPhase] = useState<'ask' | 'select' | 'result'>('ask');
  const [deck, setDeck] = useState<number[]>([]); // 洗好的牌顺序
  const [selectedIds, setSelectedIds] = useState<number[]>([]); // 用户选中的牌 ID（按选择顺序）
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{
    spread: Card[];
    interpretation: Interpretation;
  } | null>(null);

  // 步骤 1：开始占卜 — 调 shuffle endpoint
  const startReading = async () => {
    if (!question.trim()) {
      setError('请输入你想问的问题');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/tarot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'shuffle' }),
      });

      const data = await response.json();
      if (data.success) {
        setDeck(data.deck);
        setSelectedIds([]);
        setPhase('select');
      } else {
        setError(data.error || '洗牌失败，请重试');
      }
    } catch (err) {
      setError('网络错误，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 步骤 2：选牌 — 用户点牌背
  const toggleCard = (cardId: number) => {
    if (selectedIds.includes(cardId)) {
      // 取消选中
      setSelectedIds(selectedIds.filter((id) => id !== cardId));
    } else if (selectedIds.length < 5) {
      // 选中（最多 5 张）
      setSelectedIds([...selectedIds, cardId]);
    }
  };

  // 步骤 3：解牌 — 调 interpret endpoint
  const interpretCards = async () => {
    if (selectedIds.length !== 5) {
      setError('请选择正好 5 张牌');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // 实际塔罗有正逆位 — 50% 概率逆位
      const selectedCards = selectedIds.map((id) => ({
        cardId: id,
        reversed: Math.random() < 0.5,
      }));

      const response = await fetch('/api/tarot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'interpret',
          question: question.trim(),
          selectedCards,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setResult({
          spread: data.spread,
          interpretation: data.interpretation,
        });
        setPhase('result');
      } else {
        setError(data.error || '解牌失败，请重试');
      }
    } catch (err) {
      setError('网络错误，请重试');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setPhase('ask');
    setQuestion('');
    setDeck([]);
    setSelectedIds([]);
    setResult(null);
    setError('');
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-purple-50 to-indigo-100 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        {/* 返回链接 */}
        <div className="mb-6">
          <Link
            href="/"
            className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
          >
            ← 返回 FengBox 首页
          </Link>
        </div>

        {/* 标题 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <span className="text-3xl">🔮</span>
            <h1 className="text-3xl font-bold text-gray-800">AI 塔罗占卜</h1>
          </div>
          <p className="text-gray-600">凭直觉选 5 张牌，AI 为你解读内心</p>
        </div>

        {/* 温馨提示 */}
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-6 text-xs text-purple-800">
          🌙 塔罗是自我反思的镜子，不是命运的判决。AI 解读仅供参考，最终决定权在你手中。
        </div>

        {/* 阶段 1：输入问题 */}
        {phase === 'ask' && (
          <div className="bg-white rounded-xl shadow-md p-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              你想问什么？
            </label>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="例如：我该不该接受这份新工作？"
              rows={3}
              className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-purple-400 mb-4"
            />

            {/* 牌阵说明 */}
            <div className="bg-purple-50 rounded-lg p-4 mb-4">
              <div className="text-sm font-medium text-purple-800 mb-2">🃏 十字牌阵</div>
              <div className="grid grid-cols-3 gap-2 text-xs text-purple-700">
                <div></div>
                <div className="text-center">⬆️ 过去 / 根源</div>
                <div></div>
                <div className="text-center">⬅️ 内在 / 自我</div>
                <div className="text-center">⭐ 现在 / 核心</div>
                <div className="text-center">➡️ 建议 / 结果</div>
                <div></div>
                <div className="text-center">⬇️ 未来 / 发展</div>
                <div></div>
              </div>
            </div>

            <button
              onClick={startReading}
              disabled={loading}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition"
            >
              {loading ? '⏳ 洗牌中...' : '🔮 开始占卜'}
            </button>

            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                ❌ {error}
              </div>
            )}
          </div>
        )}

        {/* 阶段 2：选牌 */}
        {phase === 'select' && (
          <div>
            <div className="bg-white rounded-xl shadow-md p-6 mb-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-sm text-gray-500">你的问题：</div>
                  <div className="text-gray-800 italic">「{question}」</div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-500">已选</div>
                  <div className="text-2xl font-bold text-purple-600">
                    {selectedIds.length} / 5
                  </div>
                </div>
              </div>

              {selectedIds.length === 5 && (
                <button
                  onClick={interpretCards}
                  disabled={loading}
                  className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition"
                >
                  {loading ? '⏳ 解牌中...' : '✨ 开始解牌'}
                </button>
              )}
              {selectedIds.length < 5 && (
                <div className="text-center text-sm text-purple-600">
                  👆 请凭直觉点击 {5 - selectedIds.length} 张牌背
                </div>
              )}

              {error && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                  ❌ {error}
                </div>
              )}
            </div>

            {/* 78 张牌背网格 */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="grid grid-cols-8 sm:grid-cols-10 md:grid-cols-13 gap-2">
                {deck.map((cardId, idx) => {
                  const isSelected = selectedIds.includes(cardId);
                  const selectOrder = selectedIds.indexOf(cardId) + 1; // 1-5
                  return (
                    <button
                      key={idx}
                      onClick={() => toggleCard(cardId)}
                      disabled={!isSelected && selectedIds.length >= 5}
                      className={`aspect-[2/3] rounded-lg border-2 flex flex-col items-center justify-center text-xs transition ${
                        isSelected
                          ? 'border-purple-600 bg-purple-100 text-purple-800 shadow-lg scale-105'
                          : selectedIds.length >= 5
                          ? 'border-gray-200 bg-gray-50 text-gray-300 cursor-not-allowed'
                          : 'border-purple-300 bg-gradient-to-br from-purple-100 to-indigo-100 text-purple-700 hover:border-purple-500 hover:shadow'
                      }`}
                    >
                      {isSelected ? (
                        <>
                          <div className="text-2xl font-bold">{selectOrder}</div>
                          <div className="text-[10px] mt-1">已选</div>
                        </>
                      ) : (
                        <>
                          <div className="text-lg">🃏</div>
                          <div className="text-[10px]">{idx + 1}</div>
                        </>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* 阶段 3：解牌结果 */}
        {phase === 'result' && result && (
          <div>
            <div className="bg-white rounded-xl shadow-md p-6 mb-4">
              <div className="text-sm text-gray-500 mb-1">你的问题：</div>
              <div className="text-gray-800 italic mb-4">「{question}」</div>

              {/* 5 张牌展示 */}
              <div className="grid grid-cols-5 gap-2 mb-6">
                {result.spread.map((card, i) => (
                  <div key={i} className="text-center">
                    <div className={`aspect-[2/3] rounded-lg border-2 border-purple-400 bg-white overflow-hidden mb-1 ${card.reversed ? 'rotate-180' : ''}`}>
                      {CARD_IMAGES[card.id] ? (
                        <img
                          src={`/tarot/${CARD_IMAGES[card.id]}.png`}
                          alt={card.cardName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-3xl">🃏</div>
                      )}
                      <div className="absolute bottom-1 right-1 text-[10px] bg-purple-100 px-1 rounded text-purple-700">
                        {card.reversed ? '逆位' : '正位'}
                      </div>
                    </div>
                    <div className="text-xs font-medium text-purple-800">
                      {card.cardName}
                    </div>
                    <div className="text-[10px] text-gray-500 mt-0.5">
                      {POSITION_LABELS[i]}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 5 张牌解读 */}
            <div className="space-y-3 mb-4">
              {result.interpretation.cards.map((c, i) => (
                <div key={i} className="bg-white rounded-xl shadow-md p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="w-7 h-7 bg-purple-600 text-white text-sm rounded-full flex items-center justify-center font-bold">
                      {i + 1}
                    </span>
                    <h3 className="font-bold text-gray-800">
                      {c.position}
                    </h3>
                    <span className="text-xs text-gray-500">
                      {result.spread[i]?.cardName}
                    </span>
                  </div>
                  <p className="text-gray-700 leading-relaxed text-sm">
                    {c.interpretation}
                  </p>
                </div>
              ))}
            </div>

            {/* 整体总结 */}
            <div className="bg-gradient-to-br from-purple-100 to-indigo-100 rounded-xl shadow-md p-6 mb-4">
              <h3 className="text-xl font-bold text-purple-800 mb-3">
                ✨ 整体解读
              </h3>
              <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                {result.interpretation.summary}
              </p>
            </div>

            <button
              onClick={reset}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-6 rounded-lg transition"
            >
              🔮 重新占卜
            </button>
          </div>
        )}
      </div>
    </main>
  );
}