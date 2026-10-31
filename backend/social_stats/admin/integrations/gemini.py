"""Admin-only Gemini catalog refresh and global provider/model selection."""
from django.contrib import admin, messages
from django.core.exceptions import ValidationError
from unfold.admin import ModelAdmin

from social_stats.ai.gemini import GeminiGatewayError, list_generation_models
from social_stats.models.ai import GeminiConfiguration, GeminiModel


@admin.register(GeminiModel)
class GeminiModelAdmin(ModelAdmin):
    list_display = ("model_id", "display_name", "available", "input_token_limit",
                    "output_token_limit", "synced_at")
    list_filter = ("available",)
    search_fields = ("model_id", "display_name")
    readonly_fields = ("model_id", "display_name", "description",
                       "available", "input_token_limit", "output_token_limit", "synced_at")
    ordering = ("model_id",)

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False


@admin.register(GeminiConfiguration)
class GeminiConfigurationAdmin(ModelAdmin):
    list_display = ("provider", "default_model", "fast_model", "deep_model", "updated_at")
    fields = ("provider", "default_model", "fast_model", "deep_model")
    actions = ("refresh_gemini_models",)

    def has_add_permission(self, request):
        return not GeminiConfiguration.objects.filter(pk=1).exists() and super().has_add_permission(request)

    def has_delete_permission(self, request, obj=None):
        return False

    def formfield_for_foreignkey(self, db_field, request, **kwargs):
        if db_field.name in {"default_model", "fast_model", "deep_model"}:
            kwargs["queryset"] = GeminiModel.objects.filter(available=True).order_by("model_id")
        return super().formfield_for_foreignkey(db_field, request, **kwargs)

    @admin.action(description="دریافت و به‌روزرسانی فهرست مدل‌های Gemini از طریق Cloudflare")
    def refresh_gemini_models(self, request, queryset):
        if not self.has_change_permission(request):
            self.message_user(request, "دسترسی تغییر تنظیمات لازم است.", messages.ERROR)
            return
        try:
            catalog = list_generation_models()
            if not catalog:
                raise GeminiGatewayError("Google returned no generateContent-capable models")
        except GeminiGatewayError as exc:
            self.message_user(request, str(exc), messages.ERROR)
            return
        from django.db import transaction
        from django.utils import timezone
        now = timezone.now()
        ids = [entry["model_id"] for entry in catalog]
        with transaction.atomic():
            for entry in catalog:
                GeminiModel.objects.update_or_create(
                    model_id=entry["model_id"],
                    defaults={**entry, "available": True, "synced_at": now},
                )
            GeminiModel.objects.exclude(model_id__in=ids).update(available=False)
        self.message_user(request, f"{len(catalog)} مدل Gemini به‌روز شد.", messages.SUCCESS)
