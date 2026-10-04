'use client';
import { useEffect, useState } from 'react';

export default function TableOfContents({ sections, compact = false }) {
  const [active, setActive] = useState(sections[0]?.id);
  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => { if (entry.isIntersecting) setActive(entry.target.id); });
    }, { rootMargin: '-30% 0px -55% 0px', threshold: 0 });
    sections.forEach(section => { const node = document.getElementById(section.id); if (node) observer.observe(node); });
    return () => observer.disconnect();
  }, [sections]);
  return <nav style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
    {sections.map(section => <a key={section.id} href={`#${section.id}`} style={{
      padding: compact ? '6px 10px' : '8px 10px', fontSize: 12,
      fontWeight: active === section.id ? 600 : 500,
      color: active === section.id ? 'var(--text-primary)' : 'var(--text-secondary)',
      background: active === section.id ? 'var(--brand-primary-soft)' : 'transparent',
      boxShadow: active === section.id ? 'inset 2px 0 0 var(--brand-primary)' : 'none',
      borderRadius: 'var(--radius-sm)', textDecoration: 'none', lineHeight: 'var(--line-height-body)', transition: 'var(--transition-fast)',
    }}>{section.title}</a>)}
  </nav>;
}
