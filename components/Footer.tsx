import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="mt-24 border-t border-gray-200 bg-white">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-3">产品</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li><Link href="/tools/resume" className="hover:text-gray-900">AI 简历优化</Link></li>
              <li><Link href="/tools/fitness" className="hover:text-gray-900">AI 健身教练</Link></li>
              <li><Link href="/tools/recipe" className="hover:text-gray-900">AI 菜谱生成</Link></li>
              <li><Link href="/" className="hover:text-gray-900">查看全部 →</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-3">资源</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li><Link href="/guide" className="hover:text-gray-900">使用指南</Link></li>
              <li><Link href="/prompts" className="hover:text-gray-900">提示词模板</Link></li>
              <li><Link href="/changelog" className="hover:text-gray-900">更新日志</Link></li>
              <li><Link href="/faq" className="hover:text-gray-900">常见问题</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-3">关于</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li><Link href="/about" className="hover:text-gray-900">关于 FengBox</Link></li>
              <li><Link href="/privacy" className="hover:text-gray-900">隐私政策</Link></li>
              <li><Link href="/terms" className="hover:text-gray-900">服务条款</Link></li>
              <li>
                <a href="mailto:hello@fengbox.example.com" className="hover:text-gray-900">
                  联系我们
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-3">FengBox</h4>
            <p className="text-sm text-gray-600 leading-relaxed">
              一站式 AI 工具集合，让每个人都能用上好用的 AI。
            </p>
          </div>
        </div>
        <div className="pt-6 border-t border-gray-100 flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-gray-500">
          <div>© {new Date().getFullYear()} FengBox · 由 Next.js + DeepSeek 驱动</div>
          <div className="flex items-center gap-3">
            <a
              href="https://github.com/Wesley-2004/FengBox"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-gray-900"
            >
              GitHub ↗
            </a>
            <span>·</span>
            <span>Made with ❤️ for AI 时代</span>
          </div>
        </div>
      </div>
    </footer>
  );
}