from django.db import migrations, models
import django.db.models.deletion


def migrate_credentials(apps, schema_editor):
    SocialAccount = apps.get_model('social_stats', 'SocialAccount')
    PlatformCredential = apps.get_model('social_stats', 'PlatformCredential')
    for credential in PlatformCredential.objects.all().iterator():
        external_id = (
            credential.instagram_account_id or credential.channel_id
            or credential.organization_id or credential.gmb_location_id
            or credential.page_id or credential.platform_user_id
            or f'legacy-{credential.pk}'
        )
        display_name = (
            credential.channel_name or credential.organization_name
            or credential.page_name or external_id
        )
        account, _ = SocialAccount.objects.get_or_create(
            client_id=credential.client_id,
            platform=credential.platform,
            external_id=external_id,
            defaults={'display_name': display_name, 'is_active': credential.is_active},
        )
        credential.social_account_id = account.pk
        credential.save(update_fields=['social_account'])


class Migration(migrations.Migration):
    dependencies = [('social_stats', '0066_centralize_platform_choices')]
    operations = [
        migrations.CreateModel(
            name='SocialAccount',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('platform', models.CharField(choices=[('facebook', 'Facebook'), ('instagram', 'Instagram'), ('linkedin', 'LinkedIn'), ('tiktok', 'TikTok'), ('telegram', 'Telegram'), ('bale', 'Bale'), ('eitaa', 'Eitaa'), ('youtube', 'YouTube'), ('aparat', 'Aparat'), ('google_my_business', 'Google Business Profile'), ('neshan', 'Neshan')], max_length=30)),
                ('external_id', models.CharField(max_length=200)),
                ('display_name', models.CharField(blank=True, max_length=200)),
                ('username', models.CharField(blank=True, max_length=200)),
                ('avatar_url', models.URLField(blank=True, max_length=500)),
                ('metadata', models.JSONField(blank=True, default=dict)),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('client', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='social_accounts', to='social_stats.client')),
            ],
            options={'ordering': ['platform', 'display_name', 'id']},
        ),
        migrations.AddConstraint(
            model_name='socialaccount',
            constraint=models.UniqueConstraint(fields=('client', 'platform', 'external_id'), name='unique_social_account_identity'),
        ),
        migrations.AddField(
            model_name='platformcredential', name='social_account',
            field=models.OneToOneField(blank=True, null=True, on_delete=django.db.models.deletion.CASCADE, related_name='credential', to='social_stats.socialaccount'),
        ),
        migrations.RunPython(migrate_credentials, migrations.RunPython.noop),
        migrations.AlterUniqueTogether(name='platformcredential', unique_together=set()),
    ]
