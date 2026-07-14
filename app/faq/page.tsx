import { getMdxBySlug } from '@/lib/mdx';
import { AccordionPage } from '@/components/MDXContent';
import { AccordionMdx } from '@/components/AccordionMdx';

export default async function FaqPage() {
  const { source, title, description, updatedAt } = await getMdxBySlug('faq');
  return (
    <AccordionPage title={title} description={description} updatedAt={updatedAt}>
      <AccordionMdx source={source} emptyTitle="前言" />
    </AccordionPage>
  );
}