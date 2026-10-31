from django.db import migrations, models
import django.db.models.deletion


def create_default_configuration(apps, schema_editor):
    Configuration = apps.get_model("social_stats", "GeminiConfiguration")
    Configuration.objects.get_or_create(pk=1, defaults={"provider": "anthropic"})


class Migration(migrations.Migration):
    dependencies = [
        ("social_stats", "0096_shared_post_history"),
    ]

    operations = [
        migrations.CreateModel(
            name="GeminiModel",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("model_id", models.CharField(max_length=120, unique=True)),
                ("display_name", models.CharField(max_length=160, blank=True)),
                ("description", models.TextField(blank=True)),
                ("input_token_limit", models.PositiveIntegerField(null=True, blank=True)),
                ("output_token_limit", models.PositiveIntegerField(null=True, blank=True)),
                ("available", models.BooleanField(default=True)),
                ("synced_at", models.DateTimeField(null=True, blank=True)),
            ],
            options={"ordering": ["model_id"], "verbose_name": "مدل Google Gemini", "verbose_name_plural": "مدل‌های Google Gemini"},
        ),
        migrations.CreateModel(
            name="GeminiConfiguration",
            fields=[
                ("id", models.PositiveSmallIntegerField(primary_key=True, default=1, serialize=False, editable=False)),
                ("provider", models.CharField(max_length=20, default="anthropic", choices=[("anthropic", "Anthropic Claude"), ("gemini", "Google Gemini")])),
                ("updated_at", models.DateTimeField(auto_now=True)),
                ("default_model", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name="+", to="social_stats.geminimodel")),
                ("fast_model", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name="+", to="social_stats.geminimodel")),
                ("deep_model", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name="+", to="social_stats.geminimodel")),
            ],
            options={"verbose_name": "تنظیمات سرویس هوش مصنوعی", "verbose_name_plural": "تنظیمات سرویس هوش مصنوعی"},
        ),
        migrations.RunPython(create_default_configuration, migrations.RunPython.noop),
    ]
