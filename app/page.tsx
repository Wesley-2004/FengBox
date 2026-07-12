import Link from "next/link";

// 工具列表 — 后续添加新工具在这里加一项即可
const tools = [
  {
    id: "resume",
    name: "AI 简历优化器",
    description: "上传简历，AI 帮你分析并给出优化建议，生成更专业的简历文案。",
    emoji: "📄",
    status: "ready", // ready = 可用，coming = 敬请期待
    href: "/tools/resume",
  },
  {
    id: "fitness",
    name: "AI 健身教练",
    description: "输入身高体重和健身目标，AI 为你定制运动计划和营养搭配。",
    emoji: "💪",
    status: "ready",
    href: "/tools/fitness",
  },
  {
    id: "recipe",
    name: "AI 菜谱生成",
    description: "输入食材，AI 推荐多道家常菜，点开看详细制作步骤。",
    emoji: "🍳",
    status: "ready",
    href: "/tools/recipe",
  },
  {
    id: "slogan",
    name: "AI 口号生成",
    description: "输入关键词，AI 帮你写出朗朗上口的口号（班级、广告、运动会等）。",
    emoji: "📢",
    status: "ready",
    href: "/tools/slogan",
  },
  {
    id: "love",
    name: "AI 恋爱回复",
    description: "收到对方消息不知道回什么？AI 帮你想几条高情商回复。",
    emoji: "💕",
    status: "ready",
    href: "/tools/love",
  },
  {
    id: "tarot",
    name: "AI 塔罗占卜",
    description: "凭直觉选 5 张牌，AI 帮你解读内心的声音。",
    emoji: "🔮",
    status: "ready",
    href: "/tools/tarot",
  },
  {
    id: "xiaohongshu",
    name: "AI 小红书文案",
    description: "输入主题，一键生成可直接发布的小红书爆款文案。",
    emoji: "📕",
    status: "ready",
    href: "/tools/xiaohongshu",
  },
  {
    id: "shopping",
    name: "AI 商品导购",
    description: "想买什么？AI 帮你看参数、避坑，跳转各大平台比价。",
    emoji: "🛒",
    status: "ready",
    href: "/tools/shopping",
  },
  {
    id: "weekly",
    name: "AI 周报生成器",
    description: "输入本周工作要点，AI 一键生成完整周报（4 种风格可选）。",
    emoji: "📝",
    status: "ready",
    href: "/tools/weekly",
  },
];

export default function Home() {
  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      {/* 顶部标题区 */}
      <header className="mb-12 text-center">
        <h1 className="text-5xl font-bold tracking-tight text-brand-600">
          FengBox
        </h1>
        <p className="mt-4 text-lg text-gray-600">
          一站式 AI 工具集合 · 让每个人都能用上好用的 AI
        </p>
      </header>

      {/* 工具卡片区 */}
      <section>
        <h2 className="mb-6 text-2xl font-semibold text-gray-800">
          🧰 工具列表
        </h2>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {tools.map((tool) => {
            const card = (
              <div className="group relative h-full rounded-2xl border border-gray-200 bg-white p-6 shadow-sm transition hover:shadow-md">
                <div className="mb-3 text-4xl">{tool.emoji}</div>
                <h3 className="mb-2 text-xl font-semibold text-gray-900">
                  {tool.name}
                </h3>
                <p className="text-sm text-gray-600">{tool.description}</p>
                {tool.status === "coming" && (
                  <span className="absolute right-4 top-4 rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-500">
                    敬请期待
                  </span>
                )}
              </div>
            );

            // ready 状态可以点击跳转；coming 状态不可点击
            if (tool.status === "ready") {
              return (
                <Link key={tool.id} href={tool.href}>
                  {card}
                </Link>
              );
            }
            return <div key={tool.id}>{card}</div>;
          })}
        </div>
      </section>

      {/* 底部 */}
      <footer className="mt-20 text-center text-sm text-gray-400">
        © {new Date().getFullYear()} FengBox · 由 Next.js 驱动
      </footer>
    </main>
  );
}
