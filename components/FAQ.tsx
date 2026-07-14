'use client';

import { useState } from 'react';

const FAQS = [
  {
    q: 'FengBox 是免费的吗？',
    a: '目前所有工具完全免费，注册即可使用。每个工具每天可使用 1 次，后续会接入会员功能。',
  },
  {
    q: '每天 1 次太少了，能不能多用？',
    a: '每个账号每天能用 1 次。如果你需要更多次数，可以等未来上线的会员功能，或者联系管理员把你的账号加入白名单（永不限次）。',
  },
  {
    q: 'AI 输出准确吗？我能用它做重要决定吗？',
    a: 'AI 输出仅供参考，不能替代专业人士。无论是健身计划、菜谱、塔罗解读还是恋爱回复，最终判断权在你自己手里。',
  },
  {
    q: '我的输入内容会被保存吗？',
    a: '我们不主动保存你输入的内容。这些信息会被发送给 DeepSeek 大模型以生成回复，由 DeepSeek 按自身策略处理。详见隐私政策页。',
  },
  {
    q: '我输入的内容会被用作 AI 训练吗？',
    a: '根据 DeepSeek 当前的隐私政策，你通过 API 调用发送的内容不会被用于模型训练。如有变化请以 DeepSeek 官方政策为准。',
  },
  {
    q: '怎么注册账号？',
    a: '点击右上角"登录 / 注册"按钮，输入邮箱和密码即可。无需实名认证。',
  },
  {
    q: '能推荐更多工具吗？',
    a: '欢迎邮件推荐（hello@fengbox.example.com），我会评估加进来。你也可以随时提 GitHub Issue。',
  },
];

export default function FAQ() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <section id="faq" className="border-t border-gray-200 bg-gray-50">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-gray-900">常见问题</h2>
          <p className="mt-2 text-sm text-gray-500">点开看答案，或发邮件给我们问其他问题</p>
        </div>

        <ul className="space-y-3">
          {FAQS.map((item, i) => {
            const isOpen = openIdx === i;
            return (
              <li
                key={i}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setOpenIdx(isOpen ? null : i)}
                  className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left"
                >
                  <span className="font-medium text-gray-900">{item.q}</span>
                  <span
                    className={`shrink-0 text-gray-400 transition-transform ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  >
                    ▼
                  </span>
                </button>
                {isOpen && (
                  <div className="px-5 pb-4 text-sm text-gray-600 leading-relaxed border-t border-gray-100 pt-3">
                    {item.a}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
