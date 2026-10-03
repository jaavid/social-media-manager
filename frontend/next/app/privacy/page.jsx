import View from './View';
import RouteView from '../RouteView';
import { publicMetadata } from '../../metadata.mjs';
export const metadata = publicMetadata(
  'Privacy Policy',
  'Social Stats is built by people who hate dark patterns. This page explains, in plain English, what data we collect, why we need it, and how we keep it safe.',
  '/privacy',
);
export default function Page() { return <RouteView><View /></RouteView>; }
