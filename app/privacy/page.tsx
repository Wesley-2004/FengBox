import { getMdxBySlug, MDXRenderer } from '@/lib/mdx';
import { MDXPage } from '@/components/MDXContent';

export default async function PrivacyPage() {
  const { source, title, description, updatedAt } = await getMdxBySlug('privacy');
  return (
    <MDXPage title={title} description={description} updatedAt={updatedAt}>
      <MDXRenderer source={source} />
    </MDXPage>
  );
}
