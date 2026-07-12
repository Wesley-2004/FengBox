'use client';

import { useState } from 'react';
import Link from 'next/link';

const SUGGESTIONS = [
  '65 寸电视 5000 元以内',
  'iPhone 性价比款',
  '新手入门单反相机',
  '学生党笔记本电脑',
  '空气炸锅 推荐',
  '无线降噪耳机',
];

// 平台搜索链接生成器（公开搜索 URL，不需要 API）
function buildPlatformLinks(product: string) {
  const q = encodeURIComponent(product.trim());
  return [
    {
      name: '拼多多',
      emoji: '🟠',
      color: 'bg-orange-50 hover:bg-orange-100 text-orange-700 border-orange-200',
      url: `https://mobile.yangkeduo.com/search_result.html?search_key=${q}`,
    },
    {
      name: '京东',
      emoji: '🔴',
      color: 'bg-red-50 hover:bg-red-100 text-red-700 border-red-200',
      url: `https://search.jd.com/Search?keyword=${q}&enc=utf-8`,
    },
    {
      name: '淘宝',
      emoji: '🟡',
      color: 'bg-yellow-50 hover:bg-yellow-100 text-yellow-700 border-yellow-200',
      url: `https://s.taobao.com/search?q=${q}`,
    },
    {
      name: '什么值得买',
      emoji: '🟢',
      color: 'bg-green-50 hover:bg-green-100 text-green-700 border-green-200',
      url: `https://search.smzdm.com/?c=home&s=${q}`,
    },
  ];
}

const LEVEL_COLOR: Record<string, string> = {
  '入门': 'bg-blue-100 text-blue-700',
  '主流': 'bg-green-100 text-green-700',
  '高端': 'bg-purple-100 text-purple-700',
  '旗舰': 'bg-red-100 text-red-700',
};

export default function ShoppingPage() {
  const [product, setProduct] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{
    guide: string;
    priceRange: { low: number; high: number; note: string };
    brands: Array<{ name: string; reason: string; level: string }>;
    tips: string[];
    product: string;
  } | null>(null);

  const handleSubmit = async () => {
    if (!product.trim()) {
      setError('请描述你想买什么');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch('/api/shopping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product: product.trim() }),
      });

      const data = await response.json();

      if (data.success) {
        setResult({
          guide: data.guide,
          priceRange: data.priceRange,
          brands: data.brands,
          tips: data.tips,
          product: data.product,
        });
      } else {
        setError(data.error || '出错了，请重试');
      }
    } catch (err) {
      setError('网络错误，请重试');
    } finally {
      setLoading(false);
    }
  };

  const useSuggestion = (s: string) => {
    setProduct(s);
  };

  const platformLinks = result ? buildPlatformLinks(result.product) : [];

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 to-indigo-100 py-8 px-4">
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
            <span className="text-3xl">🛒</span>
            <h1 className="text-3xl font-bold text-gray-800">AI 商品导购</h1>
          </div>
          <p className="text-gray-600">想买什么？AI 帮你看参数、避坑、跳平台比价</p>
        </div>

        {/* 输入区 */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            你想买什么？
          </label>
          <div className="flex gap-3 mb-3">
            <input
              type="text"
              value={product}
              onChange={(e) => setProduct(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              placeholder="例如：65 寸电视 5000 元以内、iPhone 性价比款"
              className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition"
            >
              {loading ? '⏳ 分析中...' : '🛍️ 开始导购'}
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="text-xs text-gray-500 self-center">试试：</span>
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => useSuggestion(s)}
                className="px-3 py-1 text-sm bg-blue-50 hover:bg-blue-100 rounded-full text-blue-700"
              >
                {s}
              </button>
            ))}
          </div>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              ❌ {error}
            </div>
          )}
        </div>

        {/* 结果区 */}
        {result && (
          <div className="space-y-4">
            {/* 1. 购买攻略 */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-3 flex items-center gap-2">
                📋 购买攻略
              </h2>
              <div className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                {result.guide}
              </div>
            </div>

            {/* 2. 参考价位 */}
            {result.priceRange.low > 0 && (
              <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-xl shadow-md p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-3 flex items-center gap-2">
                  💰 参考价位
                </h2>
                <div className="flex items-baseline gap-2 mb-2">
                  <span className="text-3xl font-bold text-orange-600">
                    ¥{result.priceRange.low.toLocaleString()}
                  </span>
                  <span className="text-gray-500">~</span>
                  <span className="text-3xl font-bold text-orange-600">
                    ¥{result.priceRange.high.toLocaleString()}
                  </span>
                </div>
                <div className="text-sm text-gray-600">
                  {result.priceRange.note}
                </div>
                <div className="mt-3 text-xs text-gray-500 bg-white/60 rounded p-2">
                  ⚠️ 参考价位基于历史数据，实时价格请到下方平台查看
                </div>
              </div>
            )}

            {/* 3. 品牌推荐 */}
            {result.brands.length > 0 && (
              <div className="bg-white rounded-xl shadow-md p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-3 flex items-center gap-2">
                  🏷️ 推荐品牌 / 系列
                </h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {result.brands.map((b, i) => (
                    <div
                      key={i}
                      className="p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-sm transition"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <div className="font-bold text-gray-800">{b.name}</div>
                        <span
                          className={`text-xs px-2 py-0.5 rounded ${
                            LEVEL_COLOR[b.level] || 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {b.level}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">{b.reason}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 4. 避坑提示 */}
            {result.tips.length > 0 && (
              <div className="bg-white rounded-xl shadow-md p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-3 flex items-center gap-2">
                  💡 避坑提示
                </h2>
                <ul className="space-y-2">
                  {result.tips.map((tip, i) => (
                    <li key={i} className="flex items-start gap-2 text-gray-700">
                      <span className="flex-shrink-0 text-green-500">✓</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* 5. 平台跳转 */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-3 flex items-center gap-2">
                🔗 跳转平台比价
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                点击下方按钮，直接跳转到对应平台搜索「{result.product}」：
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {platformLinks.map((p) => (
                  <a
                    key={p.name}
                    href={p.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex items-center justify-center gap-2 p-4 rounded-lg border-2 font-semibold transition ${p.color}`}
                  >
                    <span className="text-2xl">{p.emoji}</span>
                    <span>去 {p.name} 搜索</span>
                    <span className="text-xs">↗</span>
                  </a>
                ))}
              </div>
            </div>

            <button
              onClick={() => {
                setResult(null);
              }}
              className="w-full text-sm text-blue-600 hover:text-blue-700 font-medium py-3"
            >
              ← 换商品重新查询
            </button>
          </div>
        )}
      </div>
    </main>
  );
}