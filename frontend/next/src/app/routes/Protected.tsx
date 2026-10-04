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
