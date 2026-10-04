'use client';
import NextLink from 'next/link';
import Button from '../ui/Button';
import { accountLink } from './accountLinks';

export default function MarketingButtonClient({ to, element, startIcon, endIcon, children, ...props }) {
  return <Button {...props} as={to ? NextLink : element} href={to || props.href} prefetch={to && accountLink(to) ? false : undefined}
    icon={startIcon ? () => startIcon : undefined}
    iconRight={endIcon ? () => endIcon : undefined}>
    {children}
  </Button>;
}
