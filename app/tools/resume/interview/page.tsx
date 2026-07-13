'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

interface Message {
  role: 'assistant' | 'user';
  content: string;
}

interface InterviewResult {
  question: string;
  hint?: string;
  roundNumber: number;
  isFinished?: boolean;
  error?: string;        // 后端可能返回的错误
  code?: string;
}

// 把主要逻辑包在 Suspense 里，因为 useSearchParams 必须这样
function InterviewPageInner() {
  const searchParams = useSearchParams();

  // 从 URL 参数获取简历和岗位（由 resume 页面跳转时传入）
  const rewrittenResume = searchParams.get('rewrite') || '';
  const targetJob = searchParams.get('job') || '';

  // 状态：用户登录信息
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // 状态：面试会话
  const [messages, setMessages] = useState<Message[]>([]);              // 给后端 API 用（不存 AI 答案）
  const [displayMessages, setDisplayMessages] = useState<Message[]>([]); // 给用户显示用（含 AI 答案）
  const [currentQuestion, setCurrentQuestion] = useState<string>('');
  const [nextQuestion, setNextQuestion] = useState<string>('');  // 准备好但还没显示的下一题
  const [userInput, setUserInput] = useState('');
  const [showAnswer, setShowAnswer] = useState(false);
  const [aiAnswer, setAiAnswer] = useState<string>('');
  const [isWaitingAI, setIsWaitingAI] = useState(false);
  const [manualFinished, setManualFinished] = useState(false);  // 后端说"结束了"时手动标记
  const [error, setError] = useState('');

  // 检查用户是否登录 + 加载简历
  useEffect(() => {
    const init = async () => {
      const { createClient } = await import('@/lib/supabase');
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };
    init();
  }, []);

  // 进入页面时自动请求第一个问题
  useEffect(() => {
    if (!loading && user && rewrittenResume && messages.length === 0) {
      fetchNextQuestion([], '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, user, rewrittenResume]);

  // 请求下一个问题
  const fetchNextQuestion = async (history: Message[], userAnswer: string) => {
    setIsWaitingAI(true);
    setError('');
    setShowAnswer(false);
    setAiAnswer('');
    setUserInput('');

    try {
      const response = await fetch('/api/interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rewrittenResume,
          targetJob,
          history,
          userAnswer: userAnswer || undefined,
          currentQuestion: currentQuestion || undefined,
        }),
      });

      const data = await response.json();

      if (data.error) {
        setError(data.error);
        return;
      }

      const newQuestion = data.question;
      setCurrentQuestion(newQuestion);

      // 把 AI 提问加到历史
      const newMessages: Message[] = [
        ...history,
        { role: 'assistant', content: newQuestion },
      ];
      setMessages(newMessages);

      // 同步更新 displayMessages（让用户能看到对话历史）
      // 用 history 的长度判断是初次还是后续
      const isFirstCall = history.length === 0;
      if (isFirstCall) {
        // 初次提问：displayMessages 从 0 开始
        setDisplayMessages([{ role: 'assistant', content: newQuestion }]);
      }
      // 后续轮：displayMessages 已经在 handleNextRound 里更新过了，这里不动
    } catch (err) {
      setError('网络错误，请重试');
    } finally {
      setIsWaitingAI(false);
    }
  };

  // 请求 AI 返回"AI 标准答案 + 下一个问题"（用户提交答案后）
  const submitAnswerAndFetch = async () => {
    if (!userInput.trim()) {
      setError('请先输入你的回答');
      return;
    }

    setIsWaitingAI(true);
    setError('');

    // 计算当前轮（用户回答的是第几题）
    // 注意：用户答完最后一题后再点提交不会到这里（按钮已禁用）
    const answeredRound = messages.filter((m) => m.role === 'assistant').length;
    const isLastAnswer = answeredRound >= 3;

    try {
      const response = await fetch('/api/interview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rewrittenResume,
          targetJob,
          history: messages,  // 只传 AI 提问（不含 user 答案）
          userAnswer: userInput,
          currentQuestion,
        }),
      });

      const data = await response.json();

      if (data.error) {
        setError(data.error);
        setIsWaitingAI(false);
        return;
      }

      // data.aiAnswer: AI 标准答案（陈述句，详细）
      // data.question: 下一个问题（最后一题时后端会返回空或忽略）
      // data.roundNumber: 当前轮数
      // data.isFinished: 是否结束
      setAiAnswer(data.aiAnswer || '');
      setShowAnswer(true);

      // ★ 关键修复：立即把"用户回答 + AI 标准答案"写进 displayMessages
      // 这样不管之后用户点不点"进入下一轮"，面试记录里都能看到答案
      setDisplayMessages((prev) => [
        ...prev,
        { role: 'user', content: userInput },        // 用户的回答（绿色）
        { role: 'assistant', content: data.aiAnswer || '' }, // AI 标准答案（蓝色）
      ]);

      // 如果后端说"结束了"，标记为手动结束
      if (data.isFinished) {
        setManualFinished(true);
      }

      // 处理下一题：
      // - 如果是最后一题（isLastAnswer=true）：不要显示下一个问题（即使后端瞎返回了）
      // - 如果不是：准备好，等用户看完答案再显示
      if (isLastAnswer) {
        // 最后一题：不要更新 currentQuestion / nextQuestion
        // 这样"当前问题"区域会消失（因为 isFinished=true），但显示历史里 AI 答案已经保存
        setNextQuestion('');
      } else if (data.question) {
        setNextQuestion(data.question);
      } else {
        setNextQuestion('');
      }
    } catch (err) {
      setError('网络错误，请重试');
    } finally {
      setIsWaitingAI(false);
    }
  };

    // 进入下一轮（用户看完答案后，把用户答案+AI答案都加入历史，再加下一题）
  const handleNextRound = () => {
    if (!nextQuestion) {
      return;
    }

    // messages 里只存"提问"（不存 AI 答案）—— 给后端算轮次用
    const updatedMessages: Message[] = [
      ...messages,                                // 之前的 AI 提问
      { role: 'user', content: userInput },        // 用户的回答
      { role: 'assistant', content: nextQuestion },// 下一个问题（替换 AI 答案的位置）
    ];
    setMessages(updatedMessages);

    // ★ 关键修复：displayMessages 已经在 submitAnswerAndFetch 里 push 过
    // "用户答案 + AI 标准答案"了，这里只需要追加"下一个问题"
    const updatedDisplayMessages: Message[] = [
      ...displayMessages,
      { role: 'assistant', content: nextQuestion },// 下一个问题（蓝色）
    ];
    setDisplayMessages(updatedDisplayMessages);

    // 把当前问题换成下一轮
    setCurrentQuestion(nextQuestion);
    setNextQuestion('');

    // 重置输入区
    setUserInput('');
    setShowAnswer(false);
    setAiAnswer('');
  };

  // 最后一轮点"完成面试"：只切结束态，不动任何显示数据
  const handleFinishInterview = () => {
    setManualFinished(true);
    setShowAnswer(false);  // 关闭 AI 答案框（答案已经在 displayMessages 里了）
    setAiAnswer('');
  };

  // 重新开始
  const handleRestart = () => {
    setMessages([]);
    setDisplayMessages([]);  // 也重置显示历史
    setCurrentQuestion('');
    setUserInput('');
    setShowAnswer(false);
    setAiAnswer('');
    setManualFinished(false);  // 也重置结束标记
    setError('');
    fetchNextQuestion([], '');
  };

  // 没登录
  if (!loading && !user) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-purple-50 to-blue-100 flex items-center justify-center px-4 py-12">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md text-center">
          <div className="text-6xl mb-4">🔐</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-3">请先登录</h2>
          <p className="text-gray-600 mb-6">AI 面试官需要登录后才能使用</p>
          <Link
            href="/auth/login"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg"
          >
            去登录
          </Link>
        </div>
      </main>
    );
  }

  // 简历为空（没有从 resume 页面跳转过来）
  if (!rewrittenResume) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-purple-50 to-blue-100 flex items-center justify-center px-4 py-12">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md text-center">
          <div className="text-6xl mb-4">📄</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-3">没有找到简历</h2>
          <p className="text-gray-600 mb-6">
            AI 面试官需要基于"改写后的简历"提问
            <br />
            请先到 AI 简历优化页面生成简历
          </p>
          <Link
            href="/tools/resume"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg"
          >
            去生成简历
          </Link>
        </div>
      </main>
    );
  }

  const roundNumber = messages.filter((m) => m.role === 'assistant').length;
  // isFinished: 真的"所有问题都答完了"才为 true
  // 触发条件：后端在第 3 轮回答后返回 isFinished=true → 前端 setManualFinished(true)
  const isFinished = manualFinished || roundNumber > 3;
  const isLastRound = roundNumber === 3;

  return (
    <main className="min-h-screen bg-gradient-to-b from-purple-50 to-blue-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* 返回 */}
        <div className="mb-6 flex items-center justify-between">
          <Link
            href="/tools/resume"
            className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
          >
            ← 返回简历优化
          </Link>
          <div className="text-sm text-gray-500">
            目标岗位：<strong>{targetJob}</strong>
          </div>
        </div>

        {/* 标题 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <span className="text-3xl">🎤</span>
            <h1 className="text-3xl font-bold text-gray-800">AI 模拟面试官</h1>
          </div>
          <p className="text-gray-600">基于你的简历提问，让你体验真实面试</p>
        </div>

        {/* 顶部进度 */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-4 flex items-center justify-between">
          <div className="text-sm text-gray-700">
            <strong>第 {Math.min(roundNumber, 3)} / 3</strong> 轮
          </div>
          <div className="flex gap-1">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className={`h-2 w-8 rounded ${
                  i <= roundNumber ? 'bg-purple-600' : 'bg-gray-200'
                }`}
              />
            ))}
          </div>
        </div>

        {/* 对话历史 */}
        {messages.length > 0 && (
          <div className="bg-white rounded-xl shadow-md p-6 mb-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              📝 面试记录
            </h3>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {displayMessages.map((m, i) => (
                <div
                  key={i}
                  className={`p-3 rounded-lg ${
                    m.role === 'assistant'
                      ? 'bg-blue-50 border-l-4 border-blue-400'
                      : 'bg-green-50 border-l-4 border-green-400'
                  }`}
                >
                  <div className="text-xs text-gray-500 mb-1">
                    {m.role === 'assistant' ? '🎤 面试官' : '👤 你'}
                  </div>
                  <div
                    className={`text-gray-800 leading-relaxed ${
                      m.role === 'assistant' ? 'whitespace-pre-wrap' : ''
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 当前问题 */}
        {!isFinished && currentQuestion && (
          <div className="bg-white rounded-xl shadow-md p-6 mb-4 border-2 border-purple-300">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-purple-700">
                🎤 面试官提问（第 {roundNumber} 轮）
              </h3>
            </div>
            <div className="text-lg text-gray-900 leading-relaxed mb-4">
              {currentQuestion}
            </div>

            {!showAnswer ? (
              <>
                {/* 用户输入框 */}
                <textarea
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  placeholder="先自己想想，写下你的回答...&#10;写完后才能查看 AI 标准答案"
                  rows={5}
                  className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-purple-400 mb-3"
                />
                <button
                  onClick={submitAnswerAndFetch}
                  disabled={isWaitingAI || !userInput.trim()}
                  className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition"
                >
                  {isWaitingAI ? '⏳ AI 思考中...' : '📝 提交我的回答'}
                </button>
              </>
            ) : (
              <>
                {/* AI 标准答案（蓝色框 — 跟面试官同色，因为是 AI 输出）*/}
                <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-lg mb-3">
                  <div className="text-xs text-blue-700 font-semibold mb-1">
                    ✅ AI 标准答案 / 参考思路
                  </div>
                  <div className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                    {aiAnswer || '（AI 答案生成失败，请重新提交）'}
                  </div>
                </div>

                {/* 下一轮 / 结束按钮 */}
                {!isLastRound ? (
                  <button
                    onClick={handleNextRound}
                    className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-6 rounded-lg transition"
                  >
                    🤔 进入下一轮（第 {roundNumber + 1}/3）
                  </button>
                ) : (
                  // ★ 最后一轮：必须让用户点"完成面试"才结束
                  // 这样 AI 答案 100% 保留在屏幕上、不会被任何切换吞掉
                  <button
                    onClick={handleFinishInterview}
                    className="w-full bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-3 px-6 rounded-lg transition"
                  >
                    🎉 完成面试（查看完整记录）
                  </button>
                )}
              </>
            )}
          </div>
        )}

        {/* 面试结束后的总结面板（仅在用户点过"完成面试"后出现） */}
        {manualFinished && (
          <div className="bg-white rounded-xl shadow-md p-6 mb-4 border-2 border-yellow-300 text-center">
            <div className="text-4xl mb-2">🎉</div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">面试结束！</h3>
            <p className="text-gray-600">你完成了全部 3 轮对话</p>
            <p className="text-sm text-gray-500 mt-2">
              完整的对话记录已保存在上方，可以随时回看 👆
            </p>
          </div>
        )}

        {/* 错误提示 */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            ❌ {error}
            {error.includes('白名单') && (
              <div className="mt-2 text-sm">
                💡 这是一个测试功能，目前仅会员可用
              </div>
            )}
          </div>
        )}

        {/* 重新开始按钮 */}
        {messages.length > 0 && (
          <button
            onClick={handleRestart}
            className="w-full mt-4 text-sm text-gray-600 hover:text-gray-800 py-2"
          >
            🔄 重新开始面试
          </button>
        )}
      </div>
    </main>
  );
}

// 默认导出：包在 Suspense 里（Next.js 16 要求）
export default function InterviewPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">加载中...</div>
      </main>
    }>
      <InterviewPageInner />
    </Suspense>
  );
}