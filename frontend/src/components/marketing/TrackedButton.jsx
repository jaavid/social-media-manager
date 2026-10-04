'use client';
import NextLink from 'next/link';
import Button from '../ui/Button';
import { track } from '../../services/analytics';
export default function TrackedButton({ to, source, children, ...props }) {
  return <Button {...props} as={NextLink} href={to} prefetch={false} onClick={() => track('signup_click', { source })}>{children}</Button>;
}
