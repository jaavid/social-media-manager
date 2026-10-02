from django.db import migrations


def seed(apps, schema_editor):
    Preset = apps.get_model("social_stats", "RolePreset")
    # Immutable migration snapshot; do not import live policy constants here.
    all_actions = "view_analytics view_posts view_inbox view_audience export_data generate_reports draft_posts publish_posts schedule_posts delete_posts edit_published reply_comments reply_messages reply_reviews delete_comments block_users create_campaigns send_campaigns manage_contacts view_ads create_ads spend_on_ads manage_bots manage_team manage_automation manage_brand_voice disconnect_platforms change_billing approve_posts".split()
    read = "view_analytics view_posts view_inbox view_audience generate_reports".split()
    editor = read + ["draft_posts", "schedule_posts", "publish_posts"]
    senior = editor + [
        "publish_posts",
        "edit_published",
        "reply_comments",
        "reply_messages",
        "reply_reviews",
        "approve_posts",
    ]
    manager = senior + [
        "export_data",
        "delete_posts",
        "manage_contacts",
        "create_campaigns",
        "manage_automation",
        "manage_brand_voice",
    ]
    rows = [
        ("owner", "Owner / executive", all_actions, []),
        (
            "social-media-manager",
            "Social media manager",
            manager,
            ["delete_posts", "publish_posts"],
        ),
        ("senior-editor", "Senior editor", senior, []),
        ("editor", "Editor", editor, ["schedule_posts", "publish_posts"]),
        ("analyst", "Analyst", read + ["export_data"], []),
    ]
    for key, label, grants, approvals in rows:
        Preset.objects.get_or_create(
            key=key,
            defaults={
                "label": label,
                "permissions": {a: a in grants for a in all_actions},
                "approval_defaults": {a: a in approvals for a in all_actions},
            },
        )


class Migration(migrations.Migration):
    dependencies = [
        ("social_stats", "0070_rolepreset_alter_approvalrequest_relation_and_more")
    ]
    # Presets may have been customized or referenced; preserve them on rollback.
    operations = [migrations.RunPython(seed, migrations.RunPython.noop)]
