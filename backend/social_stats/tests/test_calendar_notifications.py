from django.contrib.auth.models import User
from django.test import TestCase

from social_stats.calendar_notifications import notify_calendar_source_failure
from social_stats.models import (Client, UserProfile, CalendarSource, Notification,
                                 StaffClientAssignment, Agency, AgencyMembership, AgencyClientRelation)


class CalendarFailureNotificationTests(TestCase):
    def setUp(self):
        self.workspace = Client.objects.create(name='Example', company='Example', email='a@example.test')
        self.other = Client.objects.create(name='Other', company='Other', email='b@example.test')
        self.user = User.objects.create_user('calendar_member', password='test')
        UserProfile.objects.create(user=self.user, role='client', client=self.workspace)
        self.other_user = User.objects.create_user('other_member', password='test')
        UserProfile.objects.create(user=self.other_user, role='client', client=self.other)
        self.source = CalendarSource.objects.create(client=self.workspace, username='example')

    def test_source_failure_goes_to_authorized_notification_feed_and_deduplicates(self):
        self.assertEqual(notify_calendar_source_failure(self.source.pk, 'brightdata_empty_result'), 1)
        self.assertEqual(notify_calendar_source_failure(self.source.pk, 'brightdata_empty_result'), 0)
        self.assertEqual(Notification.objects.filter(user=self.user).count(), 1)
        note = Notification.objects.get(user=self.user)
        self.assertEqual(note.client_id, self.workspace.pk)
        self.assertEqual(note.data['calendar_source_id'], self.source.pk)
        self.assertNotIn('Bright Data', note.body)
        self.assertNotIn('brightdata_empty_result', note.body)
        self.assertFalse(Notification.objects.filter(user=self.other_user).exists())

    def test_new_failure_code_gets_its_own_notification(self):
        notify_calendar_source_failure(self.source.pk, 'fetch_failed')
        notify_calendar_source_failure(self.source.pk, 'rate_limited')
        self.assertEqual(Notification.objects.filter(user=self.user).count(), 2)

    def test_inactive_source_does_not_notify(self):
        self.source.is_active = False
        self.source.save(update_fields=['is_active'])
        self.assertEqual(notify_calendar_source_failure(self.source.pk, 'fetch_failed'), 0)
        self.assertFalse(Notification.objects.exists())

    def test_staff_assignment_receives_failure_without_legacy_many_to_many(self):
        staff = User.objects.create_user('assigned_staff')
        profile = UserProfile.objects.create(user=staff, role='staff')
        StaffClientAssignment.objects.create(staff_profile=profile, client=self.workspace)
        self.assertEqual(notify_calendar_source_failure(self.source.pk, 'fetch_failed'), 2)
        self.assertTrue(Notification.objects.filter(user=staff, client=self.workspace).exists())

    def test_active_agency_member_receives_failure_but_revoked_does_not(self):
        agency_owner = User.objects.create_user('agency_owner')
        agency = Agency.objects.create(name='Agency', slug='calendar-a', owner_user=agency_owner)
        member = User.objects.create_user('agency_member')
        membership = AgencyMembership.objects.create(user=member, agency=agency, is_active=True)
        relation = AgencyClientRelation.objects.create(
            agency=agency, client=self.workspace, status='active', initiated_by='agency',
        )
        self.assertEqual(notify_calendar_source_failure(self.source.pk, 'fetch_failed'), 2)
        self.assertTrue(Notification.objects.filter(user=member, client=self.workspace).exists())
        Notification.objects.all().delete()
        relation.status = 'paused'
        relation.save(update_fields=['status'])
        self.assertEqual(notify_calendar_source_failure(self.source.pk, 'rate_limited'), 1)
        self.assertFalse(Notification.objects.filter(user=member).exists())
