import { BrandLogoStacked } from '../../components/ui/BrandLogo';
import Skeleton from '../../components/ui/Skeleton';
import { useLanguage } from '../../i18n';

export function LazyFallback() {
  return (
    <div
      className="flex min-h-48 items-center justify-center p-10"
      role="status"
      aria-label="Loading"
    >
      <Skeleton variant="card" width="100%" height={120} className="max-w-xl" />
    </div>
  );
}

export function Loader() {
  const { tr } = useLanguage();
  return (
    <div
      className="socialstats-loader flex min-h-dvh flex-col items-center justify-center gap-5 bg-background text-muted-foreground"
      role="status"
    >
      <BrandLogoStacked height={120} className="" style={{}} />
      <span className="text-sm">{tr('Loading…')}</span>
    </div>
  );
}
