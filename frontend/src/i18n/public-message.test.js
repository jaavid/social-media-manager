import { publicMessage, publicInvitationStatus } from './public-message';

test('localizes server validation arrays without exposing English responses', () => {
  expect(publicMessage(['This field is required.', 'Enter a valid email address.']))
    .toBe('تکمیل این فیلد الزامی است. یک نشانی ایمیل معتبر وارد کنید.');
  expect(publicMessage('A user with that email already exists.')).toContain('قبلاً');
  expect(publicMessage('An unknown upstream service failed', 'خطا در ورود')).toBe('خطا در ورود');
});

test('preserves Persian responses and the absence of a validation error', () => {
  expect(publicMessage('ایمیل تأیید نشده است.')).toBe('ایمیل تأیید نشده است.');
  expect(publicMessage(undefined)).toBeUndefined();
  expect(publicMessage('')).toBe('');
});

test('invitation status codes have Persian display labels without changing their values', () => {
  const status = 'accepted';
  expect(publicInvitationStatus(status)).toBe('پذیرفته‌شده');
  expect(publicInvitationStatus('expired')).toBe('منقضی‌شده');
  expect(publicInvitationStatus('new_server_status')).toBe('نامشخص');
  expect(status).toBe('accepted');
});
