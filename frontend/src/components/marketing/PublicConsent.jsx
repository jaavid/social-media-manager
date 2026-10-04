'use client';
import dynamic from 'next/dynamic';
const CookieBanner = dynamic(() => import('../legal/CookieBanner'), { ssr: false });
export default function PublicConsent() { return <CookieBanner />; }
