// Generated from src/core/routes/routeInventory.json.
import View from './View';
import { publicMetadata } from '../../../lib/metadata.mjs';
import content from '../../../core/routes/route-content.json';
import { notFound } from 'next/navigation';
const entries = content["blog"];
export const dynamicParams = false;
export function generateStaticParams() { return Object.keys(entries).map(slug => ({ slug })); }
export async function generateMetadata({ params }) {
  const { slug } = await params;
  const data = entries[slug];
  if (!data) notFound();
  return publicMetadata(data.title, data.description, '/blog/' + slug);
}
export default async function Page({ params }) {
  const { slug } = await params;
  if (!entries[slug]) notFound();
  return <View />;
}
