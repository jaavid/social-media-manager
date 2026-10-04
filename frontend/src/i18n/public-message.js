import { rawDictionaries } from './legacy';

const validationMessages = {
  'This field is required.': 'تکمیل این فیلد الزامی است.',
  'Enter a valid email address.': 'یک نشانی ایمیل معتبر وارد کنید.',
  'A user with that email already exists.': 'با این ایمیل قبلاً حسابی ساخته شده است.',
  'Email already registered.': 'این ایمیل قبلاً ثبت شده است.',
  'Invalid email or password.': 'ایمیل یا گذرواژه نادرست است.',
  'Invalid credentials.': 'اطلاعات ورود نادرست است.',
  'Invalid or expired token.': 'این پیوند نامعتبر است یا منقضی شده است.',
  'Invalid or expired invitation.': 'این دعوت‌نامه نامعتبر است یا منقضی شده است.',
};

/** Localize server/auth messages; preserve user-authored content at its own render sites. */
export function publicMessage(value, fallback = 'انجام درخواست ممکن نشد. لطفاً دوباره تلاش کنید.') {
  if (!value) return value;
  if (Array.isArray(value)) return value.map(item => publicMessage(item, fallback)).filter(Boolean).join(' ');
  if (typeof value !== 'string') return fallback;
  const translated = validationMessages[value] || rawDictionaries.fa[value];
  if (translated) return translated;
  if (/[\u0600-\u06ff]/.test(value)) return value;
  return fallback;
}

const invitationStatuses = {
  pending: 'در انتظار پاسخ', accepted: 'پذیرفته‌شده', declined: 'ردشده',
  canceled: 'لغوشده', revoked: 'لغوشده', expired: 'منقضی‌شده',
};
export function publicInvitationStatus(status) {
  return invitationStatuses[status] || 'نامشخص';
}
