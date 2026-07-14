'use client';

import { useState } from 'react';
import Link from 'next/link';

// ---------- 折叠项 ----------
export function AccordionItem({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left hover:bg-gray-50 transition"
      >
        <span className="font-medium text-gray-900">{title}</span>
        <span
          className={`shrink-0 text-gray-400 transition-transform ${
            open ? 'rotate-180' : ''
          }`}
          aria-hidden
        >
          ▼
        </span>
      </button>
      {open && (
        <div className="px-5 pb-5 border-t border-gray-100 pt-4 text-sm text-gray-700 leading-relaxed">
          {children}
        </div>
      )}
    </div>
  );
}

// ---------- 折叠页外壳：标题区 + 多个折叠项 ----------
export function AccordionPage({
  title,
  description,
  updatedAt,
  children,
}: {
  title: string;
  description?: string;
  updatedAt?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <div className="mb-10 pb-8 border-b border-gray-200">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-3 tracking-tight">
          {title}
        </h1>
        {description && (
          <p className="text-lg text-gray-600 leading-relaxed">{description}</p>
        )}
        {updatedAt && (
          <div className="mt-4 text-xs text-gray-400">最后更新：{updatedAt}</div>
        )}
      </div>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

// ---------- Prose 全文样式包装（MDX 全文页面用）----------
function MDXProse({ children }: { children: React.ReactNode }) {
  return (
    <article className="prose prose-gray max-w-none prose-headings:font-bold prose-h1:text-3xl prose-h1:mt-8 prose-h2:text-2xl prose-h2:mt-8 prose-h3:text-xl prose-h3:mt-6 prose-p:text-gray-700 prose-p:leading-relaxed prose-li:text-gray-700 prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline prose-strong:text-gray-900 prose-code:bg-gray-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:before:content-none prose-code:after:content-none prose-pre:bg-gray-50 prose-pre:border prose-pre:border-gray-200 prose-table:text-sm prose-th:text-left prose-th:font-semibold prose-th:bg-gray-50 prose-blockquote:border-l-4 prose-blockquote:border-gray-300 prose-blockquote:bg-gray-50 prose-blockquote:py-1 prose-blockquote:px-4 prose-blockquote:not-italic prose-hr:border-gray-200">
      {children}
    </article>
  );
}

// ---------- MDX 全文页面布局（关于 / 更新日志 / 隐私 / 条款）----------
export function MDXPage({
  title,
  description,
  updatedAt,
  children,
}: {
  title: string;
  description?: string;
  updatedAt?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <nav className="text-sm text-gray-500 mb-8">
        <Link href="/" className="hover:text-gray-900">首页</Link>
        <span className="mx-2">/</span>
        <span className="text-gray-700">{title}</span>
      </nav>
      <header className="mb-10 pb-8 border-b border-gray-200">
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-3 tracking-tight">
          {title}
        </h1>
        {description && (
          <p className="text-lg text-gray-600 leading-relaxed">{description}</p>
        )}
        {updatedAt && (
          <div className="mt-4 text-xs text-gray-400">最后更新：{updatedAt}</div>
        )}
      </header>
      <MDXProse>{children}</MDXProse>
    </div>
  );
}