import { getMdxBySlug, MDXRenderer } from '@/lib/mdx';
import { MDXPage } from '@/components/MDXContent';

export default async function TermsPage() {
  const { source, title, description, updatedAt } = await getMdxBySlug('terms');
  return (
    <MDXPage title={title} description={description} updatedAt={updatedAt}>
      <MDXRenderer source={source} />
    </MDXPage>
  );
}
