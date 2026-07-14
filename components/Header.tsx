'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import AuthNav from './AuthNav';

// 顶部导航菜单 — 前两项有内容，后几项占位（未来扩展）
const NAV_ITEMS = [
  { href: '/', label: '首页' },
  { href: '/#tools', label: 'AI 工具' },
  { href: '/#scenarios', label: '场景', disabled: true },
  { href: '/#rankings', label: '排行榜', disabled: true },
  { href: '/#api', label: 'API', disabled: true },
  { href: '/#help', label: '帮助中心', disabled: true },
];

export default function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-gray-200/70 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        {/* 品牌 */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center text-white font-bold text-sm">
            F
          </div>
          <div className="leading-tight">
            <div className="text-base font-bold text-gray-900">FengBox</div>
            <div className="text-[10px] text-gray-500 -mt-0.5">AI 工具集合</div>
          </div>
        </Link>

        {/* 中间菜单 */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV_ITEMS.map((item) => {
            const isActive = item.href === '/' ? pathname === '/' : false;
            const className = `px-3 py-2 text-sm rounded-md transition ${
              item.disabled
                ? 'text-gray-400 cursor-not-allowed'
                : isActive
                ? 'text-gray-900 font-medium bg-gray-100'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`;
            if (item.disabled) {
              return (
                <span key={item.label} className={className} title="敬请期待">
                  {item.label}
                </span>
              );
            }
            return (
              <Link key={item.label} href={item.href} className={className}>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* 右侧登录区 — 复用 AuthNav 组件 */}
        <div className="shrink-0">
          <AuthNav />
        </div>
      </div>
    </header>
  );
}