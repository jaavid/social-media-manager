import NextLink from 'next/link';
import { accountLink } from './accountLinks';

export default function MarketingLink({ to, children, ...props }) {
  return <NextLink href={to} prefetch={accountLink(to) ? false : undefined} {...props}>{children}</NextLink>;
}
