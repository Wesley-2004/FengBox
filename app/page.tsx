import Link from 'next/link';

// 工具列表
const TOOLS = [
  {
    id: 'resume',
    name: 'AI 简历优化',
    description: '上传简历，AI 帮你分析并给出优化建议，生成更专业的简历文案。',
    emoji: '📄',
    href: '/tools/resume',
    tag: '求职',
  },
  {
    id: 'fitness',
    name: 'AI 健身教练',
    description: '输入身高体重和健身目标，AI 为你定制运动计划、营养搭配和 7 天周历。',
    emoji: '💪',
    href: '/tools/fitness',
    tag: '健康',
  },
  {
    id: 'recipe',
    name: 'AI 菜谱生成',
    description: '输入食材，AI 推荐多道家常菜，带克数、卡路里和详细步骤。',
    emoji: '🍳',
    href: '/tools/recipe',
    tag: '生活',
  },
  {
    id: 'slogan',
    name: 'AI 口号生成',
    description: '输入关键词，AI 帮你写出朗朗上口的好口号（班级、广告、运动会等 7 大场景）。',
    emoji: '📢',
    href: '/tools/slogan',
    tag: '创作',
  },
  {
    id: 'love',
    name: 'AI 恋爱回复',
    description: '收到对方消息不知道回什么？AI 帮你想几条高情商回复，可选历史聊天记录。',
    emoji: '💕',
    href: '/tools/love',
    tag: '社交',
  },
  {
    id: 'tarot',
    name: 'AI 塔罗占卜',
    description: '凭直觉翻 5 张牌，AI 会先追问你的情况再解读，给出更贴心的指引。',
    emoji: '🔮',
    href: '/tools/tarot',
    tag: '趣味',
  },
  {
    id: 'xiaohongshu',
    name: 'AI 小红书文案',
    description: '输入主题，一键生成可直接发布的小红书爆款文案。',
    emoji: '📕',
    href: '/tools/xiaohongshu',
    tag: '创作',
  },
  {
    id: 'shopping',
    name: 'AI 商品导购',
    description: '想买什么？AI 帮你看参数、避坑，跳转各大平台比价。',
    emoji: '🛒',
    href: '/tools/shopping',
    tag: '购物',
  },
  {
    id: 'weekly',
    name: 'AI 周报生成器',
    description: '输入本周要点，AI 一键整理成可直接提交的完整周报。',
    emoji: '📝',
    href: '/tools/weekly',
    tag: '工作',
  },
];

// 真实数据栏
const STATS = [
  { value: '9', label: '个 AI 工具', desc: '覆盖求职、生活、创作等场景' },
  { value: '7×24', label: '小时在线', desc: '随时可用，无需下载' },
  { value: '免费', label: '每日试用', desc: '每个工具每天 1 次免费使用' },
  { value: 'DeepSeek', label: '驱动', desc: '国内顶级大模型响应' },
];

export default function Home() {
  return (
    <div className="bg-white">
      {/* Hero 区 — 深色块大容器，包住品牌 + slogan + 搜索 */}
      <section className="relative overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-indigo-900 text-white">
        {/* 装饰光晕球 */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* 星点装饰 — 四角散布 */}
        <svg className="absolute top-12 left-12 w-6 h-6 text-indigo-300/60 pointer-events-none" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0L13.5 9L24 12L13.5 15L12 24L10.5 15L0 12L10.5 9Z" />
        </svg>
        <svg className="absolute top-24 right-20 w-4 h-4 text-purple-300/70 pointer-events-none" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0L13.5 9L24 12L13.5 15L12 24L10.5 15L0 12L10.5 9Z" />
        </svg>
        <svg className="absolute bottom-32 left-24 w-5 h-5 text-cyan-300/60 pointer-events-none" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0L13.5 9L24 12L13.5 15L12 24L10.5 15L0 12L10.5 9Z" />
        </svg>
        <svg className="absolute bottom-20 right-16 w-3 h-3 text-white/60 pointer-events-none" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0L13.5 9L24 12L13.5 15L12 24L10.5 15L0 12L10.5 9Z" />
        </svg>
        <svg className="absolute top-1/2 left-8 w-3 h-3 text-indigo-200/40 pointer-events-none" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0L13.5 9L24 12L13.5 15L12 24L10.5 15L0 12L10.5 9Z" />
        </svg>
        <svg className="absolute top-1/3 right-8 w-4 h-4 text-purple-200/50 pointer-events-none" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0L13.5 9L24 12L13.5 15L12 24L10.5 15L0 12L10.5 9Z" />
        </svg>

        {/* 几何线条 — 右下角斜线 */}
        <svg className="absolute bottom-8 right-8 w-32 h-32 text-white/10 pointer-events-none" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1">
          <line x1="0" y1="100" x2="100" y2="0" />
          <line x1="20" y1="100" x2="100" y2="20" />
          <line x1="40" y1="100" x2="100" y2="40" />
        </svg>

        {/* 几何圆环 — 左上角 */}
        <svg className="absolute top-16 right-1/3 w-24 h-24 text-indigo-300/30 pointer-events-none" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="1">
          <circle cx="50" cy="50" r="40" />
          <circle cx="50" cy="50" r="25" />
        </svg>

        <div className="relative mx-auto max-w-5xl px-6 pt-20 pb-24 text-center">
          {/* 状态徽章 */}
          <div className="inline-flex items-center gap-2 mb-8 px-3 py-1 rounded-full bg-white/10 backdrop-blur border border-white/20 text-xs text-white/90">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span>所有工具已上线 · 持续更新中</span>
          </div>

          {/* 品牌招牌大字 */}
          <div className="mb-6">
            <h1 className="text-7xl md:text-8xl font-black tracking-tighter text-white leading-none">
              FengBox
            </h1>
          </div>

          {/* 中文 slogan */}
          <h2 className="text-3xl md:text-4xl font-bold text-white leading-tight mb-4">
            让 AI，替你完成每一件小事
          </h2>

          <p className="text-base md:text-lg text-white/70 max-w-2xl mx-auto leading-relaxed">
            发现最好用的 AI 工具，让效率与创造力倍增
          </p>

          {/* 搜索框 */}
          <div className="mt-10 max-w-2xl mx-auto">
            <div className="flex items-center gap-2 px-4 py-3 bg-white/95 backdrop-blur rounded-2xl border border-white/30 shadow-lg">
              <span className="text-gray-400">🔍</span>
              <input
                type="text"
                placeholder="搜索 9 个 AI 工具，或输入你的任务，如：写周报、做简历、健身计划"
                className="flex-1 bg-transparent outline-none text-sm placeholder:text-gray-400 text-gray-900"
              />
              <Link
                href="#tools"
                className="px-4 py-1.5 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800 transition"
              >
                浏览工具
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 工具卡片网格 — 白色背景，与 Hero 形成层次对比 */}
      <section id="tools" className="mx-auto max-w-6xl px-6 py-20 scroll-mt-20 bg-white">
        <div className="flex items-end justify-between mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">全部 AI 工具</h2>
            <p className="mt-2 text-sm text-gray-500">点击任意卡片开始使用</p>
          </div>
          <div className="text-xs text-gray-400">
            共 {TOOLS.length} 个
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {TOOLS.map((tool) => (
            <Link
              key={tool.id}
              href={tool.href}
              className="group relative rounded-2xl border border-gray-200 bg-white p-6 transition hover:border-gray-300 hover:shadow-md"
            >
              {/* 顶部：图标 + tag */}
              <div className="flex items-start justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center text-2xl">
                  {tool.emoji}
                </div>
                <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600">
                  {tool.tag}
                </span>
              </div>

              {/* 标题 + 描述 */}
              <h3 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-gray-700">
                {tool.name}
              </h3>
              <p className="text-sm text-gray-600 leading-relaxed line-clamp-3">
                {tool.description}
              </p>

              {/* 底部箭头 */}
              <div className="mt-4 flex items-center text-sm text-gray-400 group-hover:text-gray-900 transition">
                <span>立即使用</span>
                <span className="ml-1 transition group-hover:translate-x-1">→</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* 数据栏 */}
      <section className="bg-gray-900 text-white">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <div className="text-center mb-10">
            <h2 className="text-2xl font-bold">为什么选择 FengBox</h2>
            <p className="mt-2 text-sm text-gray-400">用真实数字说话</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {STATS.map((s, i) => (
              <div key={i} className="text-center">
                <div className="text-4xl md:text-5xl font-bold mb-2">{s.value}</div>
                <div className="text-sm font-medium text-gray-200 mb-1">{s.label}</div>
                <div className="text-xs text-gray-400">{s.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}