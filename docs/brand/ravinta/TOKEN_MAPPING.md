# Mapping into existing runtime tokens

`palette.json` مشخصات طراحی است، نه فایل theme قابل import. هنگام اجرای #103، تغییرات در `frontend/src/styles/tokens.css` اعمال شوند؛ aliases و shadcn/Tailwind bridge موجود حفظ شوند. جدول زیر migration target است، نه ادعای وضعیت runtime فعلی.

| Canonical token | Light target | Dark target |
| --- | --- | --- |
| `--brand-primary` | `#123D3A` | `#D6F268` |
| `--text-on-brand` | `#FFFFFF` | `#123D3A` |
| `--surface-page` | `#F7F9F8` | `#102B29` |
| `--surface-card` | `#FFFFFF` | `#173A35` |
| `--surface-sunken` | `#E8EFEC` | `#0D2422` |
| `--text-primary` | `#172A28` | `#F7F9F8` |
| `--text-secondary` | `#49615C` | `#B8CDC4` |
| `--border-focus` | `#21694B` | `#D6F268` |

در migration، hover/active/soft، لینک، border/control contrast، semantic foreground/background و chart series نیز به‌صورت یک ماتریس کامل محاسبه و بررسی شوند؛ جایگزینی سادهٔ چند hex کافی نیست. WCAG AA متن معمولی حداقل 4.5:1؛ متن بزرگ و کنترل/indicator ضروری حداقل 3:1.

- primitive tokens فقط از canonical styles تغذیه شوند؛ نام raw brand ثابت و semantic primary وابسته به theme است.
- explicit dark و system-dark پیش از hydration یکسان باشند.
- font family از loader فعلی؛ weight و line-height مطابق TYPOGRAPHY.md.
- provider brand/icon از manifest/registry؛ feature CSS مخصوص شبکهٔ جدید ممنوع.
- رنگ‌های نمودار باید از هم قابل تمایز باشند و label/pattern داشته باشند؛ همهٔ series نفتی/لیمویی نشوند.
- catalog `/design-system` قبل از migration صفحات به‌روز شود.
- شواهد contrast و first paint در PR اجرایی گزارش شوند.
