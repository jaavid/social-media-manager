import { render, screen } from '@testing-library/react';
import SamplePreviewBanner from './SamplePreviewBanner';

test.each([
  ['agency', 'فهرست نمونهٔ آژانس‌ها'],
  ['case-study', 'مطالعهٔ موردی نمونه'],
])('discloses that %s profiles and figures are illustrative', (kind, label) => {
  render(<SamplePreviewBanner kind={kind} />);
  const note = screen.getByRole('note');
  expect(note).toHaveTextContent(label);
  expect(note).toHaveTextContent('این یک سناریوی نمایشی است');
  expect(note).toHaveTextContent('نتیجهٔ واقعی مشتریان نیستند');
  expect(note).not.toHaveTextContent('شرکای واقعی دارد');
});
