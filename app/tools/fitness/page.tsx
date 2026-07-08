'use client';

import { useState } from 'react';
import Link from 'next/link';

const BROAD_GOALS = [
  { value: '减脂减肥', label: '减脂减肥' },
  { value: '增肌塑形', label: '增肌塑形' },
  { value: '提高体能', label: '提高体能' },
  { value: '保持健康', label: '保持健康' },
];

export default function FitnessPage() {
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [broadGoal, setBroadGoal] = useState('');
  const [specificGoal, setSpecificGoal] = useState('');
  const [wantWorkout, setWantWorkout] = useState(true);
  const [wantNutrition, setWantNutrition] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<{
    bmi: number;
    bmiCategory: { label: string; color: string; advice: string };
    plan: string;
  } | null>(null);

  // 实时计算 BMI（仅作显示，不提交）
  const heightNum = parseFloat(height);
  const weightNum = parseFloat(weight);
  const liveBMI =
    heightNum > 0 && weightNum > 0
      ? (weightNum / Math.pow(heightNum / 100, 2)).toFixed(1)
      : null;
  const liveBMICategory = liveBMI ? getBMILabel(parseFloat(liveBMI)) : null;

  const handleSubmit = async () => {
    setError('');

    if (!height || !weight) {
      setError('请填写身高和体重');
      return;
    }
    if (!broadGoal) {
      setError('请选择健身目的');
      return;
    }
    if (!wantWorkout && !wantNutrition) {
      setError('请至少选择一种输出类型（运动计划 / 营养搭配）');
      return;
    }

    const outputTypes: string[] = [];
    if (wantWorkout) outputTypes.push('workout');
    if (wantNutrition) outputTypes.push('nutrition');

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/fitness', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          height: parseFloat(height),
          weight: parseFloat(weight),
          broadGoal,
          specificGoal,
          outputTypes,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setResult({
          bmi: data.bmi,
          bmiCategory: data.bmiCategory,
          plan: data.plan,
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
    setHeight('175');
    setWeight('70');
    setBroadGoal('减脂减肥');
    setSpecificGoal('想瘦肚子，最好有点腹肌线条');
    setWantWorkout(true);
    setWantNutrition(true);
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
            <span className="text-3xl">💪</span>
            <h1 className="text-3xl font-bold text-gray-800">AI 健身教练</h1>
          </div>
          <p className="text-gray-600">输入身体数据和目标，AI 为你定制健身方案</p>
        </div>

        {/* 免责声明 */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-6 text-xs text-yellow-800">
          ⚠️ 本工具仅供参考，不能替代专业医生或健身教练。如有健康问题请咨询专业人士。
        </div>

        {/* 输入区 */}
        {!result && (
          <div className="bg-white rounded-xl shadow-md p-6 mb-6">
            {/* 身高体重 */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  身高 (cm)
                </label>
                <input
                  type="number"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  placeholder="例如 175"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  体重 (kg)
                </label>
                <input
                  type="number"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  placeholder="例如 70"
                  className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* 实时 BMI */}
            {liveBMI && liveBMICategory && (
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
                📊 你的 BMI：<strong>{liveBMI}</strong>
                <span
                  className={`ml-2 px-2 py-0.5 rounded text-xs ${getBMIBadgeClass(
                    liveBMICategory.color
                  )}`}
                >
                  {liveBMICategory.label}
                </span>
                <span className="ml-2 text-gray-600">{liveBMICategory.advice}</span>
              </div>
            )}

            {/* 健身目的 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                健身目的 <span className="text-gray-400">（选一个宽泛目的）</span>
              </label>
              <select
                value={broadGoal}
                onChange={(e) => setBroadGoal(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">请选择...</option>
                {BROAD_GOALS.map((g) => (
                  <option key={g.value} value={g.value}>
                    {g.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                具体目标 <span className="text-gray-400">（可选，描述更精准）</span>
              </label>
              <input
                type="text"
                value={specificGoal}
                onChange={(e) => setSpecificGoal(e.target.value)}
                placeholder="例如：练腹肌、瘦小腿"
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* 输出类型 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                输出类型 <span className="text-gray-400">（可多选）</span>
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={wantWorkout}
                    onChange={(e) => setWantWorkout(e.target.checked)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span>🏃 运动计划</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={wantNutrition}
                    onChange={(e) => setWantNutrition(e.target.checked)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span>🥗 营养搭配</span>
                </label>
              </div>
            </div>

            {/* 操作按钮 */}
            <div className="flex gap-3">
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition"
              >
                {loading ? '⏳ AI 生成中（约 15-30 秒）...' : '🚀 生成方案'}
              </button>
              <button
                onClick={fillExample}
                className="px-4 py-3 border border-gray-300 hover:bg-gray-50 rounded-lg text-sm text-gray-700"
              >
                📝 填入示例
              </button>
            </div>

            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                ❌ {error}
              </div>
            )}
          </div>
        )}

        {/* 结果区 */}
        {result && (
          <div>
            <button
              onClick={() => setResult(null)}
              className="mb-4 text-blue-600 hover:text-blue-700 font-medium"
            >
              ← 重新生成
            </button>

            {/* BMI 卡片 */}
            <div className="bg-white rounded-xl shadow-md p-6 mb-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-3">📊 你的身体状态</h2>
              <div className="flex items-center gap-4 mb-2">
                <div className="text-4xl font-bold text-blue-600">{result.bmi}</div>
                <div>
                  <div className="text-sm text-gray-500">BMI 指数</div>
                  <span
                    className={`inline-block mt-1 px-2 py-0.5 rounded text-sm ${getBMIBadgeClass(
                      result.bmiCategory.color
                    )}`}
                  >
                    {result.bmiCategory.label}
                  </span>
                </div>
              </div>
              <p className="text-gray-600 text-sm mt-2">{result.bmiCategory.advice}</p>
            </div>

            {/* AI 方案 */}
            <div className="bg-white rounded-xl shadow-md p-6">
              <h2 className="text-2xl font-bold text-gray-800 mb-4">💪 AI 健身方案</h2>
              <div className="prose prose-sm max-w-none whitespace-pre-wrap text-gray-800 leading-relaxed">
                {result.plan}
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

// 工具函数
function getBMILabel(bmi: number): { label: string; color: string; advice: string } {
  if (bmi < 18.5) {
    return { label: '偏瘦', color: 'blue', advice: '建议增加营养摄入并配合力量训练' };
  } else if (bmi < 24) {
    return { label: '正常', color: 'green', advice: '请继续保持规律运动和均衡饮食' };
  } else if (bmi < 28) {
    return { label: '超重', color: 'yellow', advice: '建议增加有氧运动并控制饮食' };
  } else {
    return { label: '肥胖', color: 'red', advice: '建议循序渐进，必要时咨询专业医生' };
  }
}

function getBMIBadgeClass(color: string): string {
  switch (color) {
    case 'green':
      return 'bg-green-100 text-green-800';
    case 'yellow':
      return 'bg-yellow-100 text-yellow-800';
    case 'red':
      return 'bg-red-100 text-red-800';
    case 'blue':
    default:
      return 'bg-blue-100 text-blue-800';
  }
}
