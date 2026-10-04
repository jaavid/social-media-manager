# ============================================================================
#  Social Stats — Social Media Management & Marketing Platform
#  Author    : Chandrabhan Shekhawat
#  Company   : Gigai Kripa Services
#  Website   : https://gigaikripaservices.com/
#  Copyright (c) 2026 Chandrabhan Shekhawat / Gigai Kripa Services.
#  Released under the MIT License — see LICENSE. Keep this notice.
# ============================================================================
"""Roi models."""
from django.db import models

from social_stats.models.workspaces import Client

class ROISettings(models.Model):
    client              = models.OneToOneField(Client, verbose_name='فضای کاری', on_delete=models.CASCADE, related_name='roi_settings')
    facebook_budget     = models.DecimalField(verbose_name='بودجه فیسبوک', max_digits=10, decimal_places=2, default=0)
    instagram_budget    = models.DecimalField(verbose_name='بودجه اینستاگرام', max_digits=10, decimal_places=2, default=0)
    youtube_budget      = models.DecimalField(verbose_name='بودجه یوتیوب', max_digits=10, decimal_places=2, default=0)
    linkedin_budget     = models.DecimalField(verbose_name='بودجه لینکدین', max_digits=10, decimal_places=2, default=0)
    gmb_budget          = models.DecimalField(verbose_name='بودجه کسب‌وکار گوگل', max_digits=10, decimal_places=2, default=0)
    agency_fee          = models.DecimalField(verbose_name='حق‌الزحمه آژانس', max_digits=10, decimal_places=2, default=0)
    avg_sale_value      = models.DecimalField(verbose_name='میانگین ارزش هر فروش', max_digits=10, decimal_places=2, default=0)
    conversion_rate     = models.DecimalField(verbose_name='نرخ تبدیل کلیک به سرنخ (درصد)', max_digits=5, decimal_places=2, default=2.5)
    lead_to_sale_rate   = models.DecimalField(verbose_name='نرخ تبدیل سرنخ به فروش (درصد)', max_digits=5, decimal_places=2, default=20.0)
    currency            = models.CharField(verbose_name='کد ارز', max_length=10, default='USD')
    currency_symbol     = models.CharField(verbose_name='نماد ارز', max_length=5, default='$')
    monthly_revenue_goal = models.DecimalField(verbose_name='هدف درآمد ماهانه', max_digits=12, decimal_places=2, default=0)
    monthly_leads_goal  = models.IntegerField(verbose_name='هدف تعداد سرنخ ماهانه', default=0)
    updated_at          = models.DateTimeField(verbose_name='آخرین ویرایش', auto_now=True)

    def __str__(self):
        return f"تنظیمات بازگشت سرمایه — {self.client.company}"

    @property
    def total_budget(self):
        return (self.facebook_budget + self.instagram_budget + self.youtube_budget +
                self.linkedin_budget + self.gmb_budget + self.agency_fee)

    class Meta:
        verbose_name = 'تنظیمات بازگشت سرمایه'
        verbose_name_plural = 'تنظیمات بازگشت سرمایه'


# ── ROI Report ────────────────────────────────────────────────────────────────
class ROIReport(models.Model):
    client            = models.ForeignKey(Client, verbose_name='فضای کاری', on_delete=models.CASCADE, related_name='roi_reports')
    month             = models.IntegerField(verbose_name='ماه', )
    year              = models.IntegerField(verbose_name='سال', )
    total_investment  = models.DecimalField(verbose_name='مجموع سرمایه‌گذاری', max_digits=12, decimal_places=2, default=0)
    agency_fee        = models.DecimalField(verbose_name='حق‌الزحمه آژانس', max_digits=10, decimal_places=2, default=0)
    total_clicks      = models.BigIntegerField(verbose_name='مجموع کلیک‌ها', default=0)
    total_impressions = models.BigIntegerField(verbose_name='مجموع نمایش‌ها', default=0)
    total_reach       = models.BigIntegerField(verbose_name='مجموع دسترسی مخاطبان', default=0)
    website_clicks    = models.BigIntegerField(verbose_name='تعداد کلیک وب‌سایت', default=0)
    estimated_leads   = models.IntegerField(verbose_name='تعداد سرنخ تخمینی', default=0)
    estimated_sales   = models.IntegerField(verbose_name='تعداد فروش تخمینی', default=0)
    estimated_revenue = models.DecimalField(verbose_name='درآمد تخمینی', max_digits=14, decimal_places=2, default=0)
    roi_percentage    = models.DecimalField(verbose_name='بازگشت سرمایه (درصد)', max_digits=10, decimal_places=2, default=0)
    cost_per_click    = models.DecimalField(verbose_name='هزینه هر کلیک', max_digits=10, decimal_places=4, default=0)
    cost_per_lead     = models.DecimalField(verbose_name='هزینه هر سرنخ', max_digits=10, decimal_places=4, default=0)
    cost_per_sale     = models.DecimalField(verbose_name='هزینه هر فروش', max_digits=10, decimal_places=4, default=0)
    platform_breakdown = models.JSONField(verbose_name='تفکیک آمار پلتفرم‌ها', default=dict)
    generated_at      = models.DateTimeField(verbose_name='زمان تولید گزارش', auto_now_add=True)

    class Meta:
        verbose_name_plural = 'گزارش‌های بازگشت سرمایه'
        verbose_name = 'گزارش بازگشت سرمایه'
        unique_together = ('client', 'month', 'year')
        ordering = ['-year', '-month']

    def __str__(self):
        return f"گزارش بازگشت سرمایه — {self.client.company} {self.month}/{self.year}"


# ── Sync Log ──────────────────────────────────────────────────────────────────
