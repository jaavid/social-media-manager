"""Legacy adapter metric descriptors. Keys preserve actual sync response names.

No cross-provider equivalence or aggregation is claimed. Period and unit are
explicit; follower changes and follower stock have separate labels.
"""
from .manifest import AnalyticsMetric


def builtin_metrics(key):
    definitions = {
        'facebook': [('reach', 'Daily unique reach', 'دسترسی یکتای روزانه'),
                     ('profile_views', 'Page views', 'بازدید صفحه'),
                     ('followers', 'New follows', 'دنبال‌کردن‌های جدید'),
                     ('followers_lost', 'Unfollows', 'لغو دنبال‌کردن'),
                     ('fb_video_views', 'Video views', 'بازدید ویدیو'),
                     ('clicks', 'Page actions', 'عملیات صفحه'),
                     ('likes', 'Post engagements', 'تعامل با پست')],
        'instagram': [('reach', 'Daily reach', 'دسترسی روزانه'),
                      ('total_interactions', 'Total interactions', 'مجموع تعامل‌ها'),
                      ('profile_views', 'Profile views', 'بازدید نمایه'),
                      ('follower_count', 'Follower count', 'تعداد دنبال‌کنندگان'),
                      ('likes', 'Likes', 'پسندها'), ('comments', 'Comments', 'نظرها'),
                      ('shares', 'Shares', 'اشتراک‌ها'), ('saves', 'Saves', 'ذخیره‌ها')],
        'youtube': [('views', 'Video views', 'بازدید ویدیو'),
                    ('estimatedMinutesWatched', 'Estimated watch time', 'زمان تخمینی تماشا', 'minutes'),
                    ('averageViewDuration', 'Average view duration', 'میانگین زمان تماشا', 'seconds'),
                    ('subscribersGained', 'Subscribers gained', 'مشترکان جدید'),
                    ('subscribersLost', 'Subscribers lost', 'مشترکان ازدست‌رفته'),
                    ('likes', 'Likes', 'پسندها'), ('comments', 'Comments', 'نظرها'), ('shares', 'Shares', 'اشتراک‌ها')],
        'linkedin': [('page_views', 'Organization page views', 'بازدید صفحه سازمان'),
                     ('total_clicks', 'Organization clicks', 'کلیک‌های سازمان'),
                     ('followers_gained', 'Followers gained', 'دنبال‌کنندگان جدید')],
        'google_my_business': [('website_clicks', 'Website clicks', 'کلیک وب‌سایت'),
                               ('phone_calls', 'Call clicks', 'کلیک تماس'),
                               ('direction_requests', 'Direction requests', 'درخواست مسیر')],
    }
    return tuple(AnalyticsMetric(*values) for values in definitions.get(key, ()))
