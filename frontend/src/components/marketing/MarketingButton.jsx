import MarketingButtonClient from './MarketingButtonClient';

/** Render server icons as children rather than serializing component functions. */
export default function MarketingButton({ as, to, icon: Icon, iconRight: IconRight, children, size = 'md', ...props }) {
  const iconSize = { xs: 12, sm: 14, md: 16, lg: 18, xl: 20 }[size] || 16;
  return <MarketingButtonClient {...props} size={size} to={to}
    element={typeof as === 'string' ? as : 'button'}
    startIcon={Icon && <Icon size={iconSize} strokeWidth={2} aria-hidden />}
    endIcon={IconRight && <IconRight size={iconSize} strokeWidth={2} aria-hidden />}>
    {children}
  </MarketingButtonClient>;
}
