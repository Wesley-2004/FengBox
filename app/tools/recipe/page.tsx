'use client';

import { useState } from 'react';
import Link from 'next/link';

interface Dish {
  id: string;
  name: string;
  mainIngredient: string;
  otherIngredients: string[];
  cookTime: string;
  difficulty: string;
  tags: string[];
  steps: string[];
}

const SUGGESTIONS = ['猪肉', '鸡肉', '鸡蛋', '土豆', '西红柿', '豆腐', '白菜'];

export default function RecipePage() {
  const [ingredients, setIngredients] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [dishes, setDishes] = useState<Dish[]>([]);
  const [searchedIngredients, setSearchedIngredients] = useState('');
  const [selectedDish, setSelectedDish] = useState<Dish | null>(null);

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
        body: JSON.stringify({ ingredients: ingredients.trim() }),
      });

      const data = await response.json();

      if (data.success) {
        setDishes(data.dishes);
        setSearchedIngredients(data.ingredients);
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
    setIngredients(s);
  };

  const getDifficultyColor = (diff: string) => {
    if (diff.includes('简单')) return 'bg-green-100 text-green-800';
    if (diff.includes('困难') || diff.includes('难')) return 'bg-red-100 text-red-800';
    return 'bg-yellow-100 text-yellow-800';
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 py-8 px-4">
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
            <span className="text-3xl">🍳</span>
            <h1 className="text-3xl font-bold text-gray-800">AI 菜谱生成</h1>
          </div>
          <p className="text-gray-600">输入食材，AI 推荐多道家常菜做法</p>
        </div>

        {/* 输入区 */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
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
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition"
            >
              {loading ? '⏳ 生成中...' : '🍽️ 生成菜谱'}
            </button>
          </div>

          {/* 推荐食材 */}
          <div className="flex flex-wrap gap-2">
            <span className="text-xs text-gray-500 self-center">试试：</span>
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => useSuggestion(s)}
                className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded-full text-gray-700"
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

        {/* 菜谱卡片墙 */}
        {dishes.length > 0 && (
          <div>
            <div className="mb-4 text-sm text-gray-600">
              基于 <strong>「{searchedIngredients}」</strong> 找到 {dishes.length} 道家常菜：
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
                    <div className="flex items-center gap-1">
                      <span>⏱️</span>
                      <span>{dish.cookTime}</span>
                    </div>
                    <div className="flex items-start gap-1">
                      <span>🥘</span>
                      <span className="line-clamp-2">
                        还需要：{dish.otherIngredients.join('、')}
                      </span>
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
              className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                      {selectedDish.name}
                    </h2>
                    <div className="flex flex-wrap gap-2 mt-2 text-sm">
                      <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded">
                        ⏱️ {selectedDish.cookTime}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded ${getDifficultyColor(
                          selectedDish.difficulty
                        )}`}
                      >
                        难度：{selectedDish.difficulty}
                      </span>
                      {selectedDish.tags.map((tag, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedDish(null)}
                    className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
                  >
                    ×
                  </button>
                </div>
              </div>

              <div className="p-6">
                <h3 className="font-semibold text-gray-800 mb-2">🥘 所需食材</h3>
                <div className="bg-gray-50 rounded-lg p-4 mb-6 text-gray-700">
                  <div>
                    <strong>主料：</strong>
                    {selectedDish.mainIngredient}
                  </div>
                  {selectedDish.otherIngredients.length > 0 && (
                    <div>
                      <strong>辅料：</strong>
                      {selectedDish.otherIngredients.join('、')}
                    </div>
                  )}
                </div>

                <h3 className="font-semibold text-gray-800 mb-2">📝 制作步骤</h3>
                <ol className="space-y-3">
                  {selectedDish.steps.map((step, i) => (
                    <li key={i} className="flex gap-3 text-gray-700 leading-relaxed">
                      <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white text-sm rounded-full flex items-center justify-center">
                        {i + 1}
                      </span>
                      <span className="flex-1">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
