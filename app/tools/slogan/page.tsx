'use client';

import { useState } from 'react';
import Link from 'next/link';

const SUGGESTIONS = ['班级口号', '运动会', '广告语', '团结拼搏', '青春奋斗', '产品宣传'];

const CHAR_OPTIONS = [
  { value: 'free', label: '不限' },
  { value: '4', label: '4 字' },
  { value: '7', label: '7 字' },
  { value: '8', label: '8 字' },
  { value: '10-15', label: '10-15 字' },
];

export default function SloganPage() {
  const [keywords, setKeywords] = useState('');
  const [count, setCount] = useState(5);
  const [charPerLine, setCharPerLine] = useState('free');
  const [rhyme, setRhyme] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{
    slogans: string[];
    keywords: string;
    count: number;
  } | null>(null);
  const [copied, setCopied] = useState(false);

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
          count,
          charPerLine,
          rhyme,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setResult({
          slogans: data.slogans,
          keywords: data.keywords,
          count: data.count,
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
    setKeywords(s);
  };

  const copyAll = async () => {
    if (!result) return;
    const text = result.slogans.join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      setError('复制失败，请手动选择文字复制');
    }
  };

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
          <p className="text-gray-600">输入关键词，AI 帮你写出朗朗上口的好口号</p>
        </div>

        {/* 输入区 */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
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
                  onClick={() => useSuggestion(s)}
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
              <label className="block text-sm font-medium text-gray-700 mb-2">
                句数
              </label>
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
              <label className="block text-sm font-medium text-gray-700 mb-2">
                每句字数
              </label>
              <select
                value={charPerLine}
                onChange={(e) => setCharPerLine(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {CHAR_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                押韵
              </label>
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
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-800">
                  ✨ 基于「{result.keywords}」生成的口号
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  共 {result.slogans.length} 句
                </p>
              </div>
              <button
                onClick={copyAll}
                className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-sm font-medium"
              >
                {copied ? '✅ 已复制' : '📋 复制全部'}
              </button>
            </div>

            <div className="space-y-3">
              {result.slogans.map((slogan, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100"
                >
                  <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-bold">
                    {i + 1}
                  </div>
                  <div className="flex-1 text-gray-800 font-medium text-lg leading-relaxed">
                    {slogan}
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => {
                setResult(null);
              }}
              className="mt-4 text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              ← 重新生成
            </button>
          </div>
        )}
      </div>
    </main>
  );
}