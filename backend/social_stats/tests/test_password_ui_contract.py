"""Isolated users verify existing password and cookie session semantics."""
from django.contrib.auth.models import User
from django.test import Client, TestCase
from rest_framework.test import APIClient


class PasswordUIContractTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user('password-fixture', password='Fixture-current-903!')
        self.api = APIClient()
        self.api.force_authenticate(self.user)

    def test_profile_eligibility_and_validation(self):
        self.assertIs(self.api.get('/api/profile/').data['is_social'], False)
        self.assertEqual(self.api.post('/api/profile/change-password/', {
            'current_password': 'incorrect', 'new_password': 'Fixture-new-214!',
            'confirm_password': 'Fixture-new-214!',
        }).status_code, 400)
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password('Fixture-current-903!'))
        self.user.set_unusable_password()
        self.user.save()
        self.assertIs(self.api.get('/api/profile/').data['is_social'], True)
        self.assertEqual(self.api.post('/api/profile/change-password/', {}).status_code, 400)

    def test_exact_ack_and_browser_hash_invalidation(self):
        current, other = Client(), Client()
        current.force_login(self.user)
        other.force_login(self.user)
        response = current.post('/api/profile/change-password/', {
            'current_password': 'Fixture-current-903!', 'new_password': 'Fixture-new-214!',
            'confirm_password': 'Fixture-new-214!',
        })
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {'detail': 'Password changed successfully.'})
        self.user.refresh_from_db()
        self.assertTrue(self.user.check_password('Fixture-new-214!'))
        self.assertEqual(current.get('/api/profile/').status_code, 401)
        self.assertEqual(other.get('/api/profile/').status_code, 401)
