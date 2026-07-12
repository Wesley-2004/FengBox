'use client';

import { useState } from 'react';
import Link from 'next/link';

const SUGGESTIONS = [
  '减脂早餐',
  '新手化妆',
  '周末穿搭',
  '居家好物',
  '学生平价彩妆',
  '职场穿搭',
];

export default function XiaohongshuPage() {
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{
    titles: string[];
    content: string;
    tags: string[];
    topic: string;
  } | null>(null);
  const [selectedTitle, setSelectedTitle] = useState(0);
  const [copied, setCopied] = useState<'all' | 'title' | null>(null);

  const handleSubmit = async () => {
    if (!topic.trim()) {
      setError('请输入文案主题');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);
    setSelectedTitle(0);

    try {
      const response = await fetch('/api/xiaohongshu', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic: topic.trim() }),
      });

      const data = await response.json();

      if (data.success) {
        setResult({
          titles: data.titles,
          content: data.content,
          tags: data.tags,
          topic: data.topic,
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
    setTopic(s);
  };

  const copyAll = async () => {
    if (!result) return;
    const finalTitle = result.titles[selectedTitle] || result.titles[0];
    const fullText = `${finalTitle}\n\n${result.content}`;
    try {
      await navigator.clipboard.writeText(fullText);
      setCopied('all');
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      setError('复制失败，请手动选择文字复制');
    }
  };

  const copyTitleOnly = async () => {
    if (!result) return;
    const finalTitle = result.titles[selectedTitle] || result.titles[0];
    try {
      await navigator.clipboard.writeText(finalTitle);
      setCopied('title');
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      setError('复制失败');
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-pink-50 to-red-50 py-8 px-4">
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
            <span className="text-3xl">📕</span>
            <h1 className="text-3xl font-bold text-gray-800">AI 小红书文案</h1>
          </div>
          <p className="text-gray-600">输入主题，一键生成爆款小红书文案</p>
        </div>

        {/* 输入区 */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            你的主题是什么？
          </label>
          <div className="flex gap-3 mb-3">
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              placeholder="例如：减脂早餐、新手化妆、周末穿搭"
              className="flex-1 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-400"
            />
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="bg-pink-500 hover:bg-pink-600 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition"
            >
              {loading ? '⏳ 生成中...' : '✨ 生成文案'}
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            <span className="text-xs text-gray-500 self-center">试试：</span>
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => useSuggestion(s)}
                className="px-3 py-1 text-sm bg-pink-50 hover:bg-pink-100 rounded-full text-pink-700"
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
          <div className="bg-white rounded-xl shadow-md p-6">
            {/* 标题选择 */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xl font-bold text-gray-800">
                  📌 选一个标题
                </h2>
                <button
                  onClick={copyTitleOnly}
                  className="text-sm text-pink-600 hover:text-pink-700"
                >
                  {copied === 'title' ? '✅ 已复制' : '📋 只复制标题'}
                </button>
              </div>
              <div className="space-y-2">
                {result.titles.map((title, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedTitle(i)}
                    className={`w-full text-left p-3 rounded-lg border-2 transition ${
                      selectedTitle === i
                        ? 'border-pink-500 bg-pink-50'
                        : 'border-gray-200 hover:border-pink-300'
                    }`}
                  >
                    <span className="text-sm text-gray-500 mr-2">#{i + 1}</span>
                    <span className="text-gray-800">{title}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 正文 */}
            <div className="mb-6">
              <h2 className="text-xl font-bold text-gray-800 mb-3">
                ✍️ 完整文案
              </h2>
              <div className="bg-gradient-to-br from-pink-50 to-orange-50 rounded-lg p-5 text-gray-800 leading-relaxed whitespace-pre-wrap">
                {result.content}
              </div>
            </div>

            {/* 标签 */}
            {result.tags.length > 0 && (
              <div className="mb-6">
                <h2 className="text-sm font-medium text-gray-700 mb-2">
                  🏷️ 推荐话题标签
                </h2>
                <div className="flex flex-wrap gap-2">
                  {result.tags.map((tag, i) => (
                    <span
                      key={i}
                      className="px-3 py-1 bg-pink-100 text-pink-700 rounded-full text-sm"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* 一键复制全部 */}
            <div className="border-t border-gray-100 pt-4">
              <button
                onClick={copyAll}
                className="w-full bg-pink-500 hover:bg-pink-600 text-white font-semibold py-3 px-6 rounded-lg transition"
              >
                {copied === 'all' ? '✅ 已复制到剪贴板' : `📋 复制「${result.titles[selectedTitle]?.slice(0, 15)}...」+ 全文到剪贴板`}
              </button>
              <p className="text-xs text-gray-500 text-center mt-2">
                复制后可直接粘贴到小红书发布
              </p>
            </div>

            <button
              onClick={() => {
                setResult(null);
              }}
              className="mt-4 text-sm text-pink-600 hover:text-pink-700 font-medium"
            >
              ← 换主题重新生成
            </button>
          </div>
        )}
      </div>
    </main>
  );
}