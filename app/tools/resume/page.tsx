'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';

interface Scores {
  content: number;
  ats: number;
  hrReadability: number;
  keywordMatch: number;
}

interface ScoreResult {
  scores: Scores;
  overall: number;
  strengths: string[];
  weaknesses: string[];
}

interface Suggestion {
  priority: 'high' | 'medium' | 'low';
  category: string;
  issue: string;
  suggestion: string;
  reason: string;
}

interface ParsedData {
  basicInfo?: {
    name?: string;
    experience?: string;
    currentTitle?: string;
    industry?: string;
  };
  summary?: string;
}

interface OptimizationResult {
  parsed: ParsedData;
  scores: ScoreResult;
  suggestions: Suggestion[];
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

export default function ResumePage() {
  const [resume, setResume] = useState('');
  const [targetJob, setTargetJob] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<OptimizationResult | null>(null);
  const [uploading, setUploading] = useState(false);
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

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await fetch('/api/optimize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resume: actualResume, targetJob }),
      });

      const data = await response.json();

      if (data.success) {
        setResult({
          parsed: data.parsed,
          scores: data.scores,
          suggestions: data.suggestions,
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

  const fillSample = () => setResume(SAMPLE_RESUME);

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header with back link */}
        <div className="mb-6">
          <Link href="/" className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1">
            ← 返回 FengBox 首页
          </Link>
        </div>

        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <span className="text-3xl">📄</span>
            <h1 className="text-3xl font-bold text-gray-800">AI 简历优化</h1>
          </div>
          <p className="text-gray-600">上传简历，AI 多维度评分 + 具体优化建议</p>
        </div>

        {/* Input Section */}
        {!result && (
          <div className="bg-white rounded-xl shadow-md p-6 mb-6">
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                目标岗位 <span className="text-gray-400">（可选）</span>
              </label>
              <input
                type="text"
                value={targetJob}
                onChange={(e) => setTargetJob(e.target.value)}
                placeholder="例如：高级前端开发工程师"
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

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
                    onClick={fillSample}
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
                  className="w-full h-80 p-4 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                />
              ) : resume.startsWith('[UPLOADED]') ? (
                <div className="w-full h-80 p-6 border-2 border-dashed border-green-300 bg-green-50 rounded-lg flex flex-col items-center justify-center">
                  <div className="text-5xl mb-3">✅</div>
                  <div className="text-lg font-semibold text-green-800 mb-2">
                    简历已成功上传
                  </div>
                  <div className="text-sm text-green-700">
                    共解析 {resume.replace('[UPLOADED]', '').length} 字
                  </div>
                  <div className="text-xs text-green-600 mt-2">
                    点击下方"开始优化"按钮即可获得 AI 评分与建议
                  </div>
                </div>
              ) : (
                <textarea
                  value=""
                  onChange={(e) => setResume(e.target.value)}
                  placeholder="把你的简历内容粘贴到这里..."
                  className="w-full h-80 p-4 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                />
              )}
            </div>

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition"
            >
              {loading ? '⏳ AI 分析中（约 10-20 秒）...' : '🚀 开始优化'}
            </button>

            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                ❌ {error}
              </div>
            )}
          </div>
        )}

        {/* Results */}
        {result && (
          <div>
            <button
              onClick={() => setResult(null)}
              className="mb-4 text-blue-600 hover:text-blue-700 font-medium"
            >
              ← 重新优化
            </button>

            <div className="bg-white rounded-xl shadow-md p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-800">📊 综合评分</h2>
                <div className="text-4xl font-bold text-blue-600">
                  {result.scores.overall}
                  <span className="text-lg text-gray-500">/100</span>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <ScoreCard label="内容完整性" score={result.scores.scores.content} />
                <ScoreCard label="ATS 友好度" score={result.scores.scores.ats} />
                <ScoreCard label="HR 阅读体验" score={result.scores.scores.hrReadability} />
                <ScoreCard label="关键词匹配" score={result.scores.scores.keywordMatch} />
              </div>

              {result.scores.strengths?.length > 0 && (
                <div className="mt-6">
                  <h3 className="font-semibold text-green-700 mb-2">✅ 优点</h3>
                  <ul className="space-y-1">
                    {result.scores.strengths.map((s, i) => (
                      <li key={i} className="text-gray-700">• {s}</li>
                    ))}
                  </ul>
                </div>
              )}

              {result.scores.weaknesses?.length > 0 && (
                <div className="mt-4">
                  <h3 className="font-semibold text-red-700 mb-2">⚠️ 需改进</h3>
                  <ul className="space-y-1">
                    {result.scores.weaknesses.map((s, i) => (
                      <li key={i} className="text-gray-700">• {s}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {result.parsed?.basicInfo?.name && (
              <div className="bg-white rounded-xl shadow-md p-6 mb-6">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">👤 简历解析</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <InfoItem label="姓名" value={result.parsed.basicInfo.name} />
                  <InfoItem label="工作年限" value={result.parsed.basicInfo.experience} />
                  <InfoItem label="当前职位" value={result.parsed.basicInfo.currentTitle} />
                  <InfoItem label="行业" value={result.parsed.basicInfo.industry} />
                </div>
                {result.parsed.summary && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <div className="text-sm text-gray-500 mb-1">整体评价</div>
                    <div className="text-gray-800">{result.parsed.summary}</div>
                  </div>
                )}
              </div>
            )}

            <div className="bg-white rounded-xl shadow-md p-6 mb-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">💡 优化建议</h2>
              <div className="space-y-4">
                {result.suggestions.map((s, i) => (
                  <div
                    key={i}
                    className={`p-4 rounded-lg border-l-4 ${
                      s.priority === 'high'
                        ? 'border-red-500 bg-red-50'
                        : s.priority === 'medium'
                        ? 'border-yellow-500 bg-yellow-50'
                        : 'border-blue-500 bg-blue-50'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className={`text-xs font-bold px-2 py-1 rounded ${
                          s.priority === 'high'
                            ? 'bg-red-200 text-red-800'
                            : s.priority === 'medium'
                            ? 'bg-yellow-200 text-yellow-800'
                            : 'bg-blue-200 text-blue-800'
                        }`}
                      >
                        {s.priority === 'high' ? '高优先级' : s.priority === 'medium' ? '中优先级' : '低优先级'}
                      </span>
                      <span className="text-xs text-gray-500">{s.category}</span>
                    </div>
                    <div className="mb-2">
                      <span className="text-sm font-medium text-gray-600">问题：</span>
                      <span className="text-gray-800">{s.issue}</span>
                    </div>
                    <div className="mb-2">
                      <span className="text-sm font-medium text-gray-600">建议：</span>
                      <span className="text-gray-800">{s.suggestion}</span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-gray-600">为什么：</span>
                      <span className="text-gray-700 text-sm">{s.reason}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function ScoreCard({ label, score }: { label: string; score: number }) {
  const color = score >= 80 ? 'text-green-600' : score >= 60 ? 'text-yellow-600' : 'text-red-600';
  const bg = score >= 80 ? 'bg-green-50' : score >= 60 ? 'bg-yellow-50' : 'bg-red-50';
  return (
    <div className={`${bg} rounded-lg p-3 text-center`}>
      <div className={`text-2xl font-bold ${color}`}>{score}</div>
      <div className="text-xs text-gray-600 mt-1">{label}</div>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div>
      <div className="text-xs text-gray-500">{label}</div>
      <div className="font-medium text-gray-800">{value}</div>
    </div>
  );
}
