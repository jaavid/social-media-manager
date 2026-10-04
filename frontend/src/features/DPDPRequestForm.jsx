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
  { value: 'access',    label: "حق دسترسی - چه اطلاعاتی در مورد من دارید؟" },
  { value: 'correct',   label: "حق تصحیح یا پاک کردن داده‌های مربوط به من" },
  { value: 'consent',   label: "لغو رضایت برای پردازش خاص" },
  { value: 'grievance', label: "شکایت را ثبت کنید" },
];
export default function DPDPRequestForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [type, setType] = useState('access');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (!name.trim() || !email.trim()) {
      toast.error("نام و ایمیل الزامی است.");
      return;
    }
    setSubmitting(true);
    try {
      await new Promise((r) => setTimeout(r, 700));
      setDone(true);
      toast.success("درخواست دریافت شد. ظرف 48 ساعت با شما تماس خواهیم گرفت.");
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
        با تشکر - درخواست شما ثبت شده است. ما دریافت را در <strong>{email}</strong> ظرف 48 ساعت.
      </div>
    );
  }

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }} className="dpdp-row">
        <Input label={"نام شما"}  value={name}  onChange={(e) => setName(e.target.value)}  placeholder={"نام کامل"} size="md" />
        <Input label={"ایمیل شما"} type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" size="md" />
      </div>
      <Select label={"نوع درخواست"} value={type} onChange={setType} options={REQUEST_TYPES} size="md" />
      <Textarea
        label={"جزئیات اضافی (اختیاری)"}
        value={details}
        onChange={(e) => setDetails(e.target.value)}
        placeholder={"هر چیزی که به ما کمک کند حساب شما را شناسایی کنیم یا دامنه درخواست را انجام دهیم…"}
        minRows={3}
        maxRows={8}
        showCount
        maxLength={1500}
      />
      <Button type="submit" size="md" loading={submitting}>درخواست ارسال کنید</Button>
      <style>{`
        @media (max-width: 640px) { .dpdp-row { grid-template-columns: 1fr !important; } }
      `}</style>
    </form>
  );
}