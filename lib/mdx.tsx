import fs from 'fs/promises';
import path from 'path';
import matter from 'gray-matter';
import { MDXRemote } from 'next-mdx-remote/rsc';

const CONTENT_DIR = path.join(process.cwd(), 'content');

export interface MdxFrontmatter {
  title: string;
  description?: string;
  updatedAt?: string;
}

export interface MdxData extends MdxFrontmatter {
  source: string;
}

/**
 * 读取 content/<slug>.mdx 并解析 frontmatter + 正文
 * slug 不含扩展名
 */
export async function getMdxBySlug(slug: string): Promise<MdxData> {
  const filePath = path.join(CONTENT_DIR, `${slug}.mdx`);
  const raw = await fs.readFile(filePath, 'utf-8');
  const { content, data } = matter(raw);
  // gray-matter 会把 ISO 日期自动解析成 Date 对象，但 React 不能直接渲染 Date
  // 这里统一把 updatedAt 转成字符串（YYYY-MM-DD）
  const updatedAt = data.updatedAt instanceof Date
    ? data.updatedAt.toISOString().slice(0, 10)
    : data.updatedAt;
  return {
    ...(data as MdxFrontmatter),
    updatedAt,
    source: content,
  };
}

/**
 * Next.js Server Component — 用 MDXRemote 渲染（服务端编译，无 client bundle）
 */
export function MDXRenderer({ source }: { source: string }) {
  return <MDXRemote source={source} />;
}