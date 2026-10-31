from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('social_stats', '0098_calendar_sync_notification_preference'),
    ]

    operations = [
        migrations.AlterField(
            model_name='geminiconfiguration',
            name='id',
            field=models.PositiveSmallIntegerField(
                default=1, editable=False, primary_key=True,
                serialize=False, verbose_name='شناسه',
            ),
        ),
    ]
