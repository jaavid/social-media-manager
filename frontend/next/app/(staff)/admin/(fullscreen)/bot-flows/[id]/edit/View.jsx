'use client';
import dynamic from 'next/dynamic';
const Feature = dynamic(() => import('../../../../../../../../src/pages/bots/BotFlowEditorPage.jsx'), { ssr: false });
export default function View() {
  return <Feature />;
}
