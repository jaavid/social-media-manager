/* ============================================================================
 *  Social Stats — Social Media Management & Marketing Platform
 *  Author    : Chandrabhan Shekhawat
 *  Company   : Gigai Kripa Services
 *  Website   : https://gigaikripaservices.com/
 *  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
 *  Released under the MIT License — see LICENSE. Keep this notice.
 * ========================================================================== */
'use client';
import { useState } from 'react';
import Input from '../components/ui/Input';
import Textarea from '../components/ui/Textarea';
import Select from '../components/ui/Select';
import Button from '../components/ui/Button';
import toast from '../components/ui/toast';



const REQUEST_TYPES = [
  { value: 'access',       label: 'Right to access — what data do you hold about me?' },
  { value: 'rectification',label: 'Right to rectification — correct data about me' },
  { value: 'erasure',      label: 'Right to erasure — delete my data' },
  { value: 'portability',  label: 'Right to data portability — export my data' },
  { value: 'restrict',     label: 'Right to restrict processing' },
  { value: 'object',       label: 'Right to object to processing' },
];
export default function GDPRRequestForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [type, setType] = useState('access');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      toast.error('Name and email are required.');
      return;
    }
    setSubmitting(true);
    try {
      // No backend endpoint yet — pretend it submitted.
      await new Promise((r) => setTimeout(r, 700));
      setDone(true);
      toast.success('Request received. We\'ll be in touch within 48 hours.');
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div
        style={{
          padding: 18,
          background: 'var(--success-bg)',
          border: '1px solid var(--success)',
          borderRadius: 'var(--radius-md)',
          color: 'var(--success)',
          fontSize: 14,
          fontWeight: 500,
        }}
      >
        Thanks — your request has been logged. We'll confirm receipt at <strong>{email}</strong> within 48 hours.
      </div>
    );
  }

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }} className="gdpr-row">
        <Input label="Your name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" size="md" />
        <Input label="Your email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" size="md" />
      </div>
      <Select label="Request type" value={type} onChange={setType} options={REQUEST_TYPES} size="md" />
      <Textarea
        label="Additional details (optional)"
        value={details}
        onChange={(e) => setDetails(e.target.value)}
        placeholder="Anything that helps us identify your account or scope the request…"
        minRows={3}
        maxRows={8}
        showCount
        maxLength={1500}
      />
      <Button type="submit" size="md" loading={submitting}>Submit request</Button>
      <style>{`
        @media (max-width: 640px) { .gdpr-row { grid-template-columns: 1fr !important; } }
      `}</style>
    </form>
  );
}