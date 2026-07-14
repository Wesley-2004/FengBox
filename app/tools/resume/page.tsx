'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Diagnosis {
  category: string;
  score: number;
  verdict: string;
  comment: string;
}

interface Comparison {
  original: string;
  rewritten: string;
  reason: string;
}

interface OptimizeResult {
  targetJob: string;
  overallScore: number;
  overallVerdict: string;
  diagnosis: Diagnosis[];
  comparisons: Comparison[];
  rewrite: string;
  summary: string;
}

const SAMPLE_RESUME = `张三
3 年经验 | 前端开发工程师
邮箱：zhangsan@example.com | 电话：138-0000-0000

【教育背景】
北京大学 计算机科学与技术 本科 2015-2019

【工作经历】
ABC科技有限公司 前端开发工程师 2020-至今
- 负责公司官网开发
- 参与了多个项目
- 协助团队完成日常工作
- 修复了一些 bug

【项目经验】
电商平台项目 2021
- 使用 React 开发前端页面
- 和后端配合完成 API 对接
- 项目按时上线

【技能】
JavaScript, HTML, CSS, React

【自我评价】
工作认真负责，学习能力强，具有良好的团队合作精神。`;

const VERDICT_COLOR: Record<string, string> = {
  '优秀': 'bg-green-100 text-green-800 border-green-300',
  '良好': 'bg-blue-100 text-blue-800 border-blue-300',
  '需改进': 'bg-yellow-100 text-yellow-800 border-yellow-300',
  '重大问题': 'bg-red-100 text-red-800 border-red-300',
};

function getVerdictColor(verdict: string): string {
  return VERDICT_COLOR[verdict] || 'bg-gray-100 text-gray-800 border-gray-300';
}

function getScoreColor(score: number): string {
  if (score >= 85) return 'text-green-600';
  if (score >= 70) return 'text-blue-600';
  if (score >= 55) return 'text-yellow-600';
  return 'text-red-600';
}

// 把 markdown 转成纯文本（用于"一键复制"功能）
// 用户复制后粘到 Word/微信就直接能用，不用手动去符号
function stripMarkdown(text: string): string {
  return text
    .replace(/^#+\s*/gm, '')           // 去掉 # ## ### 标题符号
    .replace(/^-\s*/gm, '')            // 去掉 - 列表符号
    .replace(/\*\*(.+?)\*\*/g, '$1')    // 去掉 **粗体** 保留内容
    .replace(/`([^`]+)`/g, '$1')       // 去掉 `代码` 符号
    .replace(/\n{3,}/g, '\n\n')        // 多个连续换行合并为 2 个
    .trim();
}

// 把 markdown 转成 JSX（用于页面显示，看起来像正式简历）
// 用户看到的是专业排版，不是 markdown 源码
function formatResume(text: string) {
  const lines = text.split('\n');
  const elements: React.ReactElement[] = [];
  let listBuffer: string[] = [];

  const flushList = () => {
    if (listBuffer.length > 0) {
      elements.push(
        <ul key={`ul-${elements.length}`} className="mb-4 ml-2 space-y-1.5">
          {listBuffer.map((item, i) => (
            <li key={i} className="flex gap-2 leading-relaxed">
              <span className="text-brand-600 mt-1.5 flex-shrink-0">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      );
      listBuffer = [];
    }
  };

  lines.forEach((line, i) => {
    const trimmed = line.trim();

    // 空行 → 段落分隔
    if (trimmed === '') {
      flushList();
      elements.push(<div key={`br-${i}`} className="h-2" />);
      return;
    }

    // 一级标题（# xxx）— 大标题居中
    if (line.startsWith('# ')) {
      flushList();
      const text = line.slice(2).replace(/\*\*(.+?)\*\*/g, '$1');
      elements.push(
        <h1
          key={i}
          className="text-3xl font-bold text-center mt-6 mb-6 text-gray-900"
        >
          {text}
        </h1>
      );
      return;
    }

    // 二级标题（## xxx）— 带分隔线
    if (line.startsWith('## ')) {
      flushList();
      const text = line.slice(3).replace(/\*\*(.+?)\*\*/g, '$1');
      elements.push(
        <h2
          key={i}
          className="text-xl font-bold text-gray-900 mt-6 mb-3 pb-2 border-b-2 border-brand-500"
        >
          {text}
        </h2>
      );
      return;
    }

    // 三级标题（### xxx）— 略小加粗
    if (line.startsWith('### ')) {
      flushList();
      const text = line.slice(4).replace(/\*\*(.+?)\*\*/g, '$1');
      elements.push(
        <h3 key={i} className="text-base font-semibold text-gray-800 mt-4 mb-2">
          {text}
        </h3>
      );
      return;
    }

    // 列表项（- xxx）— 收集到 listBuffer
    if (line.startsWith('- ')) {
      const text = line.slice(2).replace(/\*\*(.+?)\*\*/g, '$1');
      listBuffer.push(text);
      return;
    }

    // 其他行当作段落
    flushList();
    const text = line.replace(/\*\*(.+?)\*\*/g, '$1');
    elements.push(
      <p key={i} className="leading-relaxed text-gray-800 mb-2">
        {text}
      </p>
    );
  });
  flushList();

  return <>{elements}</>;
}

export default function ResumePage() {
  const router = useRouter();
  const [resume, setResume] = useState('');
  const [targetJob, setTargetJob] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<OptimizeResult | null>(null);
  const [uploading, setUploading] = useState(false);
  const [copiedRewrite, setCopiedRewrite] = useState(false);
  const [copiedComparison, setCopiedComparison] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      setError('请上传 PDF 文件（暂不支持 Word）');
      return;
    }
    setUploading(true);
    setError('');
    try {
      const text = await extractTextFromPDF(file);
      setResume('[UPLOADED]' + text);
      setError('');
    } catch (err) {
      console.error('PDF 解析失败:', err);
      setError('PDF 解析失败，请尝试复制粘贴文本');
    } finally {
      setUploading(false);
    }
  };

  const extractTextFromPDF = async (file: File): Promise<string> => {
    const pdfjsLib = await import('pdfjs-dist');
    pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.min.mjs',
      import.meta.url
    ).toString();
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      fullText += pageText + '\n';
    }
    return fullText.trim();
  };

  const handleSubmit = async () => {
    const actualResume = resume.startsWith('[UPLOADED]') ? resume.replace('[UPLOADED]', '') : resume;
    if (!actualResume.trim() || actualResume.trim().length < 50) {
      setError('请粘贴简历内容（至少 50 字）');
      return;
    }
    if (!targetJob.trim()) {
      setError('请填写目标岗位（让 AI 给更精准的建议）');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);
    setCopiedRewrite(false);
    setCopiedComparison(null);

    try {
      const response = await fetch('/api/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resume: actualResume, targetJob: targetJob.trim() }),
      });

      const data = await response.json();

      if (data.success) {
        setResult({
          targetJob: data.targetJob,
          overallScore: data.overallScore || 0,
          overallVerdict: data.overallVerdict || '',
          diagnosis: data.diagnosis || [],
          comparisons: data.comparisons || [],
          rewrite: data.rewrite || '',
          summary: data.summary || '',
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

  const fillExample = () => {
    setResume(SAMPLE_RESUME);
    setTargetJob('高级前端开发工程师');
  };

  // 进入 AI 面试官（用 URL 参数传简历）
  const enterInterview = () => {
    if (!result?.rewrite || !targetJob.trim()) {
      setError('请先生成简历再进入面试官');
      return;
    }
    const encodedRewrite = encodeURIComponent(result.rewrite);
    const encodedJob = encodeURIComponent(targetJob.trim());
    router.push(`/tools/resume/interview?rewrite=${encodedRewrite}&job=${encodedJob}`);
  };

  // 兜底计算：AI 没返回 overallScore 时，从 5 项诊断算平均
  const displayedOverallScore = result
    ? (result.overallScore > 0
        ? result.overallScore
        : result.diagnosis.length > 0
          ? Math.round(
              result.diagnosis.reduce((sum, d) => sum + d.score, 0) /
                result.diagnosis.length
            )
          : 0)
    : 0;

  const copyRewrite = async () => {
    if (!result?.rewrite) return;
    try {
      // 把 markdown 转成干净的纯文本（用户粘到 Word/微信就能用）
      const plainText = stripMarkdown(result.rewrite);
      await navigator.clipboard.writeText(plainText);
      setCopiedRewrite(true);
      setTimeout(() => setCopiedRewrite(false), 2000);
    } catch (err) {
      setError('复制失败，请手动选择文字复制');
    }
  };

  const copyComparison = async (text: string, idx: number) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedComparison(idx);
      setTimeout(() => setCopiedComparison(null), 2000);
    } catch (err) {
      setError('复制失败');
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        {/* 返回链接 */}
        {/* 标题 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <span className="text-3xl">📄</span>
            <h1 className="text-3xl font-bold text-gray-800">AI 简历优化</h1>
          </div>
          <p className="text-gray-600">不只是建议 — 直接给你高分改写版，可复制使用</p>
        </div>

        {/* 输入区 */}
        {!result && (
          <div className="bg-white rounded-xl shadow-md p-6 mb-6">
            {/* 目标岗位 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                目标岗位 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={targetJob}
                onChange={(e) => setTargetJob(e.target.value)}
                placeholder="例如：高级前端开发工程师 / 产品经理 / 数据分析师"
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
              <p className="mt-1 text-xs text-gray-500">
                不同岗位的简历逻辑不一样，前端侧重项目，后端侧重技术栈
              </p>
            </div>

            {/* 简历内容 */}
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  简历内容
                </label>
                <div className="flex gap-3 text-sm">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="text-blue-600 hover:text-blue-700 disabled:text-gray-400"
                  >
                    {uploading ? '⏳ 解析中...' : '📎 上传 PDF'}
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/pdf"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <button
                    onClick={fillExample}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    📝 填入示例
                  </button>
                </div>
              </div>
              {resume && !resume.startsWith('[UPLOADED]') ? (
                <textarea
                  value={resume}
                  onChange={(e) => setResume(e.target.value)}
                  placeholder="把你的简历内容粘贴到这里..."
                  className="w-full h-64 p-4 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 font-mono text-sm"
                />
              ) : resume.startsWith('[UPLOADED]') ? (
                <div className="w-full h-64 p-6 border-2 border-dashed border-green-300 bg-green-50 rounded-lg flex flex-col items-center justify-center">
                  <div className="text-5xl mb-3">✅</div>
                  <div className="text-lg font-semibold text-green-800 mb-2">
                    简历已成功上传
                  </div>
                  <div className="text-sm text-green-700">
                    共解析 {resume.replace('[UPLOADED]', '').length} 字
                  </div>
                </div>
              ) : (
                <textarea
                  value=""
                  onChange={(e) => setResume(e.target.value)}
                  placeholder="把你的简历内容粘贴到这里..."
                  className="w-full h-64 p-4 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-400 font-mono text-sm"
                />
              )}
            </div>

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition"
            >
              {loading ? '⏳ AI 深度分析中（约 20-30 秒）...' : '🚀 开始深度优化'}
            </button>

            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                ❌ {error}
              </div>
            )}
          </div>
        )}

        {/* 结果区 */}
        {result && (
          <div className="space-y-4">
            {/* 顶部操作按钮 */}
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-800">
                ✨ 针对「{result.targetJob}」的诊断
              </h2>
              <button
                onClick={() => {
                  setResult(null);
                  setResume('');
                  setTargetJob('');
                  setError('');
                }}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                ← 换一份简历
              </button>
            </div>

            {/* 1. 总览评分 */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800">📊 综合评分</h3>
                <div className={`text-5xl font-bold ${getScoreColor(displayedOverallScore)}`}>
                  {displayedOverallScore}
                  <span className="text-lg text-gray-500">/100</span>
                </div>
              </div>
              <p className="text-gray-700 leading-relaxed">
                {result.overallVerdict}
              </p>
            </div>

            {/* 2. 5 个分项评分 */}
            {result.diagnosis.length > 0 && (
              <div className="bg-white rounded-xl shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  🔍 分项诊断
                </h3>
                <div className="space-y-3">
                  {result.diagnosis.map((d, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-blue-300 transition"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-gray-800">
                            {d.category}
                          </span>
                          <span
                            className={`text-xs px-2 py-0.5 rounded border ${getVerdictColor(d.verdict)}`}
                          >
                            {d.verdict}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">{d.comment}</p>
                      </div>
                      <div className={`text-3xl font-bold ${getScoreColor(d.score)} ml-4`}>
                        {d.score}
                        <span className="text-sm text-gray-400">/100</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 3. 原文 vs 改写 对比 */}
            {result.comparisons.length > 0 && (
              <div className="bg-white rounded-xl shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  ✏️ 最弱的几段 — AI 帮你改写
                </h3>
                <div className="space-y-4">
                  {result.comparisons.map((c, i) => (
                    <div
                      key={i}
                      className="border border-gray-200 rounded-lg overflow-hidden"
                    >
                      {/* 原文 */}
                      <div className="bg-red-50 px-4 py-3 border-b border-gray-200">
                        <div className="text-xs font-semibold text-red-700 mb-1">
                          ❌ 原文
                        </div>
                        <div className="text-gray-700 text-sm">{c.original}</div>
                      </div>
                      {/* 改写 */}
                      <div className="bg-green-50 px-4 py-3 border-b border-gray-200">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="text-xs font-semibold text-green-700 mb-1">
                              ✅ 改写
                            </div>
                            <div className="text-gray-800 text-sm leading-relaxed">
                              {c.rewritten}
                            </div>
                          </div>
                          <button
                            onClick={() => copyComparison(c.rewritten, i)}
                            className="flex-shrink-0 px-3 py-1 bg-white hover:bg-green-100 text-green-700 rounded text-xs border border-green-300"
                          >
                            {copiedComparison === i ? '✅ 已复制' : '📋 复制'}
                          </button>
                        </div>
                      </div>
                      {/* 改写理由 */}
                      <div className="bg-gray-50 px-4 py-2 text-xs text-gray-600">
                        💡 <strong>为什么这样改：</strong>{c.reason}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 4. 完整改写版 */}
            {result.rewrite && (
              <div className="bg-white rounded-xl shadow-md p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-800">
                    📝 AI 重写的高分简历
                  </h3>
                  <button
                    onClick={copyRewrite}
                    className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-sm font-medium"
                  >
                    {copiedRewrite ? '✅ 已复制' : '📋 一键复制全部'}
                  </button>
                </div>
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-6 text-gray-800 leading-relaxed font-sans">
                  {formatResume(result.rewrite)}
                </div>
                <p className="text-xs text-gray-500 mt-3 text-center">
                  复制后可直接粘贴到简历编辑器或邮件中使用
                </p>

                {/* 进入 AI 面试官 */}
                <button
                  onClick={enterInterview}
                  className="w-full mt-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition shadow-md"
                >
                  🎤 进入 AI 模拟面试官
                  <span className="block text-xs font-normal mt-1 opacity-90">
                    基于这份改写后的简历，AI 面试官会对你提问（会员功能）
                  </span>
                </button>
              </div>
            )}

            {/* 5. 总结 */}
            {result.summary && (
              <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-3">
                  🎯 AI 给你的总结
                </h3>
                <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                  {result.summary}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
