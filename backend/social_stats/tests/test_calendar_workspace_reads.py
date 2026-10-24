from datetime import timedelta
from django.contrib.auth.models import User
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient
from social_stats.models import (
    CalendarNote, CalendarPost, Client, UserProfile, WorkspaceMemberPolicy,
)


class CalendarWorkspaceReadsTests(TestCase):
    def setUp(self):
        self.home = Client.objects.create(name='home', company='home', email='home@example.test')
        self.shared = Client.objects.create(name='shared', company='shared', email='shared@example.test')
        self.user = User.objects.create_user(username='multi-brand')
        UserProfile.objects.create(user=self.user, role='client', client=self.home)
        self.policy = WorkspaceMemberPolicy.objects.create(workspace=self.shared, user=self.user)
        self.post = CalendarPost.objects.create(client=self.shared, platform='instagram', status='scheduled',
                                               scheduled_at=timezone.now() + timedelta(days=1))
        self.api = APIClient()
        self.api.force_authenticate(self.user)

    def test_calendar_can_read_authorized_non_default_brand(self):
        response = self.api.get('/api/calendar/posts/', {'client_id': self.shared.id})
        self.assertEqual(response.status_code, 200)
        self.assertEqual([p['id'] for posts in response.data.values() for p in posts], [self.post.id])
        response = self.api.get('/api/calendar/posts/upcoming/', {'client_id': self.shared.id})
        self.assertEqual([p['id'] for p in response.data], [self.post.id])

    def test_revoked_brand_is_not_readable(self):
        self.policy.is_active = False
        self.policy.save()
        self.assertEqual(self.api.get('/api/calendar/posts/', {'client_id': self.shared.id}).status_code, 403)
        self.assertEqual(self.api.get('/api/calendar/posts/upcoming/', {'client_id': self.shared.id}).data, [])

    def test_shared_brand_read_does_not_grant_mutation(self):
        response = self.api.patch(f'/api/calendar/posts/{self.post.id}/', {'title': 'changed'}, format='json')
        self.assertEqual(response.status_code, 404)
        self.post.refresh_from_db()
        self.assertEqual(self.post.title, '')

    def test_only_client_visible_notes_are_exposed_for_shared_brand(self):
        for visible in [True, False]:
            CalendarNote.objects.create(client=self.shared, date=timezone.now().date(),
                                        title=str(visible), is_client_visible=visible)
        response = self.api.get('/api/calendar/notes/', {'client_id': self.shared.id})
        self.assertEqual([note['title'] for note in response.data], ['True'])
