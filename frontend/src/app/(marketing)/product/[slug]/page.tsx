import Content from '@/features/marketing/ProductPage';
import { marketingContent, contentMetadata } from '@/features/marketing/content';
import { publicMetadata } from '@/lib/metadata.mjs';
import { notFound } from 'next/navigation';

const family = 'product';
export const dynamicParams = false;
export function generateStaticParams() {
  return Object.keys(marketingContent[family]).map(slug => ({ slug }));
}
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const meta = contentMetadata(family, slug);
  if (!meta) notFound();
  return publicMetadata(meta.title, meta.description, `/product/${slug}`);
}
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!contentMetadata(family, slug)) notFound();
  return <Content slug={slug} />;
}
