/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
import {
  BrandMark,
  BrandWordmark,
  BrandLogoHorizontal,
  BrandLogoStacked,
  BrandMarkInverted,
} from './BrandLogo';

/**
 * Logo — single entry point that picks the right Ravinta asset for the variant.
 *
 * Props:
 *   variant: 'mark' | 'wordmark' | 'horizontal' | 'stacked' | 'mark-inverted'
 *   size:    number   — mark size (px) for mark/mark-inverted
 *   height:  number   — height (px) for wordmark/horizontal/stacked
 *   className, style
 *
 * Existing pages still import from './BrandLogo' directly; this is the
 * one-stop component to use in new code.
 */
export default function Logo({
  variant = 'horizontal',
  size,
  height,
  className,
  style,
}) {
  switch (variant) {
    case 'mark-white':
      return <BrandMark size={size ?? 40} className={className} style={style} monochrome="#FFFFFF" />;
    case 'mark-black':
      return <BrandMark size={size ?? 40} className={className} style={style} monochrome="#000000" />;
    case 'horizontal-inverted':
      return <BrandLogoHorizontal height={height ?? 36} className={className} style={style} inverted />;
    case 'mark':
      return <BrandMark          size={size ?? 40}  className={className} style={style} />;
    case 'mark-inverted':
      return <BrandMarkInverted  size={size ?? 40}  className={className} style={style} />;
    case 'wordmark':
      return <BrandWordmark      height={height ?? 22} className={className} style={style} />;
    case 'stacked':
      return <BrandLogoStacked   height={height ?? 100} className={className} style={style} />;
    case 'horizontal':
    default:
      return <BrandLogoHorizontal height={height ?? 36} className={className} style={style} />;
  }
}
