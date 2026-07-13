'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

const SAMPLE_MESSAGES = [
  '好久没见你了，最近怎么样？',
  '今天加班好累啊',
  '周末有空吗？想约你吃饭',
  '刚看到一家新开的咖啡馆，评价不错',
];

type ChatTurn = {
  id: string;          // 前端唯一 id（crypto.randomUUID() 兜底）
  role: 'me' | 'them'; // 'me' = 我；'them' = TA
  text: string;
};

const HISTORY_KEY = 'fengbox:love:history:v1';
const OPEN_KEY = 'fengbox:love:historyOpen:v1';
const MAX_HISTORY = 10;

function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `t-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export default function LovePage() {
  // 主输入
  const [message, setMessage] = useState('');
  const [theirGender, setTheirGender] = useState('男');
  const [myGender, setMyGender] = useState('女');

  // 历史聊天记录（用 lazy init 从 sessionStorage 读）
  const [history, setHistory] = useState<ChatTurn[]>(() => {
    try {
      const raw = sessionStorage.getItem(HISTORY_KEY);
      if (raw) {
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) return arr.slice(0, MAX_HISTORY);
      }
    } catch {}
    return [];
  });

  // 折叠状态
  const [historyOpen, setHistoryOpen] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem(OPEN_KEY) === '1';
    } catch {
      return false;
    }
  });

  // 持久化
  useEffect(() => {
    try { sessionStorage.setItem(HISTORY_KEY, JSON.stringify(history)); } catch {}
  }, [history]);
  useEffect(() => {
    try { sessionStorage.setItem(OPEN_KEY, historyOpen ? '1' : '0'); } catch {}
  }, [historyOpen]);

  // 状态
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{
    replies: Array<{ reply: string; style: string }>;
    originalMessage: string;
    historyUsed: number;
  } | null>(null);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  // ---------- 提交 ----------
  const handleSubmit = async () => {
    if (!message.trim()) {
      setError('请输入对方发来的消息');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    // 只发非空记录 + 限 10 条
    const cleanHistory = history
      .filter((t) => t.text.trim().length > 0)
      .slice(-MAX_HISTORY)
      .map((t) => ({ role: t.role, text: t.text.trim() }));

    try {
      const response = await fetch('/api/love', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: message.trim(),
          theirGender,
          myGender,
          history: cleanHistory,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setResult({
          replies: data.replies,
          originalMessage: data.originalMessage,
          historyUsed: data.historyUsed ?? cleanHistory.length,
        });
      } else {
        setError(data.error || '出错了，请重试');
      }
    } catch {
      setError('网络错误，请重试');
    } finally {
      setLoading(false);
    }
  };

  const applySample = (s: string) => setMessage(s);

  const copyReply = async (text: string, idx: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 2000);
    } catch {
      setError('复制失败，请手动选择文字复制');
    }
  };

  // ---------- 历史记录操作 ----------
  const addHistoryTurn = () => {
    if (history.length >= MAX_HISTORY) return;
    setHistory((prev) => [...prev, { id: newId(), role: 'them', text: '' }]);
  };

  const removeHistoryTurn = (id: string) => {
    setHistory((prev) => prev.filter((t) => t.id !== id));
  };

  const updateHistoryTurn = (id: string, patch: Partial<ChatTurn>) => {
    setHistory((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  };

  const clearHistory = () => {
    if (!confirm('确定清空所有历史聊天记录？')) return;
    setHistory([]);
  };

  // ---------- 渲染 ----------
  const validHistoryCount = history.filter((t) => t.text.trim()).length;

  return (
    <main className="min-h-screen bg-gradient-to-b from-pink-50 to-red-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Link href="/" className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1">
            ← 返回 FengBox 首页
          </Link>
        </div>

        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <span className="text-3xl">💕</span>
            <h1 className="text-3xl font-bold text-gray-800">AI 恋爱回复</h1>
          </div>
          <p className="text-gray-600">不知道怎么回？AI 帮你想几条高情商回复</p>
        </div>

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
                  onClick={() => applySample(s)}
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
              <label className="block text-sm font-medium text-gray-700 mb-2">对方性别</label>
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
              <label className="block text-sm font-medium text-gray-700 mb-2">我的性别</label>
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

          {/* 历史聊天记录（折叠） */}
          <div className="mb-4 border border-pink-200 rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setHistoryOpen((v) => !v)}
              className="w-full px-4 py-3 flex items-center justify-between bg-pink-50/50 hover:bg-pink-50 transition text-left"
            >
              <div className="flex items-center gap-2">
                <span className="text-base">💬</span>
                <span className="text-sm font-medium text-gray-700">
                  历史聊天记录（可选 · 让 AI 更懂对方）
                </span>
                {validHistoryCount > 0 && (
                  <span className="text-xs px-2 py-0.5 bg-pink-100 text-pink-700 rounded-full">
                    {validHistoryCount} 条
                  </span>
                )}
              </div>
              <span className="text-gray-400 text-sm">{historyOpen ? '收起 ▲' : '展开 ▼'}</span>
            </button>

            {historyOpen && (
              <div className="p-4 bg-white border-t border-pink-100">
                <p className="text-xs text-gray-500 mb-3 leading-relaxed">
                  粘贴你和 TA 的真实聊天记录（每条用「[我]/[TA]」标注）。AI 会分析 TA 的性格、说话风格和对你的态度，给出更贴合的回复。
                  <br />
                  <span className="text-pink-600">最多 10 条，仅保存在当前浏览器，关闭页面即清除。</span>
                </p>

                <div className="space-y-2 mb-3">
                  {history.length === 0 && (
                    <div className="text-center text-sm text-gray-400 py-3 border-2 border-dashed border-gray-200 rounded-lg">
                      还没有记录，点下方「添加一条」开始
                    </div>
                  )}
                  {history.map((turn, idx) => (
                    <HistoryTurnRow
                      key={turn.id}
                      index={idx}
                      turn={turn}
                      onChange={(patch) => updateHistoryTurn(turn.id, patch)}
                      onRemove={() => removeHistoryTurn(turn.id)}
                    />
                  ))}
                </div>

                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={addHistoryTurn}
                    disabled={history.length >= MAX_HISTORY}
                    className="px-3 py-1.5 text-sm bg-pink-50 hover:bg-pink-100 text-pink-700 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    + 添加一条
                  </button>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400">
                      {history.length} / {MAX_HISTORY}
                    </span>
                    {history.length > 0 && (
                      <button
                        type="button"
                        onClick={clearHistory}
                        className="text-xs text-red-500 hover:text-red-600"
                      >
                        清空
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 生成按钮 */}
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
              {result.historyUsed > 0 && (
                <div className="text-xs text-pink-600 mt-2">
                  🧠 已结合 {result.historyUsed} 条历史聊天记录分析对方性格
                </div>
              )}
            </div>

            <h2 className="text-xl font-bold text-gray-800 mb-4">
              ✨ AI 建议的回复（{result.replies.length} 条）
            </h2>

            <div className="space-y-3">
              {result.replies.map((r, i) => (
                <div key={i} className="p-4 bg-gradient-to-r from-pink-50 to-rose-50 rounded-lg border border-pink-100">
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
              onClick={() => setResult(null)}
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

// ---------- 历史记录单条 ----------
function HistoryTurnRow({
  index,
  turn,
  onChange,
  onRemove,
}: {
  index: number;
  turn: ChatTurn;
  onChange: (patch: Partial<ChatTurn>) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-start gap-2 p-2 bg-gray-50 rounded-lg">
      {/* 角色切换 */}
      <div className="flex flex-col gap-1 shrink-0">
        <button
          type="button"
          onClick={() => onChange({ role: 'me' })}
          className={`px-2 py-1 text-xs rounded font-medium transition ${
            turn.role === 'me'
              ? 'bg-blue-500 text-white'
              : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-100'
          }`}
          title="我说的"
        >
          我
        </button>
        <button
          type="button"
          onClick={() => onChange({ role: 'them' })}
          className={`px-2 py-1 text-xs rounded font-medium transition ${
            turn.role === 'them'
              ? 'bg-pink-500 text-white'
              : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-100'
          }`}
          title="对方说的"
        >
          TA
        </button>
      </div>

      {/* 序号 */}
      <div className="shrink-0 w-6 h-6 mt-1.5 bg-gray-200 text-gray-600 rounded-full flex items-center justify-center text-xs font-medium">
        {index + 1}
      </div>

      {/* 文本 */}
      <textarea
        value={turn.text}
        onChange={(e) => onChange({ text: e.target.value })}
        placeholder={turn.role === 'me' ? '我说的...' : 'TA 说的...'}
        rows={2}
        className="flex-1 px-3 py-1.5 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-pink-300 resize-none"
      />

      {/* 删除 */}
      <button
        type="button"
        onClick={onRemove}
        className="shrink-0 w-7 h-7 mt-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition flex items-center justify-center"
        title="删除这条"
      >
        ✕
      </button>
    </div>
  );
}