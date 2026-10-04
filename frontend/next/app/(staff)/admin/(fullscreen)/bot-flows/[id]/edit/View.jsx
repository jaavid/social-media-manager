'use client';
import dynamic from 'next/dynamic';
const Feature = dynamic(() => import('../../../../../../../src/screens/bots/BotFlowEditorPage.jsx'), { ssr: false });
export default function View() {
  return <Feature />;
}
