import { NextResponse } from 'next/server';
import { createServerSupabase } from '@/lib/supabase-server';

/**
 * 返回当前用户的白名单 / 会员状态，供前端决定 UI 显示。
 * 不返回任何敏感数据，仅布尔值。
 */
export async function POST() {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ loggedIn: false, isWhitelist: false });
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_whitelist')
      .eq('id', user.id)
      .single();

    return NextResponse.json({
      loggedIn: true,
      isWhitelist: Boolean(profile?.is_whitelist),
    });
  } catch {
    return NextResponse.json({ loggedIn: false, isWhitelist: false });
  }
}

export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
