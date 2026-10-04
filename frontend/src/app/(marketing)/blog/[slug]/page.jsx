import Content from '@/features/BlogPostPage';
import { marketingContent, contentMetadata } from '@/features/marketing/content';
import { publicMetadata } from '@/lib/metadata.mjs';
import { notFound } from 'next/navigation';

const family = 'blog';
export const dynamicParams = false;
export function generateStaticParams() {
  return Object.keys(marketingContent[family]).map(slug => ({ slug }));
}
export async function generateMetadata({ params }) {
  const { slug } = await params;
  const meta = contentMetadata(family, slug);
  if (!meta) notFound();
  return publicMetadata(meta.title, meta.description, `/blog/${slug}`);
}
export default async function Page({ params }) {
  const { slug } = await params;
  if (!contentMetadata(family, slug)) notFound();
  return <Content slug={slug} />;
}
