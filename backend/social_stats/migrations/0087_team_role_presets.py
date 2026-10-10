from django.db import migrations


def seed(apps, schema_editor):
    Preset = apps.get_model('social_stats', 'RolePreset')
    # Immutable policy snapshot. Existing/customized presets are never overwritten.
    actions = 'view_analytics view_posts view_inbox view_audience export_data generate_reports draft_posts publish_posts schedule_posts delete_posts edit_published reply_comments reply_messages reply_reviews delete_comments block_users create_campaigns send_campaigns manage_contacts view_ads create_ads spend_on_ads manage_bots manage_team manage_automation manage_brand_voice disconnect_platforms change_billing approve_posts'.split()
    rows = [
        ('designer', 'طراح / تولیدکننده محتوا', ['view_posts', 'draft_posts']),
        ('brand-manager', 'مدیر برند', ['view_posts', 'view_analytics', 'view_audience', 'generate_reports', 'export_data', 'approve_posts']),
        ('workspace-admin', 'ادمین اجرایی', [a for a in actions if a not in ('change_billing', 'spend_on_ads', 'create_ads', 'send_campaigns')]),
    ]
    for key, label, grants in rows:
        Preset.objects.get_or_create(key=key, defaults={
            'label': label, 'permissions': {a: a in grants for a in actions},
            'approval_defaults': {a: False for a in actions},
        })


class Migration(migrations.Migration):
    dependencies = [('social_stats', '0086_organization_team_onboarding')]
    operations = [migrations.RunPython(seed, migrations.RunPython.noop)]
