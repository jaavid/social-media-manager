'use client';
import Protected from '@/core/routes/Protected';
import MyCalendarPage from '@/features/end-user/MyCalendarPage';
export default function View() {
  return <Protected accountTypes={['end_user']}><MyCalendarPage /></Protected>;
}
