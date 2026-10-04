// Generated from next/src/app/routes/routeInventory.json.
import View from './View';
import { publicMetadata } from '../../../metadata.mjs';
import content from '../../../route-content.json';
import { notFound } from 'next/navigation';
const entries = content["customers"];
export const dynamicParams = false;
export function generateStaticParams() { return Object.keys(entries).map(slug => ({ slug })); }
export async function generateMetadata({ params }) {
  const { slug } = await params;
  const data = entries[slug];
  if (!data) notFound();
  return publicMetadata(data.title, data.description, '/customers/' + slug);
}
export default async function Page({ params }) {
  const { slug } = await params;
  if (!entries[slug]) notFound();
  return <View />;
}
