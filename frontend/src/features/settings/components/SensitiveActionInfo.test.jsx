import { fireEvent, render, screen } from '@testing-library/react';
import SensitiveActionInfo from './SensitiveActionInfo';
import { enMessages, faMessages } from '@/i18n/messages';

let locale = 'en';
jest.mock('@/i18n', () => ({ useLanguage: () => ({ t: key => (locale === 'fa' ? faMessages : enMessages)[key] }) }));

describe('sensitive settings progressive disclosure', () => {
  afterEach(() => { locale = 'en'; });
  test.each(['en', 'fa'])('%s: shows the consequence first and keeps recovery detail available on demand', language => {
    locale = language;
    render(<SensitiveActionInfo summaryKey="settings.keys.revokeSummary" detailKeys={['keys.revokeHint', 'settings.keys.uncertain']} />);
    expect(screen.getByText((language === 'fa' ? faMessages : enMessages)['settings.keys.revokeSummary'])).toBeVisible();
    const disclosure = screen.getByText((language === 'fa' ? faMessages : enMessages)['settings.details']).closest('details');
    expect(disclosure).not.toHaveAttribute('open');
    fireEvent.click(screen.getByText((language === 'fa' ? faMessages : enMessages)['settings.details']));
    expect(disclosure).toHaveAttribute('open');
    expect(screen.getByText((language === 'fa' ? faMessages : enMessages)['settings.keys.uncertain'])).toBeVisible();
  });
  test('uses native details and does not mount an action or invoke a write', () => {
    render(<SensitiveActionInfo summaryKey="settings.password.summary" detailKeys={['password.sessions']} />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByText(enMessages['password.sessions'])).toBeInTheDocument();
  });
});
