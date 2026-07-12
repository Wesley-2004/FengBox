'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/login`,
      });

      if (error) {
        setError(error.message);
        return;
      }

      setSuccess(true);
    } catch (err) {
      setError('发送失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-blue-50 to-indigo-100 flex items-center justify-center px-4 py-12">
        <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md text-center">
          <div className="text-6xl mb-4">📬</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            重置链接已发送
          </h2>
          <p className="text-gray-600 mb-6">
            我们已向 <strong>{email}</strong> 发送了一封密码重置邮件。
            <br />
            请点击邮件中的链接重置密码。
          </p>
          <Link
            href="/auth/login"
            className="inline-block bg-brand-600 hover:bg-brand-700 text-white font-semibold py-2 px-6 rounded-lg transition"
          >
            返回登录
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
          <p className="text-gray-600">重置密码</p>
        </div>

        <p className="text-sm text-gray-600 mb-6">
          输入你注册时使用的邮箱，我们会发送一个密码重置链接给你。
        </p>

        <form onSubmit={handleReset} className="space-y-4">
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
            {loading ? '⏳ 发送中...' : '📧 发送重置链接'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm">
          <Link href="/auth/login" className="text-gray-500 hover:text-brand-600">
            ← 返回登录
          </Link>
        </div>
      </div>
    </main>
  );
}