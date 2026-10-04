'use client';
import { useEffect, useState } from 'react';
import { Linkedin, Facebook, Link as LinkIcon } from 'lucide-react';
import toast from '../ui/toast';
export default function BlogShare() {
  const [url, setUrl] = useState('');
  useEffect(() => setUrl(window.location.href), []);
  async function copyLink() {
    try { await navigator.clipboard.writeText(window.location.href); toast.success("پیوند در کلیپ بورد کپی شد"); }
    catch { toast.error("پیوند کپی نشد"); }
  }
  return <><ShareBtn icon={Linkedin} href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`} label={"در لینکدین به اشتراک بگذارید"} /><ShareBtn icon={Facebook} href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`} label={"در فیس‌بوک به اشتراک بگذارید"} /><ShareBtn icon={LinkIcon} onClick={copyLink} label={"کپی لینک"} /></>;
}
function ShareBtn({ icon: Icon, href, onClick, label }) {
  const Wrap = href ? 'a' : 'button';
  return (
    <Wrap
      href={href}
      target={href ? '_blank' : undefined}
      rel={href ? 'noopener noreferrer' : undefined}
      onClick={onClick}
      aria-label={label}
      type={href ? undefined : 'button'}
      style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        width: 32, height: 32, minHeight: 'auto', minWidth: 'auto',
        background: 'var(--surface-page)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-sm)',
        color: 'var(--text-secondary)',
        cursor: 'pointer',
        textDecoration: 'none',
        transition: 'var(--transition-fast)',
        padding: 0,
      }}
      onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--brand-primary-hover)'; e.currentTarget.style.borderColor = 'var(--brand-primary-glow)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.borderColor = 'var(--border-subtle)'; }}
    >
      <Icon size={14} strokeWidth={2} />
    </Wrap>
  );
}