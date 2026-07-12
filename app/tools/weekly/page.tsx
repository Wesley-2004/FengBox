'use client';

import { useState } from 'react';
import Link from 'next/link';

const STYLES = [
  { value: 'formal', label: '正式专业', emoji: '👔', desc: '严谨有数据，领导爱看', color: 'bg-blue-100 text-blue-700 border-blue-300' },
  { value: 'short', label: '简洁明了', emoji: '⚡', desc: '短句 bullet，互联网风', color: 'bg-green-100 text-green-700 border-green-300' },
  { value: 'detailed', label: '详细展开', emoji: '📋', desc: '每个工作详细复盘', color: 'bg-purple-100 text-purple-700 border-purple-300' },
  { value: 'casual', label: '轻松活泼', emoji: '😊', desc: '口语化，有温度', color: 'bg-orange-100 text-orange-700 border-orange-300' },
];

export default function WeeklyPage() {
  const [points, setPoints] = useState<string[]>(['']);
  const [style, setStyle] = useState('formal');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{
    report: string;
    nextWeek: string[];
    styleLabel: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const addPoint = () => {
    if (points.length >= 10) return;
    setPoints([...points, '']);
  };

  const removePoint = (idx: number) => {
    if (points.length <= 1) return;
    setPoints(points.filter((_, i) => i !== idx));
  };

  const updatePoint = (idx: number, value: string) => {
    const newPoints = [...points];
    newPoints[idx] = value;
    setPoints(newPoints);
  };

  const handleSubmit = async () => {
    const validPoints = points.map((p) => p.trim()).filter((p) => p.length > 0);
    if (validPoints.length === 0) {
      setError('请至少输入 1 条工作要点');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch('/api/weekly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ points: validPoints, style }),
      });

      const data = await response.json();

      if (data.success) {
        setResult({
          report: data.report,
          nextWeek: data.nextWeek,
          styleLabel: data.styleLabel,
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

  const copyReport = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result.report);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      setError('复制失败，请手动选择文字复制');
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-cyan-50 to-blue-100 py-8 px-4">
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
            <span className="text-3xl">📝</span>
            <h1 className="text-3xl font-bold text-gray-800">AI 周报生成器</h1>
          </div>
          <p className="text-gray-600">输入工作要点，AI 一键生成完整周报</p>
        </div>

        {/* 输入区 */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          {/* 工作要点 */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              本周你做了哪些事？
            </label>
            <div className="space-y-2">
              {points.map((p, i) => (
                <div key={i} className="flex gap-2">
                  <span className="flex-shrink-0 w-7 h-10 bg-gray-100 rounded text-sm text-gray-500 flex items-center justify-center">
                    {i + 1}
                  </span>
                  <input
                    type="text"
                    value={p}
                    onChange={(e) => updatePoint(i, e.target.value)}
                    placeholder={`例如：完成 XX 功能开发`}
                    className="flex-1 p-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                  {points.length > 1 && (
                    <button
                      onClick={() => removePoint(i)}
                      className="flex-shrink-0 w-10 h-10 text-gray-400 hover:text-red-500"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              onClick={addPoint}
              disabled={points.length >= 10}
              className="mt-3 text-sm text-blue-600 hover:text-blue-700 disabled:text-gray-400"
            >
              ➕ 添加一行（{points.length}/10）
            </button>
          </div>

          {/* 风格选择 */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              选择周报风格
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {STYLES.map((s) => (
                <button
                  key={s.value}
                  onClick={() => setStyle(s.value)}
                  className={`p-3 rounded-lg border-2 text-left transition ${
                    style === s.value
                      ? `${s.color} border-current shadow-md`
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-lg mb-1">{s.emoji}</div>
                  <div className="font-semibold text-sm">{s.label}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{s.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition"
          >
            {loading ? '⏳ AI 写作中...' : '✨ 生成周报'}
          </button>

          {error && (
            <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              ❌ {error}
            </div>
          )}
        </div>

        {/* 结果区 */}
        {result && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xl font-bold text-gray-800">
                  📄 周报全文（{result.styleLabel}）
                </h2>
                <button
                  onClick={copyReport}
                  className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-sm font-medium"
                >
                  {copied ? '✅ 已复制' : '📋 复制全文'}
                </button>
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg p-5 text-gray-800 leading-relaxed whitespace-pre-wrap">
                {result.report}
              </div>
            </div>

            {result.nextWeek.length > 0 && (
              <div className="bg-white rounded-xl shadow-md p-6">
                <h2 className="text-xl font-bold text-gray-800 mb-3">
                  💡 AI 建议的下周工作
                </h2>
                <ul className="space-y-2">
                  {result.nextWeek.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-gray-700">
                      <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white text-sm rounded-full flex items-center justify-center">
                        {i + 1}
                      </span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs text-yellow-800">
              💡 想换一种风格？返回上方重新选风格再点"生成周报"。
            </div>

            <button
              onClick={() => {
                setResult(null);
              }}
              className="w-full text-sm text-blue-600 hover:text-blue-700 font-medium py-3"
            >
              ← 写新一周的周报
            </button>
          </div>
        )}
      </div>
    </main>
  );
}