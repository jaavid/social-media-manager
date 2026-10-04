import Content from '@/features/CookiePolicyPage';
import { publicMetadata } from '../../../lib/metadata.mjs';
export const metadata = publicMetadata("Cookie Policy", "We use cookies (and similar technologies) to keep you signed in, remember your preferences, and learn what's working. This page explains exactly what we use and lets you choose.", "/cookies", false);
export default function Page() { return <Content />; }
