import { createServerSupabase } from './supabase-server';

/**
 * 检查并记录用户对某工具的使用
 * 规则：每用户每工具每天 1 次（白名单无限制）
 * @param toolName 工具名（如 'resume', 'fitness' 等）
 * @returns { allowed, reason?, isWhitelist? }
 */
export async function checkAndRecordUsage(toolName: string): Promise<{
  allowed: boolean;
  reason?: string;
  isWhitelist?: boolean;
}> {
  const supabase = await createServerSupabase();

  // 1. 检查用户是否登录
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      allowed: false,
      reason: '请先登录后再使用工具',
    };
  }

  // 2. 检查是否是白名单用户
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_whitelist')
    .eq('id', user.id)
    .single();

  if (profile?.is_whitelist) {
    // 白名单用户：记录但不限制
    await supabase.from('usage_logs').insert({
      user_id: user.id,
      tool_name: toolName,
      is_whitelist_bypass: true,
    });
    return { allowed: true, isWhitelist: true };
  }

  // 3. 检查今天是否已经用过这个工具
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { data: todayToolUsage } = await supabase
    .from('usage_logs')
    .select('id, created_at')
    .eq('user_id', user.id)
    .eq('tool_name', toolName)
    .gte('created_at', todayStart.toISOString())
    .limit(1);

  if (todayToolUsage && todayToolUsage.length > 0) {
    return {
      allowed: false,
      reason: `今天已经使用过「${getToolLabel(toolName)}」了。每个工具每天免费使用 1 次，明天可继续。`,
    };
  }

  // 4. 通过检查，记录这次使用
  const { error: insertError } = await supabase
    .from('usage_logs')
    .insert({
      user_id: user.id,
      tool_name: toolName,
      is_whitelist_bypass: false,
    });

  if (insertError) {
    console.error('记录使用失败:', insertError);
  }

  return { allowed: true };
}

function getToolLabel(toolId: string): string {
  const map: Record<string, string> = {
    resume: 'AI 简历优化器',
    fitness: 'AI 健身教练',
    recipe: 'AI 菜谱生成',
    slogan: 'AI 口号生成',
    love: 'AI 恋爱回复',
    tarot: 'AI 塔罗占卜',
    xiaohongshu: 'AI 小红书文案',
    shopping: 'AI 商品导购',
    weekly: 'AI 周报生成器',
  };
  return map[toolId] || toolId;
}