from django.test import SimpleTestCase

from social_stats.views.profile import _email_template


class BrandEmailTests(SimpleTestCase):
    def test_template_uses_product_name_and_keeps_supplied_destination(self):
        html = _email_template(
            'Synthetic notice', 'Hello fixture', '<p>Synthetic body</p>',
            'https://workspace.example.test/dashboard', 'Open Ravinta', 'Synthetic note',
        )
        self.assertIn('Ravinta', html)
        self.assertNotIn('Social Stats', html)
        self.assertNotIn('SocialStats', html)
        self.assertNotIn('>.ai<', html)
        self.assertIn('https://workspace.example.test/dashboard', html)
