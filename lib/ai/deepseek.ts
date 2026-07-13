/**
 * DeepSeek 调用 + JSON 解析的统一封装。
 * 给所有需要"AI 输出结构化 JSON"的 API 用。
 */

/// <reference types="node" />
const DEEPSEEK_ENDPOINT = 'https://api.deepseek.com/v1/chat/completions';

export type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

export async function callDeepSeek(
  messages: ChatMessage[],
  options: { temperature?: number; maxTokens?: number } = {},
): Promise<string> {
  const { temperature = 0.7, maxTokens = 4000 } = options;
  const response = await fetch(DEEPSEEK_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages,
      temperature,
      max_tokens: maxTokens,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`DeepSeek API 错误: ${JSON.stringify(data)}`);
  }
  return data.choices[0].message.content;
}

/**
 * 解析 AI 返回的 JSON。AI 偶尔会包 ```json``` 包裹或加前言。
 * 三层 fallback：
 *   1. 直接 parse
 *   2. 抠 ```json ... ``` 代码块再 parse
 *   3. 抠首尾 {...} 再 parse，并对最常见的截断错误做修复
 * 返回 null = 全部失败，调用方可选择回退 markdown 渲染。
 */
export function parseJsonResponse(raw: string): any | null {
  const candidates: string[] = [];
  candidates.push(raw.trim());

  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) candidates.push(fence[1].trim());

  const first = raw.indexOf('{');
  const last = raw.lastIndexOf('}');
  if (first !== -1 && last !== -1 && last > first) {
    candidates.push(raw.slice(first, last + 1));
  }

  for (const c of candidates) {
    try { return JSON.parse(c); } catch {}
    try { return JSON.parse(c.replace(/,\s*([}\]])/g, '$1')); } catch {}
  }
  return null;
}
