'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const SUGGESTIONS = [
  '65 寸电视 5000 元以内',
  'iPhone 性价比款',
  '新手入门单反相机',
  '学生党笔记本电脑',
  '空气炸锅 推荐',
  '无线降噪耳机',
];

const SCENARIOS = [
  { value: 'student', emoji: '🎓', label: '学生' },
  { value: 'home',    emoji: '🏠', label: '家用' },
  { value: 'office',  emoji: '💼', label: '办公' },
  { value: 'gaming',  emoji: '🎮', label: '游戏' },
  { value: 'pro',     emoji: '🎨', label: '专业' },
];

// 平台搜索链接生成器
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

type ModelRec = {
  name: string;
  price: string;
  pros: string[];
  cons: string[];
  bestFor: string;
};

type ApiResult = {
  success: boolean;
  product: string;
  scenario: string | null;
  budget: number | null;
  isWhitelist: boolean;
  guide: string;
  parameters: Array<{ name: string; importance: string; tip: string }>;
  priceRange: { low: number; high: number; note: string };
  brands: Array<{ name: string; reason: string; level: string }>;
  tips: string[];
  models?: ModelRec[];
};

export default function ShoppingPage() {
  // 输入
  const [product, setProduct] = useState('');
  const [scenario, setScenario] = useState<string>('');
  const [budgetEnabled, setBudgetEnabled] = useState(false);
  const [budget, setBudget] = useState<string>('');

  // 白名单状态
  const [isWhitelist, setIsWhitelist] = useState<boolean>(false);
  const [loggedIn, setLoggedIn] = useState<boolean>(false);

  // 会员入口弹窗
  const [showGateModal, setShowGateModal] = useState(false);

  // 结果
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<ApiResult | null>(null);

  // 拉白名单
  useEffect(() => {
    fetch('/api/me/whitelist', { method: 'POST' })
      .then((r) => r.json())
      .then((d: { loggedIn: boolean; isWhitelist: boolean }) => {
        setLoggedIn(Boolean(d.loggedIn));
        setIsWhitelist(Boolean(d.isWhitelist));
      })
      .catch(() => {
        setLoggedIn(false);
        setIsWhitelist(false);
      });
  }, []);

  // ---------- 提交 ----------
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
        body: JSON.stringify({
          product: product.trim(),
          scenario: scenario || undefined,
          budget: budgetEnabled && budget ? parseInt(budget) : null,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setResult(data as ApiResult);
      } else {
        setError(data.error || '出错了，请重试');
      }
    } catch {
      setError('网络错误，请重试');
    } finally {
      setLoading(false);
    }
  };

  const applySuggestion = (s: string) => setProduct(s);

  const platformLinks = result ? buildPlatformLinks(result.product) : [];

  // ---------- 渲染 ----------
  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
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
          {/* 商品 */}
          <label className="block text-sm font-medium text-gray-700 mb-2">
            你想买什么？ <span className="text-red-500">*</span>
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
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition whitespace-nowrap"
            >
              {loading ? '⏳ 分析中...' : '🛍️ 开始导购'}
            </button>
          </div>

          {/* 推荐 chips */}
          <div className="flex flex-wrap gap-2 mb-5">
            <span className="text-xs text-gray-500 self-center">试试：</span>
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => applySuggestion(s)}
                className="px-3 py-1 text-sm bg-blue-50 hover:bg-blue-100 rounded-full text-blue-700"
              >
                {s}
              </button>
            ))}
          </div>

          {/* 场景选择 */}
          <div className="mb-4">
            <div className="text-sm font-medium text-gray-700 mb-2">📍 使用场景</div>
            <div className="flex flex-wrap gap-2">
              {SCENARIOS.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => setScenario(scenario === s.value ? '' : s.value)}
                  className={`px-3 py-1.5 text-sm rounded-lg border transition ${
                    scenario === s.value
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span className="mr-1">{s.emoji}</span>{s.label}
                </button>
              ))}
            </div>
          </div>

          {/* 预算上限 */}
          <div>
            <div className="flex items-center gap-3 mb-2">
              <label className="text-sm font-medium text-gray-700">💰 预算上限</label>
              <label className="flex items-center gap-1 text-xs text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={budgetEnabled}
                  onChange={(e) => setBudgetEnabled(e.target.checked)}
                  className="w-4 h-4 text-blue-600"
                />
                <span>设置预算上限</span>
              </label>
            </div>
            {budgetEnabled ? (
              <div className="flex items-center gap-2">
                <span className="text-gray-600">¥</span>
                <input
                  type="number"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  placeholder="例如 5000"
                  className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
            ) : (
              <div className="text-xs text-gray-500">
                未设置预算，AI 会根据常识给常见价位区间
              </div>
            )}
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
            {/* AI 时滞提示 — 对所有用户都展示 */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 flex items-start gap-2">
              <span>⚠️</span>
              <span>
                AI 推荐基于训练数据，型号 / 价格可能不是最新。
                购买前请用下方平台搜索确认实时信息。
              </span>
            </div>

            {/* 1. 购买攻略 */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-3 flex items-center gap-2">
                📋 购买攻略
              </h2>
              <div className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                {result.guide}
              </div>
            </div>

            {/* 2. 参数详解 */}
            {result.parameters.length > 0 && (
              <div className="bg-white rounded-xl shadow-md p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-3 flex items-center gap-2">
                  🔧 参数详解
                </h2>
                <p className="text-sm text-gray-500 mb-4">选购这类商品要看这些关键参数：</p>
                <div className="space-y-3">
                  {result.parameters.map((p, i) => (
                    <div key={i} className="border-l-4 border-blue-400 bg-blue-50/40 rounded-r-lg p-3">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="font-semibold text-gray-900">{p.name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          p.importance === '核心' ? 'bg-red-100 text-red-700' :
                          p.importance === '重要' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {p.importance}
                        </span>
                      </div>
                      {p.tip && (
                        <div className="text-sm text-gray-700">{p.tip}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 3+4+5. 参考价位 / 推荐品牌 / 具体型号 — 全部会员专属 */}
            {result.isWhitelist ? (
              <>
                {/* 3. 参考价位 */}
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
                    <div className="text-sm text-gray-600">{result.priceRange.note}</div>
                  </div>
                )}

                {/* 4. 品牌推荐 */}
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
                            <span className={`text-xs px-2 py-0.5 rounded ${LEVEL_COLOR[b.level] || 'bg-gray-100 text-gray-700'}`}>
                              {b.level}
                            </span>
                          </div>
                          <div className="text-sm text-gray-600">{b.reason}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 5. 具体型号推荐 */}
                {result.models && result.models.length > 0 && (
                  <div className="bg-white rounded-xl shadow-md p-6">
                    <div className="flex items-center gap-2 mb-1">
                      <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        🌟 具体型号推荐
                      </h2>
                      <span className="text-xs px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                        会员专属
                      </span>
                    </div>
                    <p className="text-sm text-gray-500 mb-4">
                      基于你的场景 / 预算筛选的真实在售型号（含优缺点对比）：
                    </p>
                    <div className="space-y-4">
                      {result.models.map((m, i) => (
                        <div key={i} className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition">
                          <div className="flex items-start justify-between gap-3 mb-3">
                            <div className="font-bold text-gray-900 flex-1">{m.name}</div>
                            <div className="text-sm font-semibold text-blue-600 whitespace-nowrap">{m.price}</div>
                          </div>
                          {m.pros.length > 0 && (
                            <div className="mb-2">
                              <div className="text-xs font-semibold text-green-700 mb-1">✅ 优点</div>
                              <ul className="text-sm text-gray-700 space-y-1">
                                {m.pros.map((p, j) => (
                                  <li key={j} className="flex items-start gap-1.5">
                                    <span className="text-green-500 shrink-0">•</span>
                                    <span>{p}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {m.cons.length > 0 && (
                            <div className="mb-2">
                              <div className="text-xs font-semibold text-red-700 mb-1">⚠️ 缺点</div>
                              <ul className="text-sm text-gray-700 space-y-1">
                                {m.cons.map((c, j) => (
                                  <li key={j} className="flex items-start gap-1.5">
                                    <span className="text-red-500 shrink-0">•</span>
                                    <span>{c}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {m.bestFor && (
                            <div className="mt-2 px-2 py-1.5 bg-blue-50 border border-blue-100 rounded text-xs text-blue-800">
                              👤 适合：{m.bestFor}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              /* 统一会员引导卡（普通用户看到这一张） */
              <div className="bg-gradient-to-br from-amber-50 via-yellow-50 to-amber-100 rounded-xl shadow-md p-8 border border-amber-200 text-center">
                <div className="text-5xl mb-3">🔒</div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">
                  价格 / 品牌 / 型号分析 — 会员专属
                </h2>
                <p className="text-sm text-gray-700 mb-5 leading-relaxed max-w-md mx-auto">
                  想看 <span className="font-semibold">具体价位区间</span>、<span className="font-semibold">推荐品牌</span>，以及 <span className="font-semibold">含优缺点对比的具体型号</span>？
                  成为白名单 / 会员用户即可解锁全部 3 项深度分析。
                </p>
                <button
                  onClick={() => setShowGateModal(true)}
                  className="bg-amber-500 hover:bg-amber-600 text-white font-semibold py-3 px-8 rounded-lg transition"
                >
                  🌟 解锁会员专属功能
                </button>
              </div>
            )}

            {/* 6. 避坑提示 */}
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

            {/* 7. 平台跳转 */}
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
              onClick={() => setResult(null)}
              className="w-full text-sm text-blue-600 hover:text-blue-700 font-medium py-3"
            >
              ← 换商品重新查询
            </button>
          </div>
        )}
      </div>

      {/* 会员提示弹窗 */}
      {showGateModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
          onClick={() => setShowGateModal(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center">
              <div className="text-4xl mb-3">🔒</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">需要成为会员 / 白名单用户</h3>
              <p className="text-sm text-gray-600 mb-5 leading-relaxed">
                &ldquo;具体型号推荐&rdquo;是 FengBox 的会员 / 白名单专属功能。
                {loggedIn
                  ? '请联系管理员申请开通白名单后即可使用。'
                  : '请先登录账号，再联系管理员申请白名单开通。'}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowGateModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 hover:bg-gray-50 rounded-lg text-sm text-gray-700"
                >
                  关闭
                </button>
                {!loggedIn && (
                  <Link
                    href="/auth/login"
                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm text-center"
                  >
                    去登录
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}