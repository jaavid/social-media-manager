import {
  siFacebook,
  siGithub,
  siX,
  siYoutube,
} from 'simple-icons';

const BRAND_ICONS = {
  facebook: siFacebook,
  github: siGithub,
  twitter: siX,
  x: siX,
  youtube: siYoutube,
};

function normalizeBrand(brand) {
  return String(brand || '').trim().toLowerCase();
}

export default function BrandIcon({
  brand,
  size = 18,
  title,
  color = 'currentColor',
  style,
  ...props
}) {
  const normalizedBrand = normalizeBrand(brand);

  if (normalizedBrand === 'linkedin') {
    return (
      <LinkedinBrandGlyph
        size={size}
        title={title}
        color={color}
        style={style}
        {...props}
      />
    );
  }

  const icon = BRAND_ICONS[normalizedBrand];

  if (!icon) return null;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      role={title ? 'img' : 'presentation'}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      fill={color}
      style={{ display: 'block', flexShrink: 0, ...style }}
      {...props}
    >
      {title ? <title>{title}</title> : null}
      <path d={icon.path} />
    </svg>
  );
}

export function FacebookBrandIcon(props) {
  return <BrandIcon brand="facebook" {...props} />;
}

export function GithubBrandIcon(props) {
  return <BrandIcon brand="github" {...props} />;
}

export function LinkedinBrandIcon(props) {
  return <BrandIcon brand="linkedin" {...props} />;
}

export function XBrandIcon(props) {
  return <BrandIcon brand="x" {...props} />;
}

export function YoutubeBrandIcon(props) {
  return <BrandIcon brand="youtube" {...props} />;
}

function LinkedinBrandGlyph({
  size = 18,
  title,
  color = 'currentColor',
  style,
  ...props
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      role={title ? 'img' : 'presentation'}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      style={{ display: 'block', flexShrink: 0, ...style }}
      {...props}
    >
      {title ? <title>{title}</title> : null}
      <rect width="24" height="24" rx="4.5" fill={color} />
      <rect x="5.2" y="9.2" width="2.5" height="9.2" fill="var(--surface-card, #fff)" />
      <circle cx="6.45" cy="6.55" r="1.45" fill="var(--surface-card, #fff)" />
      <path
        fill="var(--surface-card, #fff)"
        d="M10 9.2h2.4v1.25h.03c.33-.63 1.14-1.55 2.95-1.55 3.16 0 3.75 2.08 3.75 4.78v4.7h-2.5V14.2c0-1-.02-2.29-1.39-2.29-1.4 0-1.61 1.09-1.61 2.22v4.27H10V9.2z"
      />
    </svg>
  );
}
