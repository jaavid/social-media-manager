from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [('social_stats', '0091_calendar_competitors')]
    operations = [
        migrations.AddField(model_name='calendarsource', name='provider_snapshot_id',
                            field=models.CharField(blank=True, max_length=110)),
        migrations.AddField(model_name='calendarsource', name='provider_started_at',
                            field=models.DateTimeField(blank=True, null=True)),
    ]
