import type { PropsWithChildren } from 'react';
import { AppRedirect, useAppLocation } from '../navigation';
import { useSession } from '../session';
import { useLanguage } from '../../i18n';
import { Loader } from '../layout/Loading';
export default function Protected({
  children,
  roles,
  accountTypes,
}: PropsWithChildren<{ roles?: string[]; accountTypes?: string[] }>) {
  const { user, loading, status, retry } = useSession();
  const { t } = useLanguage();
  const location = useAppLocation();
  if (status === 'unavailable') return <div role="alert" className="app-page">
    <p>{t('session.unavailable')}</p><button type="button" onClick={retry}>{t('session.retry')}</button>
  </div>;
  if (loading) return <Loader />;
  if (!user) {
    const hash = typeof window !== 'undefined' ? window.location.hash : location.hash;
    const next = location.pathname + location.search + hash;
    return <AppRedirect to={`/login?next=${encodeURIComponent(next)}`} replace />;
  }
  const landing = ['superadmin', 'staff'].includes(user.role) ? '/admin'
    : user.account_type === 'end_user' ? '/u' : '/dashboard';
  if (roles && !roles.includes(user.role))
    return (
      <AppRedirect
        to={
          landing
        }
        replace
      />
    );
  if (accountTypes && !accountTypes.includes(user.account_type))
    return <AppRedirect to={landing} replace />;
  return <>{children}</>;
}
