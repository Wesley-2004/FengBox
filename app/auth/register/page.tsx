'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // 验证密码
    if (password !== confirmPassword) {
      setError('两次密码输入不一致');
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setError('密码至少 6 位');
      setLoading(false);
      return;
    }

    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (error) {
        setError(error.message);
        return;
      }

      // 如果需要邮箱验证
      if (data.user && !data.session) {
        setSuccess(true);
      } else {
        // 直接登录成功
        router.push('/');
        router.refresh();
      }
    } catch (err) {
      setError('注册失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-blue-50 to-indigo-100 flex items-center justify-center px-4 py-12">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md text-center">
          <div className="text-6xl mb-4">📧</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            验证邮件已发送！
          </h2>
          <p className="text-gray-600 mb-6">
            我们已向 <strong>{email}</strong> 发送了一封验证邮件。
            <br />
            请点击邮件中的链接完成注册，然后登录。
          </p>
          <Link
            href="/auth/login"
            className="inline-block bg-brand-600 hover:bg-brand-700 text-white font-semibold py-2 px-6 rounded-lg transition"
          >
            前往登录
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-blue-50 to-indigo-100 flex items-center justify-center px-4 py-12">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-block">
            <h1 className="text-3xl font-bold text-brand-600 mb-2">FengBox</h1>
          </Link>
          <p className="text-gray-600">创建账号</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              邮箱
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="your@email.com"
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              密码
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="至少 6 位"
              minLength={6}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              确认密码
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              placeholder="再次输入密码"
              minLength={6}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              ❌ {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-600 hover:bg-brand-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition"
          >
            {loading ? '⏳ 注册中...' : '✨ 创建账号'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-600">
          已有账号？
          <Link href="/auth/login" className="text-brand-600 hover:underline ml-1">
            立即登录
          </Link>
        </div>
      </div>
    </main>
  );
}