'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

// ---------- 场景预设 ----------
const SCENES = [
  { value: 'class',    emoji: '🏫', label: '班级口号' },
  { value: 'sports',   emoji: '🏃', label: '运动会' },
  { value: 'ad',       emoji: '📺', label: '广告语' },
  { value: 'product',  emoji: '🛍', label: '产品宣传' },
  { value: 'company',  emoji: '🏢', label: '企业文化' },
  { value: 'festival', emoji: '🎉', label: '节庆活动' },
  { value: 'other',    emoji: '✨', label: '其他' },
];

const CHAR_OPTIONS = [
  { value: 'free',   label: '不限' },
  { value: '4',      label: '4 字' },
  { value: '7',      label: '7 字' },
  { value: '8',      label: '8 字' },
  { value: '10-15',  label: '10-15 字' },
];

const SUGGESTIONS = ['团结拼搏', '高三冲刺', '青春奋斗', '新品上市', '双十一', '年终冲刺'];

// ---------- 类型 ----------
type SloganItem = {
  text: string;
  score: number;
  rhyme: string;
  charCount: number;
  scene: string;
  tip?: string;
};

type SloganApiResult = {
  success: boolean;
  keywords: string;
  scene: string;
  sceneLabel: string;
  count: number;
  charPerLine: string;
  rhyme: boolean;
  slogans: SloganItem[];
  recommended: string[];
};

const FAV_KEY = 'fengbox:slogan:favorites:v1';

// ---------- 主组件 ----------
export default function SloganPage() {
  // 输入
  const [keywords, setKeywords] = useState('');
  const [scene, setScene] = useState<string>('class');
  const [count, setCount] = useState(5);
  const [charPerLine, setCharPerLine] = useState('free');
  const [rhyme, setRhyme] = useState(true);

  // 状态
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<SloganApiResult | null>(null);

  // 收藏（sessionStorage）—— 用 lazy init 读，避免 effect 内 setState
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const raw = sessionStorage.getItem(FAV_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  useEffect(() => {
    try { sessionStorage.setItem(FAV_KEY, JSON.stringify(favorites)); } catch {}
  }, [favorites]);

  const isFav = (text: string) => favorites.includes(text);
  const toggleFav = (text: string) => {
    setFavorites((prev) =>
      prev.includes(text) ? prev.filter((t) => t !== text) : [...prev, text]
    );
  };
  const clearFavs = () => setFavorites([]);

  // ---------- 提交 ----------
  const handleSubmit = async () => {
    if (!keywords.trim()) {
      setError('请输入关键词');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch('/api/slogan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keywords: keywords.trim(),
          scene,
          count,
          charPerLine,
          rhyme,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setResult(data as SloganApiResult);
      } else {
        setError(data.error || '出错了，请重试');
      }
    } catch {
      setError('网络错误，请重试');
    } finally {
      setLoading(false);
    }
  };

  const applySuggestion = (s: string) => setKeywords(s);

  // ---------- 渲染 ----------
  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
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
            <span className="text-3xl">📢</span>
            <h1 className="text-3xl font-bold text-gray-800">AI 口号生成</h1>
          </div>
          <p className="text-gray-600">选场景 + 输入关键词，AI 帮你写出朗朗上口的好口号</p>
        </div>

        {/* 输入区 */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          {/* 场景 */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              场景
            </label>
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
              {SCENES.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setScene(s.value)}
                  className={`px-2 py-2 text-xs sm:text-sm rounded-lg border font-medium transition ${
                    scene === s.value
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <span className="mr-1">{s.emoji}</span>{s.label}
                </button>
              ))}
            </div>
          </div>

          {/* 关键词 */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              关键词 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              placeholder="例如：团结、拼搏、班级、高三"
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="text-xs text-gray-500 self-center">试试：</span>
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => applySuggestion(s)}
                  className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-full text-gray-700"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          {/* 参数配置 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">句数</label>
              <input
                type="number"
                value={count}
                onChange={(e) => setCount(parseInt(e.target.value) || 5)}
                min={1}
                max={20}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">每句字数</label>
              <select
                value={charPerLine}
                onChange={(e) => setCharPerLine(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {CHAR_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">押韵</label>
              <label className="flex items-center h-full p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={rhyme}
                  onChange={(e) => setRhyme(e.target.checked)}
                  className="w-4 h-4 text-blue-600 mr-2"
                />
                <span className="text-sm">要求押韵</span>
              </label>
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition"
          >
            {loading ? '⏳ AI 创作中...' : '🚀 生成口号'}
          </button>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              ❌ {error}
            </div>
          )}
        </div>

        {/* 结果区 */}
        {result && (
          <div className="bg-white rounded-xl shadow-md p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-800">
                  ✨ 基于「{result.keywords}」生成的
                  <span className="text-blue-600 mx-1">{result.sceneLabel}</span>
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  共 {result.slogans.length} 句{result.rhyme && ' · 押韵'}
                  {result.charPerLine !== 'free' && ` · 每句 ${result.charPerLine} 字`}
                </p>
              </div>
              <button
                onClick={() => navigator.clipboard.writeText(result.slogans.map((s) => s.text).join('\n'))}
                className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-sm font-medium whitespace-nowrap"
              >
                📋 复制全部
              </button>
            </div>

            {/* AI 精选推荐 */}
            {result.recommended && result.recommended.length > 0 && (
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="text-xs font-semibold text-amber-800 mb-1">🌟 AI 精选</div>
                <div className="flex flex-wrap gap-2">
                  {result.recommended.map((t, i) => (
                    <span key={i} className="px-3 py-1 bg-white border border-amber-300 rounded text-sm text-amber-900 font-medium">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-3">
              {result.slogans.map((s, i) => (
                <SloganCard
                  key={i}
                  index={i}
                  slogan={s}
                  isFav={isFav(s.text)}
                  onToggleFav={() => toggleFav(s.text)}
                  highlighted={result.recommended.includes(s.text)}
                />
              ))}
            </div>

            <button
              onClick={() => setResult(null)}
              className="mt-4 text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              ← 重新生成
            </button>
          </div>
        )}

        {/* 收藏夹 */}
        {favorites.length > 0 && (
          <div className="bg-white rounded-xl shadow-md p-6 mb-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-800">
                ❤️ 我的收藏 <span className="text-sm text-gray-500">({favorites.length})</span>
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={() => navigator.clipboard.writeText(favorites.join('\n'))}
                  className="px-3 py-1 text-sm border border-gray-300 hover:bg-gray-50 rounded text-gray-700"
                >
                  📋 复制
                </button>
                <button
                  onClick={clearFavs}
                  className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded"
                >
                  清空
                </button>
              </div>
            </div>
            <ul className="space-y-2">
              {favorites.map((t, i) => (
                <li key={i} className="flex items-start gap-2 p-3 bg-pink-50 border border-pink-100 rounded-lg text-gray-800">
                  <span className="flex-1">{t}</span>
                  <button
                    onClick={() => toggleFav(t)}
                    className="text-pink-500 hover:text-pink-700 text-sm shrink-0"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-gray-400">* 收藏仅保存在当前浏览器，关闭页面即清除。</p>
          </div>
        )}
      </div>
    </main>
  );
}

// ---------- 子组件 ----------
function SloganCard({
  index,
  slogan,
  isFav,
  onToggleFav,
  highlighted,
}: {
  index: number;
  slogan: SloganItem;
  isFav: boolean;
  onToggleFav: () => void;
  highlighted: boolean;
}) {
  const [copied, setCopied] = useState(false);

  const copyOne = async () => {
    try {
      await navigator.clipboard.writeText(slogan.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  };

  const stars = '⭐'.repeat(Math.max(1, Math.min(5, slogan.score)));
  const showRhyme = slogan.rhyme && slogan.rhyme !== 'free' && slogan.rhyme !== 'none';

  return (
    <div
      className={`p-4 rounded-lg border transition ${
        highlighted
          ? 'bg-gradient-to-r from-amber-50 to-yellow-50 border-amber-300'
          : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-100'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
          {index + 1}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-yellow-600 text-sm">{stars}</span>
            <span className="text-xs px-2 py-0.5 bg-white/70 text-gray-700 rounded">
              📏 {slogan.charCount} 字
            </span>
            {showRhyme && (
              <span className="text-xs px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded">
                🔁 押 {slogan.rhyme}
              </span>
            )}
            {highlighted && (
              <span className="text-xs px-2 py-0.5 bg-amber-200 text-amber-900 rounded font-medium">
                🌟 精选
              </span>
            )}
          </div>
          <div className="text-gray-800 font-medium text-lg leading-relaxed">
            {slogan.text}
          </div>
          {slogan.tip && (
            <div className="mt-1.5 text-xs text-gray-500 italic">
              💡 {slogan.tip}
            </div>
          )}
        </div>
        <div className="flex flex-col gap-1 shrink-0">
          <button
            onClick={copyOne}
            className="px-2 py-1 text-xs border border-gray-300 hover:bg-white rounded text-gray-700"
          >
            {copied ? '✅' : '📋'}
          </button>
          <button
            onClick={onToggleFav}
            className={`px-2 py-1 text-xs border rounded ${
              isFav
                ? 'bg-pink-100 border-pink-300 text-pink-700'
                : 'border-gray-300 hover:bg-white text-gray-500'
            }`}
          >
            {isFav ? '❤️' : '🤍'}
          </button>
        </div>
      </div>
    </div>
  );
}