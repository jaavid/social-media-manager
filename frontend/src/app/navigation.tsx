/** Replace this adapter when the host changes; features keep the same API. */
import { forwardRef } from 'react';
import { Link, NavLink } from 'react-router-dom';
import type { LinkProps, NavLinkProps } from 'react-router-dom';
export const AppLink = forwardRef<HTMLAnchorElement, LinkProps>(
  (props, ref) => <Link ref={ref} {...props} />,
);
AppLink.displayName = 'AppLink';
export const AppNavLink = forwardRef<HTMLAnchorElement, NavLinkProps>(
  (props, ref) => <NavLink ref={ref} {...props} />,
);
AppNavLink.displayName = 'AppNavLink';
export {
  useNavigate as useAppNavigate,
  useLocation as useAppLocation,
  useParams as useAppParams,
  useSearchParams as useAppSearchParams,
  Navigate as AppRedirect,
  Outlet as AppOutlet,
} from 'react-router-dom';
