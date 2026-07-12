'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';

export default function AuthNav() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    // 获取当前登录状态
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      setLoading(false);
    });

    // 监听登录状态变化
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setShowMenu(false);
    window.location.reload();
  };

  if (loading) {
    return (
      <div className="text-sm text-gray-400">...</div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center gap-3">
        <Link
          href="/auth/login"
          className="text-sm text-gray-600 hover:text-brand-600"
        >
          登录
        </Link>
        <Link
          href="/auth/register"
          className="text-sm bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg transition"
        >
          注册
        </Link>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="flex items-center gap-2 text-sm text-gray-700 hover:text-brand-600"
      >
        <span className="w-8 h-8 bg-brand-100 text-brand-700 rounded-full flex items-center justify-center font-medium">
          {user.email?.charAt(0).toUpperCase() || '👤'}
        </span>
        <span className="hidden sm:inline">{user.email?.split('@')[0]}</span>
      </button>

      {showMenu && (
        <>
          {/* 背景遮罩 */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowMenu(false)}
          />

          {/* 下拉菜单 */}
          <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
            <div className="px-4 py-3 border-b border-gray-100">
              <div className="text-xs text-gray-500">已登录</div>
              <div className="text-sm font-medium text-gray-800 truncate">
                {user.email}
              </div>
            </div>

            <div className="py-1">
              <div className="px-4 py-2 text-xs text-gray-500">
                💎 会员功能开发中
              </div>
              <button
                disabled
                className="w-full text-left px-4 py-2 text-sm text-gray-400 cursor-not-allowed"
              >
                ⭐ 升级会员（即将上线）
              </button>
            </div>

            <div className="border-t border-gray-100 py-1">
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                🚪 退出登录
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}