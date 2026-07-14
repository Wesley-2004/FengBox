import Link from 'next/link';
import { AccordionItem } from './MDXContent';
import { MDXRemote } from 'next-mdx-remote/rsc';

/**
 * 单个 H2 段的元数据
 */
interface Block {
  title: string;
  source: string;
}

/**
 * 把 MDX 源按 H2 (##) 切开 — 每个 H2 成为一个折叠项
 * H1 不切（被视为页面总标题，在 AccordionPage 里已经渲染过）
 * 第一个 H2 之前的前言（如有）作为第 0 项，标题为"前言"
 */
export function splitByH2(mdxSource: string): Block[] {
  const blocks: Block[] = [];
  // 用换行开头匹配 H2 行，保留 H2 行的内容给下一段
  const lines = mdxSource.split('\n');
  let currentTitle: string | null = null;
  let currentLines: string[] = [];

  const flush = () => {
    if (currentTitle !== null) {
      const body = currentLines.join('\n').trim();
      blocks.push({ title: currentTitle, source: body });
    }
  };

  for (const line of lines) {
    // 匹配 "## 标题"
    const m = line.match(/^##\s+(.+?)\s*$/);
    if (m) {
      flush();
      currentTitle = m[1].trim();
      currentLines = [];
    } else {
      if (currentTitle !== null) currentLines.push(line);
    }
  }
  flush();

  return blocks;
}

/**
 * 折叠页渲染：把 MDX 按 H2 分成 N 个折叠项
 */
export function AccordionMdx({
  source,
  emptyTitle = '前言',
}: {
  source: string;
  emptyTitle?: string;
}) {
  const blocks = splitByH2(source);
  // 如果一个 H2 都没有，整段当作一个折叠项
  if (blocks.length === 0) {
    return (
      <AccordionItem title={emptyTitle} defaultOpen>
        <MDXRemote source={source} />
      </AccordionItem>
    );
  }
  return (
    <>
      {blocks.map((b, i) => (
        <AccordionItem key={i} title={b.title} defaultOpen={false}>
          <MDXRemote source={b.source} />
        </AccordionItem>
      ))}
    </>
  );
}
