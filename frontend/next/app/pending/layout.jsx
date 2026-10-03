import AuthBoundary from '../AuthBoundary';
export const metadata = { robots: { index: false, follow: false } };
export default function Layout({ children }) {
  return <AuthBoundary roles={['client']}>{children}</AuthBoundary>;
}
