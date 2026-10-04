'use client';
import dynamic from 'next/dynamic';
const Feature = dynamic(() => import('../../../../../../../../features/bots/BotFlowEditorPage.jsx'), { ssr: false });
export default function View() {
  return <Feature />;
}
