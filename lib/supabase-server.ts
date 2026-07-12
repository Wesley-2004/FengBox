// 服务端 Supabase 客户端 — 给 API 路由用
// 关键：从请求头里读 Cookie，识别用户登录状态
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createServerSupabase() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // API 路由里 setAll 会失败（cookie 只能在 Server Action 里设置）
            // 这里静默忽略
          }
        },
      },
    }
  );
}