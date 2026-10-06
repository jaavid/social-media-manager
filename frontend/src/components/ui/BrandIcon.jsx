import {
  siFacebook,
  siGithub,
  siLinkedin,
  siX,
  siYoutube,
} from 'simple-icons/icons';

const BRAND_ICONS = {
  facebook: siFacebook,
  github: siGithub,
  linkedin: siLinkedin,
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
  const icon = BRAND_ICONS[normalizeBrand(brand)];

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
