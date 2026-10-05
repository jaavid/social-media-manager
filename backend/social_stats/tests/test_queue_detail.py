from django.contrib.auth.models import User
from django.test import TestCase
from rest_framework.test import APIClient

from social_stats.models import Client, PostQueue, QueuedItem, UserProfile


class QueueDetailTests(TestCase):
    def setUp(self):
        self.workspace = Client.objects.create(name='One', company='One', email='one@example.test')
        self.other = Client.objects.create(name='Other', company='Other', email='other@example.test')
        self.user = User.objects.create_user(username='owner', password='test')
        UserProfile.objects.create(user=self.user, role='client', client=self.workspace)
        self.api = APIClient()
        self.api.force_authenticate(self.user)
        self.queue = PostQueue.objects.create(client=self.workspace, name='Morning', platforms=['facebook'])
        self.first = QueuedItem.objects.create(queue=self.queue, content='First', sort_order=1)
        self.second = QueuedItem.objects.create(queue=self.queue, content='Second', sort_order=2)

    def test_detail_exposes_ordered_items_and_persists_reorder(self):
        url = f'/api/composer/queues/{self.queue.id}/'
        response = self.api.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual([row['content'] for row in response.data['items_list']], ['First', 'Second'])
        response = self.api.post(url + 'reorder/', {'order': [self.second.id, self.first.id]}, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertEqual([row['id'] for row in self.api.get(url).data['items_list']], [self.second.id, self.first.id])

    def test_detail_cannot_expose_another_workspace(self):
        other_queue = PostQueue.objects.create(client=self.other, name='Private')
        QueuedItem.objects.create(queue=other_queue, content='Private content')
        response = self.api.get(f'/api/composer/queues/{other_queue.id}/')
        self.assertEqual(response.status_code, 404)
