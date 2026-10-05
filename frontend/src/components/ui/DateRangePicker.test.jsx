import { fireEvent, render, screen } from '@testing-library/react';
import DateRangePicker from './DateRangePicker';
import { setLanguage } from '../../i18n';

test.each([['en', 'From', 'To'], ['fa', 'از', 'تا']])('date range labels identify and constrain fields in %s', (language, from, to) => {
  window.history.replaceState({}, '', '/admin/analytics/analytics');
  setLanguage(language);
  const change = jest.fn();
  render(<DateRangePicker range={{ since: '2026-01-01', until: '2026-02-01' }} onChange={change} />);
  const start = screen.getByLabelText(from), end = screen.getByLabelText(to);
  expect(start).toHaveAttribute('max', '2026-02-01');
  expect(end).toHaveAttribute('min', '2026-01-01');
  fireEvent.change(start, { target: { value: '2026-01-02' } });
  expect(change).toHaveBeenCalledWith({ since: '2026-01-02', until: '2026-02-01' });
});
