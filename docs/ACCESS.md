# فضای کاری و دسترسی

فضای کاری ظرف حساب‌ها، پست‌ها، آمار، پیام‌ها و تنظیمات یک برند است. مالک، اعضا و آژانس فقط در محدودهٔ مجاز خود کار می‌کنند. مجوز backend مرجع نهایی است؛ نمایش یک دکمه در UI مجوز ایجاد نمی‌کند.

## نقش و تأیید

- `superadmin`: مدیریت پلتفرم؛ `staff`: محدودهٔ اختصاص‌داده‌شده و مجوزهای خودش.
- `client` نام فنیِ نقش عضو فضای کاری است؛ `end_user` و `agency_member` نوع حساب‌اند.
- presetهای مالک/مدیر، مدیر شبکه اجتماعی، سردبیر، ویراستار و تحلیلگر فقط با انتخاب صریح اعمال می‌شوند.
- مجوز عمل و نیاز به تأیید جدا هستند. تأیید نمی‌تواند منع دسترسی را دور بزند.
- الزام تأیید فضای کاری/رابطهٔ آژانس حداقل اجباری است. نویسنده یا درخواست‌کنندهٔ انتشار نمی‌تواند درخواست خودش را تأیید کند.
- worker پیش از انتشار، عضویت و دسترسی فعلی به مقصد را دوباره بررسی می‌کند. زمان‌بندی به هر دو مجوز انتشار و زمان‌بندی نیاز دارد.
- ویرایش محتوای تأییدشده تأیید قبلی را باطل می‌کند. پست/صف بدون عامل قابل‌شناسایی منتشر نمی‌شود.

موتور واحد [authorization.py](../backend/social_stats/authorization.py) است. اول مرز فضای کاری/حساب و عضویت فعال، سپس مجوزهای پایه، preset سازمان/فضای کاری، استثناهای فضای کاری و در آخر استثناهای حساب بررسی می‌شود. منع صریح کاربر و سقف دسترسی آژانس/staff همچنان اعمال می‌شوند؛ مجوز حساب محدودهٔ فضای کاری را گسترش نمی‌دهد.

## مدیریت تیم

Access Management → Workspace Team. تنظیم سیاست به مالک فضای کاری یا superadmin و عضو از قبل مجاز نیاز دارد.

| API | کاربرد |
| --- | --- |
| `GET /api/management/role-presets/` | presetها |
| `GET /api/management/workspaces/{id}/team-policy/` | اعضا و سیاست |
| `GET/PUT /api/management/workspaces/{id}/team-policy/{user_id}/` | سیاست عضو |
| `GET/PUT/DELETE /api/management/workspaces/{id}/accounts/{account_id}/policy/{user_id}/` | استثناهای حساب |
| `GET/PUT /api/management/organizations/{agency_id}/members/{user_id}/preset/` | preset عضو سازمان؛ مالک سازمان یا superadmin |

`PUT` نقشهٔ استثناهای همان محدوده را جایگزین می‌کند؛ کلید حذف‌شده ارث می‌برد و `false` منع صریح است. تغییرات در ActionLog ثبت می‌شوند.

## قرارداد سازگاری

در کد جدید و UI از `workspace` / «فضای کاری» استفاده کنید. APIهای `workspaces/` و `management/workspaces/` نام‌های اصلی‌اند؛ `clients/` و `management/clients/` همچنان با همان داده و کنترل دسترسی کار می‌کنند.
فیلدهای `workspace`، `workspace_id`، `workspace_ids` و `assigned_workspaces` با نام‌های قدیمی متناظر سازگارند؛ ارسال مقادیر متعارض خطاست. JSONهای آزاد بازنویسی نمی‌شوند.
مسیر UI اصلی `/admin/workspaces` و `/admin/workspace/{id}` است؛ aliasهای قدیمی و portalهای `/client/*` حفظ شده‌اند.
مدل `Client`، ستون‌های `client_id`، کدهای مجوز و جداول legacy را بدون migration جداگانه تغییر یا حذف نکنید. مرجع تبدیل: [workspace_vocabulary.py](../backend/social_stats/workspace_vocabulary.py).
