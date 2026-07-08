'use client';

import { useState } from 'react';
import Link from 'next/link';

const SAMPLE_MESSAGES = [
  '好久没见你了，最近怎么样？',
  '今天加班好累啊',
  '周末有空吗？想约你吃饭',
  '刚看到一家新开的咖啡馆，评价不错',
];

export default function LovePage() {
  const [message, setMessage] = useState('');
  const [theirGender, setTheirGender] = useState('男');
  const [myGender, setMyGender] = useState('女');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{
    replies: Array<{ reply: string; style: string }>;
    originalMessage: string;
  } | null>(null);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const handleSubmit = async () => {
    if (!message.trim()) {
      setError('请输入对方发来的消息');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch('/api/love', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: message.trim(),
          theirGender,
          myGender,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setResult({
          replies: data.replies,
          originalMessage: data.originalMessage,
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

  const useSample = (s: string) => {
    setMessage(s);
  };

  const copyReply = async (text: string, idx: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 2000);
    } catch (err) {
      setError('复制失败，请手动选择文字复制');
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
            <span className="text-3xl">💕</span>
            <h1 className="text-3xl font-bold text-gray-800">AI 恋爱回复</h1>
          </div>
          <p className="text-gray-600">不知道怎么回？AI 帮你想几条高情商回复</p>
        </div>

        {/* 温馨提示 */}
        <div className="bg-pink-50 border border-pink-200 rounded-lg p-3 mb-6 text-xs text-pink-800">
          💡 真诚第一，套路第二。AI 提供的是参考，最终请根据自己的真实感受选择回复。
        </div>

        {/* 输入区 */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          {/* 对方消息 */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              对方发来的消息 <span className="text-red-500">*</span>
            </label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="粘贴对方发来的消息..."
              rows={3}
              className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-pink-400"
            />
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="text-xs text-gray-500 self-center">试试：</span>
              {SAMPLE_MESSAGES.map((s, i) => (
                <button
                  key={i}
                  onClick={() => useSample(s)}
                  className="px-3 py-1 text-sm bg-pink-50 hover:bg-pink-100 rounded-full text-pink-700"
                >
                  {s.length > 12 ? s.slice(0, 12) + '...' : s}
                </button>
              ))}
            </div>
          </div>

          {/* 性别选择 */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                对方性别
              </label>
              <select
                value={theirGender}
                onChange={(e) => setTheirGender(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-400"
              >
                <option value="男">男</option>
                <option value="女">女</option>
                <option value="不确定">不确定</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                我的性别
              </label>
              <select
                value={myGender}
                onChange={(e) => setMyGender(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-400"
              >
                <option value="男">男</option>
                <option value="女">女</option>
                <option value="其他">其他</option>
              </select>
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-pink-500 hover:bg-pink-600 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition"
          >
            {loading ? '⏳ AI 思考中...' : '💡 生成回复'}
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
            <div className="mb-4 pb-4 border-b border-gray-100">
              <div className="text-xs text-gray-500 mb-1">对方说：</div>
              <div className="text-gray-700 italic">「{result.originalMessage}」</div>
            </div>

            <h2 className="text-xl font-bold text-gray-800 mb-4">
              ✨ AI 建议的回复（{result.replies.length} 条）
            </h2>

            <div className="space-y-3">
              {result.replies.map((r, i) => (
                <div
                  key={i}
                  className="p-4 bg-gradient-to-r from-pink-50 to-rose-50 rounded-lg border border-pink-100"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="text-xs text-pink-600 mb-1 font-medium">
                        💬 {r.style}
                      </div>
                      <div className="text-gray-800 text-lg leading-relaxed">
                        {r.reply}
                      </div>
                    </div>
                    <button
                      onClick={() => copyReply(r.reply, i)}
                      className="flex-shrink-0 px-3 py-1 bg-white hover:bg-pink-50 text-pink-600 rounded-lg text-sm border border-pink-200"
                    >
                      {copiedIdx === i ? '✅ 已复制' : '📋 复制'}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => {
                setResult(null);
              }}
              className="mt-4 text-sm text-pink-600 hover:text-pink-700 font-medium"
            >
              ← 换条消息
            </button>
          </div>
        )}
      </div>
    </main>
  );
}