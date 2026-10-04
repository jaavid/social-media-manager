import Badge from '../ui/Badge';

export default function MarketingBadge({ icon: Icon, size = 'md', ...props }) {
  return <Badge {...props} size={size} iconElement={Icon && <Icon size={size === 'sm' ? 10 : 11} strokeWidth={2.4} aria-hidden />} />;
}
