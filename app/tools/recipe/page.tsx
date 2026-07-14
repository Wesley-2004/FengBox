'use client';

import { useState } from 'react';
import Link from 'next/link';

// ---------- 类型 ----------
type IngredientCategory = 'main' | 'seasoning';

interface Ingredient {
  name: string;
  amount: string;
  note?: string;
  category?: IngredientCategory;
}

interface Step {
  text: string;
  duration?: string;
  tip?: string;
}

interface Dish {
  id: string;
  name: string;
  mainIngredient: string;
  cookTime: string;
  difficulty: string;
  tags: string[];
  servings?: string;
  kcalPerServing?: number;
  ingredients?: Ingredient[];
  stepsRich?: Step[];
  // 兼容旧字段
  otherIngredients?: string[];
  steps?: string[];
}

// 推荐食材 chip
const SUGGESTIONS = ['猪肉', '鸡肉', '鸡蛋', '土豆', '西红柿', '豆腐', '白菜'];

const SERVINGS_OPTIONS = [1, 2, 3, 4];

// ---------- 主组件 ----------
export default function RecipePage() {
  // 输入
  const [ingredients, setIngredients] = useState('');
  const [servings, setServings] = useState<number>(2);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // 结果
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [searchedIngredients, setSearchedIngredients] = useState('');
  const [searchedServings, setSearchedServings] = useState<number>(2);
  const [selectedDish, setSelectedDish] = useState<Dish | null>(null);
  const [copiedDetail, setCopiedDetail] = useState(false);

  // ---------- 提交 ----------
  const handleSubmit = async () => {
    if (!ingredients.trim()) {
      setError('请输入食材');
      return;
    }

    setLoading(true);
    setError('');
    setDishes([]);
    setSelectedDish(null);

    try {
      const response = await fetch('/api/recipe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ingredients: ingredients.trim(),
          servings,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setDishes(data.dishes);
        setSearchedIngredients(data.ingredients);
        setSearchedServings(data.servings ?? servings);
      } else {
        setError(data.error || '出错了，请重试');
      }
    } catch {
      setError('网络错误，请重试');
    } finally {
      setLoading(false);
    }
  };

  const applySuggestion = (s: string) => setIngredients(s);

  const getDifficultyColor = (diff: string) => {
    if (diff.includes('简单')) return 'bg-green-100 text-green-800';
    if (diff.includes('困难') || diff.includes('难')) return 'bg-red-100 text-red-800';
    return 'bg-yellow-100 text-yellow-800';
  };

  const handleCopyDetail = async () => {
    if (!selectedDish) return;
    const text = buildDishCopyText(selectedDish);
    try {
      await navigator.clipboard.writeText(text);
      setCopiedDetail(true);
      setTimeout(() => setCopiedDetail(false), 2000);
    } catch {
      setCopiedDetail(false);
    }
  };

  // ---------- 渲染 ----------
  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        {/* 返回链接 */}
        {/* 标题 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <span className="text-3xl">🍳</span>
            <h1 className="text-3xl font-bold text-gray-800">AI 菜谱生成</h1>
          </div>
          <p className="text-gray-600">输入食材，AI 推荐多道家常菜的详细做法</p>
        </div>

        {/* 输入区 */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          {/* 食材文本 */}
          <label className="block text-sm font-medium text-gray-700 mb-2">
            你有什么食材？
          </label>
          <div className="flex gap-3 mb-3">
            <input
              type="text"
              value={ingredients}
              onChange={(e) => setIngredients(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              placeholder="例如：猪肉、鸡蛋、西红柿"
              className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition whitespace-nowrap"
            >
              {loading ? '⏳ 生成中...' : '🍽️ 生成菜谱'}
            </button>
          </div>

          {/* 推荐食材 + 份数（同一行） */}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-xs text-gray-500">试试：</span>
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

            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">份数：</span>
              {SERVINGS_OPTIONS.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setServings(n)}
                  className={`w-9 h-9 text-sm rounded-lg border font-medium transition ${
                    servings === n
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {n}
                </button>
              ))}
              <span className="text-xs text-gray-500">人份</span>
            </div>
          </div>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              ❌ {error}
            </div>
          )}
        </div>

        {/* 菜谱卡片墙 */}
        {dishes.length > 0 && (
          <div>
            <div className="mb-4 text-sm text-gray-600">
              基于 <strong>「{searchedIngredients}」</strong>（{searchedServings} 人份）找到 {dishes.length} 道家常菜：
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {dishes.map((dish) => (
                <button
                  key={dish.id}
                  onClick={() => setSelectedDish(dish)}
                  className="text-left bg-white rounded-xl shadow-md hover:shadow-lg transition p-5 border border-gray-100 hover:border-blue-300"
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-lg font-bold text-gray-900">{dish.name}</h3>
                    <span
                      className={`text-xs px-2 py-0.5 rounded ${getDifficultyColor(
                        dish.difficulty
                      )}`}
                    >
                      {dish.difficulty}
                    </span>
                  </div>

                  <div className="space-y-1 text-sm text-gray-600 mb-3">
                    <div className="flex items-center gap-2">
                      <span>⏱️</span>
                      <span>{dish.cookTime}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      {dish.kcalPerServing && (
                        <span className="flex items-center gap-1">
                          <span>🔥</span>
                          <span>约 {dish.kcalPerServing} kcal/份</span>
                        </span>
                      )}
                      {dish.servings && (
                        <span className="flex items-center gap-1">
                          <span>👥</span>
                          <span>{dish.servings}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {dish.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {dish.tags.map((tag, i) => (
                        <span
                          key={i}
                          className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 详情弹窗 */}
        {selectedDish && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            onClick={() => setSelectedDish(null)}
          >
            <div
              className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* 顶部 header */}
              <div className="p-6 border-b border-gray-200 sticky top-0 bg-white rounded-t-2xl">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                      {selectedDish.name}
                    </h2>
                    <div className="flex flex-wrap gap-2 text-sm">
                      {selectedDish.kcalPerServing && (
                        <span className="px-3 py-1 bg-orange-50 text-orange-700 rounded font-semibold">
                          🔥 {selectedDish.kcalPerServing} kcal/份
                        </span>
                      )}
                      {selectedDish.servings && (
                        <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded">
                          👥 {selectedDish.servings}
                        </span>
                      )}
                      <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded">
                        ⏱️ {selectedDish.cookTime}
                      </span>
                      <span className={`px-2 py-1 rounded ${getDifficultyColor(selectedDish.difficulty)}`}>
                        难度：{selectedDish.difficulty}
                      </span>
                      {selectedDish.tags.map((tag, i) => (
                        <span
                          key={i}
                          className="px-2 py-1 bg-gray-100 text-gray-700 rounded"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <button
                      onClick={() => setSelectedDish(null)}
                      className="text-gray-400 hover:text-gray-600 text-3xl leading-none"
                    >
                      ×
                    </button>
                    <button
                      onClick={handleCopyDetail}
                      className="px-3 py-1.5 border border-gray-300 hover:bg-gray-50 rounded text-xs text-gray-700 whitespace-nowrap"
                    >
                      {copiedDetail ? '✅ 已复制' : '📋 复制全部'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-6">
                {/* 食材清单 */}
                <section className="mb-6">
                  <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <span>🥘</span><span>所需食材</span>
                  </h3>
                  {selectedDish.ingredients && selectedDish.ingredients.length > 0 ? (
                    <div className="grid sm:grid-cols-2 gap-4">
                      <IngredientsPane
                        title="主料"
                        items={selectedDish.ingredients.filter((it) => (it.category || 'main') === 'main')}
                      />
                      <IngredientsPane
                        title="调料"
                        items={selectedDish.ingredients.filter((it) => it.category === 'seasoning')}
                      />
                    </div>
                  ) : (
                    <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
                      还需要：{selectedDish.otherIngredients?.join('、') || '—'}
                    </div>
                  )}
                  <p className="mt-2 text-xs text-gray-400">
                    * 克数按 <strong>{searchedServings} 人份</strong> 估算，可按口味增减。
                  </p>
                </section>

                {/* 步骤 */}
                <section>
                  <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                    <span>👨‍🍳</span><span>制作步骤</span>
                  </h3>
                  {selectedDish.stepsRich && selectedDish.stepsRich.length > 0 ? (
                    <ol className="space-y-4">
                      {selectedDish.stepsRich.map((s, i) => (
                        <StepRow key={i} index={i} step={s} />
                      ))}
                    </ol>
                  ) : (
                    <ol className="space-y-3">
                      {(selectedDish.steps || []).map((s, i) => (
                        <li key={i} className="flex gap-3 text-gray-700 leading-relaxed">
                          <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white text-sm rounded-full flex items-center justify-center">
                            {i + 1}
                          </span>
                          <span className="flex-1">{s}</span>
                        </li>
                      ))}
                    </ol>
                  )}
                </section>

                <p className="mt-6 text-xs text-gray-400">
                  * 卡路里与克数为估算值，可按实际份量增减。
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

// ---------- 子组件 ----------
function IngredientsPane({ title, items }: { title: string; items: Ingredient[] }) {
  return (
    <div>
      <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{title}</div>
      {items.length === 0 ? (
        <div className="text-sm text-gray-400">—</div>
      ) : (
        <ul className="space-y-1.5">
          {items.map((it, i) => (
            <li key={i} className="flex items-baseline justify-between gap-3 bg-gray-50 rounded-lg px-3 py-2">
              <div className="flex-1 min-w-0">
                <span className="font-medium text-gray-800">{it.name}</span>
                {it.note && (
                  <span className="text-xs text-gray-500 ml-2">· {it.note}</span>
                )}
              </div>
              <span className="text-sm font-semibold text-blue-700 whitespace-nowrap">{it.amount}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function StepRow({ index, step }: { index: number; step: Step }) {
  return (
    <li className="flex gap-3">
      <span className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white text-sm font-semibold rounded-full flex items-center justify-center">
        {index + 1}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2 mb-1">
          <span className="text-gray-800 leading-relaxed flex-1">{step.text}</span>
          {step.duration && (
            <span className="shrink-0 px-2 py-0.5 bg-green-50 text-green-700 border border-green-200 rounded text-xs font-medium whitespace-nowrap">
              ⏱ {step.duration}
            </span>
          )}
        </div>
        {step.tip && (
          <div className="text-xs text-gray-500 bg-amber-50 border-l-2 border-amber-300 px-2 py-1.5 rounded">
            💡 {step.tip}
          </div>
        )}
      </div>
    </li>
  );
}

// ---------- helper ----------
function buildDishCopyText(d: Dish): string {
  const lines: string[] = [];
  lines.push(`【${d.name}】`);
  if (d.kcalPerServing) lines.push(`每份约 ${d.kcalPerServing} kcal`);
  lines.push(`份数：${d.servings || '—'} | 时长：${d.cookTime} | 难度：${d.difficulty}`);
  if (d.tags.length) lines.push(`标签：${d.tags.join('、')}`);
  lines.push('', '【食材】');
  if (d.ingredients && d.ingredients.length > 0) {
    const mains = d.ingredients.filter((it) => (it.category || 'main') === 'main');
    const seasonings = d.ingredients.filter((it) => it.category === 'seasoning');
    if (mains.length) {
      lines.push('主料：');
      mains.forEach((it) => {
        lines.push(`  - ${it.name} ${it.amount}${it.note ? `（${it.note}）` : ''}`);
      });
    }
    if (seasonings.length) {
      lines.push('调料：');
      seasonings.forEach((it) => {
        lines.push(`  - ${it.name} ${it.amount}${it.note ? `（${it.note}）` : ''}`);
      });
    }
  } else if (d.otherIngredients && d.otherIngredients.length) {
    lines.push(d.otherIngredients.join('、'));
  }
  lines.push('', '【步骤】');
  const steps: Step[] = d.stepsRich && d.stepsRich.length > 0
    ? d.stepsRich
    : (d.steps || []).map((s: string) => ({ text: s }));
  steps.forEach((s, i) => {
    let line = `${i + 1}. ${s.text}`;
    if (s.duration) line += `（${s.duration}）`;
    lines.push(line);
    if (s.tip) lines.push(`   💡 ${s.tip}`);
  });
  return lines.join('\n');
}
