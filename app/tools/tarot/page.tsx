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

type ClarifyType = 'single' | 'multi' | 'boolean';

interface ClarifyTurn {
  question: string;
  type: ClarifyType;
  options: string[];
  answer: string | string[];
}

// 服务端返回的是 cardId (1-78)，前端用这个映射显示对应的塔罗牌 PNG 文件名
const CARD_IMAGES: Record<number, string> = {
  1: '00-TheFool', 2: '01-TheMagician', 3: '02-TheHighPriestess', 4: '03-TheEmpress',
  5: '04-TheEmperor', 6: '05-TheHierophant', 7: '06-TheLovers', 8: '07-TheChariot',
  9: '08-Strength', 10: '09-TheHermit', 11: '10-WheelOfFortune', 12: '11-Justice',
  13: '12-TheHangedMan', 14: '13-Death', 15: '14-Temperance', 16: '15-TheDevil',
  17: '16-TheTower', 18: '17-TheStar', 19: '18-TheMoon', 20: '19-TheSun',
  21: '20-Judgement', 22: '21-TheWorld',
  23: 'Wands01', 24: 'Wands02', 25: 'Wands03', 26: 'Wands04',
  27: 'Wands05', 28: 'Wands06', 29: 'Wands07', 30: 'Wands08',
  31: 'Wands09', 32: 'Wands10', 33: 'Wands11', 34: 'Wands12',
  35: 'Wands13', 36: 'Wands14',
  37: 'Cups01', 38: 'Cups02', 39: 'Cups03', 40: 'Cups04',
  41: 'Cups05', 42: 'Cups06', 43: 'Cups07', 44: 'Cups08',
  45: 'Cups09', 46: 'Cups10', 47: 'Cups11', 48: 'Cups12',
  49: 'Cups13', 50: 'Cups14',
  51: 'Swords01', 52: 'Swords02', 53: 'Swords03', 54: 'Swords04',
  55: 'Swords05', 56: 'Swords06', 57: 'Swords07', 58: 'Swords08',
  59: 'Swords09', 60: 'Swords10', 61: 'Swords11', 62: 'Swords12',
  63: 'Swords13', 64: 'Swords14',
  65: 'Pentacles01', 66: 'Pentacles02', 67: 'Pentacles03', 68: 'Pentacles04',
  69: 'Pentacles05', 70: 'Pentacles06', 71: 'Pentacles07', 72: 'Pentacles08',
  73: 'Pentacles09', 74: 'Pentacles10', 75: 'Pentacles11', 76: 'Pentacles12',
  77: 'Pentacles13', 78: 'Pentacles14',
};

const POSITION_LABELS = ['现在 / 核心', '过去 / 根源', '未来 / 发展', '内在 / 自我', '建议 / 结果'];

const MAX_CLARIFY_ROUNDS = 5;

export default function TarotPage() {
  const [question, setQuestion] = useState('');
  const [phase, setPhase] = useState<'ask' | 'clarify' | 'select' | 'result'>('ask');
  const [deck, setDeck] = useState<number[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [flippedIds, setFlippedIds] = useState<number[]>([]);
  const [reversedMap, setReversedMap] = useState<Record<number, boolean>>({});

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{
    spread: Card[];
    interpretation: Interpretation;
  } | null>(null);

  // 追问状态
  const [clarifyHistory, setClarifyHistory] = useState<ClarifyTurn[]>([]);
  const [clarifyQ, setClarifyQ] = useState<{ question: string; type: ClarifyType; options: string[]; round: number } | null>(null);

  // ---------- 追问 ----------
  const callClarify = async (history: ClarifyTurn[]): Promise<{
    infoComplete: boolean;
    question: string;
    type: ClarifyType;
    options: string[];
    round: number;
  }> => {
    const response = await fetch('/api/tarot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'clarify',
        question: question.trim(),
        history,
      }),
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.error || '追问失败');
    return {
      infoComplete: Boolean(data.infoComplete),
      question: String(data.question || '').trim(),
      type: (data.type || 'single') as ClarifyType,
      options: Array.isArray(data.options) ? data.options : [],
      round: data.round || history.length + 1,
    };
  };

  const handleStartClarify = async () => {
    if (!question.trim()) {
      setError('请输入你想问的问题');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const r = await callClarify([]);
      if (r.infoComplete) {
        // 第一题就够，跳过追问
        await proceedToShuffle([]);
      } else {
        setClarifyQ({ question: r.question, type: r.type, options: r.options, round: r.round });
        setClarifyHistory([]);
        setPhase('clarify');
      }
    } catch (e: any) {
      setError(e.message || '追问失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerClarify = async (answer: string | string[]) => {
    if (!clarifyQ) return;
    const turn: ClarifyTurn = {
      question: clarifyQ.question,
      type: clarifyQ.type,
      options: clarifyQ.options,
      answer,
    };
    const newHistory = [...clarifyHistory, turn];
    setClarifyHistory(newHistory);
    setClarifyQ(null);
    setLoading(true);
    setError('');
    try {
      const r = await callClarify(newHistory);
      if (r.infoComplete || newHistory.length >= MAX_CLARIFY_ROUNDS) {
        await proceedToShuffle(newHistory);
      } else {
        setClarifyQ({ question: r.question, type: r.type, options: r.options, round: r.round });
      }
    } catch (e: any) {
      setError(e.message || '追问失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleSkipClarify = async () => {
    setClarifyQ(null);
    await proceedToShuffle(clarifyHistory);
  };

  const proceedToShuffle = async (history: ClarifyTurn[]) => {
    setLoading(true);
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
        setFlippedIds([]);
        setReversedMap({});
        setClueHistoryPersist(history); // 存起来给解牌用
        setPhase('select');
      } else {
        setError(data.error || '洗牌失败，请重试');
        setPhase('ask');
      }
    } catch {
      setError('网络错误，请重试');
      setPhase('ask');
    } finally {
      setLoading(false);
    }
  };

  // 追问历史跨阶段保留（洗牌时持久化、解牌时用）
  const [persistedClarifyHistory, setPersistedClarifyHistory] = useState<ClarifyTurn[]>([]);
  const setClueHistoryPersist = (h: ClarifyTurn[]) => setPersistedClarifyHistory(h);

  // ---------- 翻牌 ----------
  const toggleCard = (cardId: number) => {
    const isFlipped = flippedIds.includes(cardId);
    const isSelected = selectedIds.includes(cardId);
    if (isFlipped && isSelected) {
      setFlippedIds((prev) => prev.filter((id) => id !== cardId));
      setSelectedIds((prev) => prev.filter((id) => id !== cardId));
    } else if (!isFlipped) {
      if (selectedIds.length >= 5) return;
      setFlippedIds((prev) => [...prev, cardId]);
      setSelectedIds((prev) => [...prev, cardId]);
      setReversedMap((prev) => ({ ...prev, [cardId]: Math.random() < 0.5 }));
    }
  };

  // ---------- 解牌 ----------
  const interpretCards = async () => {
    if (selectedIds.length !== 5) {
      setError('请选择正好 5 张牌');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const selectedCards = selectedIds.map((id) => ({
        cardId: id,
        reversed: Boolean(reversedMap[id]),
      }));

      const response = await fetch('/api/tarot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'interpret',
          question: question.trim(),
          selectedCards,
          history: persistedClarifyHistory, // 把追问历史给 AI
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
    } catch {
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
    setFlippedIds([]);
    setReversedMap({});
    setResult(null);
    setError('');
    setClarifyHistory([]);
    setClarifyQ(null);
    setPersistedClarifyHistory([]);
  };

  // ---------- 渲染 ----------
  return (
    <main className="min-h-screen bg-gradient-to-b from-purple-50 to-indigo-100 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6">
          <Link
            href="/"
            className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
          >
            ← 返回 FengBox 首页
          </Link>
        </div>

        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <span className="text-3xl">🔮</span>
            <h1 className="text-3xl font-bold text-gray-800">AI 塔罗占卜</h1>
          </div>
          <p className="text-gray-600">凭直觉翻开 5 张牌，AI 为你解读内心</p>
        </div>

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
              onClick={handleStartClarify}
              disabled={loading}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition"
            >
              {loading ? '⏳ AI 准备中...' : '🔮 开始占卜'}
            </button>

            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                ❌ {error}
              </div>
            )}
          </div>
        )}

        {/* 阶段 1.5：AI 追问 */}
        {phase === 'clarify' && clarifyQ && (
          <ClarifyView
            question={question}
            clarifyQ={clarifyQ}
            history={clarifyHistory}
            maxRounds={MAX_CLARIFY_ROUNDS}
            loading={loading}
            error={error}
            onAnswer={handleAnswerClarify}
            onSkip={handleSkipClarify}
          />
        )}

        {/* 阶段 2：选牌（翻牌即选） */}
        {phase === 'select' && (
          <div>
            <div className="bg-white rounded-xl shadow-md p-6 mb-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-sm text-gray-500">你的问题：</div>
                  <div className="text-gray-800 italic">「{question}」</div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-500">已翻</div>
                  <div className="text-2xl font-bold text-purple-600">
                    {selectedIds.length} / 5
                  </div>
                </div>
              </div>

              <div className="text-center text-sm text-purple-600 mb-3">
                {selectedIds.length < 5
                  ? `👆 凭直觉点击牌背翻开 ${5 - selectedIds.length} 张`
                  : '🎉 5 张牌已选好，可点同一张取消重选'}
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

              {error && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                  ❌ {error}
                </div>
              )}
            </div>

            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="grid grid-cols-8 sm:grid-cols-10 md:grid-cols-13 gap-2">
                {deck.map((cardId, idx) => {
                  const isFlipped = flippedIds.includes(cardId);
                  const selectOrder = selectedIds.indexOf(cardId) + 1;
                  const canFlip = isFlipped || selectedIds.length < 5;
                  return (
                    <FlipCard
                      key={idx}
                      cardId={cardId}
                      deckIndex={idx}
                      isFlipped={isFlipped}
                      isSelected={selectOrder > 0}
                      selectOrder={selectOrder}
                      reversed={Boolean(reversedMap[cardId])}
                      disabled={!canFlip}
                      onToggle={() => toggleCard(cardId)}
                    />
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

              {/* 5 张牌展示 — 用 selectedIds 做图片源（同翻牌） */}
              <div className="grid grid-cols-5 gap-2 mb-6">
                {selectedIds.map((cardId, i) => {
                  const reversed = Boolean(reversedMap[cardId]);
                  const cardName = result.spread[i]?.cardName || '';
                  const imgSrc = CARD_IMAGES[cardId]
                    ? `/tarot/${CARD_IMAGES[cardId]}.png`
                    : null;
                  return (
                    <div key={i} className="text-center">
                      <div className="relative aspect-[2/3] rounded-lg border-2 border-purple-400 bg-white overflow-hidden mb-1">
                        {imgSrc ? (
                          <img
                            src={imgSrc}
                            alt={cardName}
                            className={`w-full h-full object-cover ${reversed ? 'rotate-180' : ''}`}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-3xl">🃏</div>
                        )}
                        <div className="absolute bottom-1 right-1 text-[10px] bg-purple-100 px-1 rounded text-purple-700">
                          {reversed ? '逆位' : '正位'}
                        </div>
                      </div>
                      <div className="text-xs font-medium text-purple-800">
                        {cardName}
                      </div>
                      <div className="text-[10px] text-gray-500 mt-0.5">
                        {POSITION_LABELS[i]}
                      </div>
                    </div>
                  );
                })}
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

// ============================================================================
//                              追问阶段组件
// ============================================================================
function ClarifyView({
  question,
  clarifyQ,
  history,
  maxRounds,
  loading,
  error,
  onAnswer,
  onSkip,
}: {
  question: string;
  clarifyQ: { question: string; type: ClarifyType; options: string[]; round: number };
  history: ClarifyTurn[];
  maxRounds: number;
  loading: boolean;
  error: string;
  onAnswer: (a: string | string[]) => void;
  onSkip: () => void;
}) {
  // 当前题的临时选择（单选 string、多选 string[]）
  const [picked, setPicked] = useState<string>('');
  const [pickedMulti, setPickedMulti] = useState<string[]>([]);

  const submit = () => {
    if (clarifyQ.type === 'multi') {
      if (pickedMulti.length === 0) return;
      onAnswer(pickedMulti);
    } else {
      if (!picked) return;
      onAnswer(picked);
    }
    // 重置
    setPicked('');
    setPickedMulti([]);
  };

  const toggleMulti = (opt: string) => {
    setPickedMulti((prev) =>
      prev.includes(opt) ? prev.filter((o) => o !== opt) : [...prev, opt]
    );
  };

  const canSubmit =
    (clarifyQ.type === 'multi' && pickedMulti.length > 0) ||
    (clarifyQ.type !== 'multi' && picked.length > 0);

  const typeLabel = clarifyQ.type === 'single' ? '单选' : clarifyQ.type === 'multi' ? '多选' : '判断';

  return (
    <div className="bg-white rounded-xl shadow-md p-6">
      {/* 顶部信息 */}
      <div className="mb-4 pb-4 border-b border-gray-100">
        <div className="text-xs text-gray-500 mb-1">你的问题：</div>
        <div className="text-gray-800 italic mb-2">「{question}」</div>
        <div className="flex items-center justify-between text-xs text-purple-600">
          <span>🤔 AI 还在了解情况</span>
          <span>第 {clarifyQ.round} / {maxRounds} 轮</span>
        </div>
      </div>

      {/* 之前对话历史 */}
      {history.length > 0 && (
        <div className="mb-4 p-3 bg-purple-50 rounded-lg text-xs space-y-1.5">
          {history.map((h, i) => (
            <div key={i} className="text-purple-800">
              <div className="font-medium">问 {i + 1}：{h.question}</div>
              <div className="text-purple-600">
                → 答：{Array.isArray(h.answer) ? h.answer.join('、') : h.answer}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 当前题 */}
      {loading ? (
        <div className="py-12 text-center text-purple-600">
          <div className="text-3xl mb-2">🔮</div>
          <div>AI 思考中...</div>
        </div>
      ) : (
        <>
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded">
                {typeLabel}
              </span>
              <h3 className="font-semibold text-gray-800 flex-1">{clarifyQ.question}</h3>
            </div>

            <div className="space-y-2">
              {clarifyQ.options.map((opt, i) => {
                const isPicked =
                  clarifyQ.type === 'multi'
                    ? pickedMulti.includes(opt)
                    : picked === opt;
                return (
                  <button
                    key={i}
                    onClick={() => {
                      if (clarifyQ.type === 'multi') toggleMulti(opt);
                      else setPicked(opt);
                    }}
                    className={`w-full text-left px-4 py-3 rounded-lg border-2 transition ${
                      isPicked
                        ? 'border-purple-600 bg-purple-50 text-purple-900'
                        : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-sm">
                      {isPicked ? '●' : '○'} {opt}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {error && (
            <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
              ❌ {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={submit}
              disabled={!canSubmit}
              className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition"
            >
              回答 → 下一题
            </button>
            <button
              onClick={onSkip}
              className="px-4 py-3 border border-gray-300 hover:bg-gray-50 rounded-lg text-sm text-gray-700"
            >
              ✋ 已了解基本情况，开始洗牌占卜
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ============================================================================
//                              翻牌卡组件（复用上一版）
// ============================================================================
function FlipCard({
  cardId,
  deckIndex,
  isFlipped,
  isSelected,
  selectOrder,
  reversed,
  disabled,
  onToggle,
}: {
  cardId: number;
  deckIndex: number;
  isFlipped: boolean;
  isSelected: boolean;
  selectOrder: number;
  reversed: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  const imgSrc = CARD_IMAGES[cardId]
    ? `/tarot/${CARD_IMAGES[cardId]}.png`
    : null;

  return (
    <div
      className={`flip-card aspect-[2/3] ${isFlipped ? 'is-flipped' : ''}`}
      style={{
        opacity: disabled ? 0.4 : 1,
        pointerEvents: disabled ? 'none' : 'auto',
      }}
    >
      <button
        onClick={onToggle}
        disabled={disabled}
        className={`flip-card-inner relative w-full h-full rounded-lg ${isSelected ? 'shadow-xl' : ''}`}
        style={{ transformStyle: 'preserve-3d' }}
      >
        <div
          className="flip-card-face absolute inset-0 rounded-lg border-2 border-purple-300 bg-gradient-to-br from-purple-200 via-purple-300 to-indigo-400 flex flex-col items-center justify-center text-purple-800"
          style={{ backfaceVisibility: 'hidden' }}
        >
          <div className="text-3xl">🃏</div>
          <div className="text-[10px] mt-1 font-medium">{deckIndex + 1}</div>
          <div className="absolute inset-1 rounded border border-purple-400/40 pointer-events-none" />
        </div>
        <div
          className={`flip-card-face absolute inset-0 rounded-lg border-2 overflow-hidden ${
            isSelected ? 'border-purple-600 ring-2 ring-purple-400' : 'border-purple-400'
          }`}
          style={{
            backfaceVisibility: 'hidden',
            transform: `rotateY(180deg) ${reversed ? 'rotate(180deg)' : ''}`,
          }}
        >
          {imgSrc ? (
            <img src={imgSrc} alt={`card-${cardId}`} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-purple-100 text-3xl">🃏</div>
          )}
          {isSelected && (
            <div className="absolute top-1 right-1 w-6 h-6 bg-purple-600 text-white text-xs rounded-full flex items-center justify-center font-bold shadow">
              {selectOrder}
            </div>
          )}
        </div>
      </button>
      <style jsx>{`
        .flip-card { perspective: 600px; }
        .flip-card-inner {
          transition: transform 0.6s cubic-bezier(0.4, 0.0, 0.2, 1);
          transform-style: preserve-3d;
        }
        .flip-card.is-flipped .flip-card-inner { transform: rotateY(180deg); }
      `}</style>
    </div>
  );
}