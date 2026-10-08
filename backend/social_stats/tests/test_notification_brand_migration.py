"""Ravinta label migration preserves the persisted notification contract."""
from django.db import connection
from django.db.migrations.executor import MigrationExecutor
from django.test import SimpleTestCase


class NotificationBrandMigrationTests(SimpleTestCase):
    databases = {'default'}

    def test_only_display_label_changes_and_schema_operations_are_empty(self):
        executor = MigrationExecutor(connection)
        old = executor.loader.project_state([
            ('social_stats', '0082_organization_subscriptions'),
        ])
        new = executor.loader.project_state([
            ('social_stats', '0083_alter_notificationpreference_event_type'),
        ])
        old_field = old.apps.get_model('social_stats', 'NotificationPreference')._meta.get_field('event_type')
        new_field = new.apps.get_model('social_stats', 'NotificationPreference')._meta.get_field('event_type')
        old_choices, new_choices = dict(old_field.choices), dict(new_field.choices)
        self.assertEqual(set(old_choices), set(new_choices))
        self.assertEqual(new_choices.pop('client_joined'), 'Your invited client joined Ravinta')
        self.assertEqual(old_choices.pop('client_joined'), 'Your invited client joined Social Stats')
        self.assertEqual(old_choices, new_choices)
        self.assertEqual(old_field.max_length, new_field.max_length)
        migration = executor.loader.get_migration('social_stats', '0083_alter_notificationpreference_event_type')
        with connection.schema_editor(collect_sql=True) as editor:
            migration.apply(old.clone(), editor)
            self.assertEqual(editor.collected_sql, [])
        with connection.schema_editor(collect_sql=True) as editor:
            migration.unapply(new.clone(), editor)
            self.assertEqual(editor.collected_sql, [])
