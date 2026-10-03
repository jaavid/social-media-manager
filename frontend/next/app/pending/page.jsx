import View from './View';
import RouteView from '../RouteView';
export const metadata = { title: 'Workspace setup', robots: { index: false, follow: false } };
export default function Page() { return <RouteView><View /></RouteView>; }
