import { Toaster, toast as baseToast } from 'sonner';
import type { ExternalToast } from 'sonner';
import type { ReactNode } from 'react';
import { useLanguage } from '../../i18n';
// Callable compatibility for existing notifications; new code uses named methods.
const notify = (message: ReactNode, options?: ExternalToast) =>
  baseToast(message, options);
export const toast = Object.assign(notify, {
  success: baseToast.success,
  error: baseToast.error,
  info: baseToast.info,
  loading: baseToast.loading,
  promise: baseToast.promise,
  dismiss: baseToast.dismiss,
  raw: baseToast,
});
export default toast;
export function ToastProvider() {
  const { isPersian } = useLanguage();
  return (
    <Toaster
      dir={isPersian ? 'rtl' : 'ltr'}
      position={isPersian ? 'top-left' : 'top-right'}
      closeButton
      style={{ zIndex: 'var(--z-toast)' }}
      toastOptions={{
        classNames: {
          toast: 'ds-toast',
          title: 'text-foreground',
          description: 'text-muted-foreground',
        },
      }}
    />
  );
}
