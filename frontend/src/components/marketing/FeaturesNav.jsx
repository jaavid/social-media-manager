'use client';
import { useEffect, useState } from 'react';
export default function FeaturesNav({ features }) {
  const [active, setActive] = useState(features[0].id);

  // IntersectionObserver to highlight TOC entry while scrolling
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => { if (e.isIntersecting) setActive(e.target.id); });
      },
      { rootMargin: '-40% 0px -50% 0px', threshold: 0 }
    );
    features.forEach((f) => {
      const el = document.getElementById(f.id);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, [features]);
  return (            <nav style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {features.map((f) => (
                <a
                  key={f.id}
                  href={`#${f.id}`}
                  style={{
                    padding: '8px 10px',
                    fontSize: 13,
                    fontWeight: active === f.id ? 600 : 500,
                    color: active === f.id ? 'var(--text-primary)' : 'var(--text-secondary)',
                    background: active === f.id ? 'var(--brand-primary-soft)' : 'transparent',
                    boxShadow: active === f.id ? 'inset 2px 0 0 var(--brand-primary)' : 'none',
                    borderRadius: 'var(--radius-sm)',
                    textDecoration: 'none',
                    transition: 'var(--transition-fast)',
                    display: 'flex', alignItems: 'center', gap: 8,
                  }}
                >
                  {f.icon}
                  {f.eyebrow}
                </a>
              ))}
            </nav>);
}
