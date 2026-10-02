import type { PropsWithChildren } from 'react';
import { AppRedirect } from '../navigation';
import { useSession } from '../session';
import { Loader } from '../layout/Loading';
export default function Protected({
  children,
  roles,
  accountTypes,
}: PropsWithChildren<{ roles?: string[]; accountTypes?: string[] }>) {
  const { user, loading } = useSession();
  if (loading) return <Loader />;
  if (!user) return <AppRedirect to="/login" replace />;
  if (roles && !roles.includes(user.role))
    return (
      <AppRedirect
        to={
          ['superadmin', 'staff'].includes(user.role) ? '/admin' : '/dashboard'
        }
        replace
      />
    );
  if (accountTypes && !accountTypes.includes(user.account_type))
    return <AppRedirect to="/dashboard" replace />;
  return <>{children}</>;
}
