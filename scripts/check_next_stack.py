"""Exercise the production ingress without assuming SPA fallback HTML."""
import re
import sys
from urllib.request import urlopen
from urllib.error import HTTPError

origin = sys.argv[1].rstrip('/')
def get(path):
    try:
        with urlopen(origin + path, timeout=20) as response:
            return response.status, response.read().decode()
    except HTTPError as error:
        return error.code, error.read().decode()

status, html = get('/privacy')
assert status == 200 and '<h1' in html and 'Privacy Policy' in html
assert 'dir="rtl"' in html and '<title>Privacy Policy' in html
for kind, pattern in [('JS', r'src="(/_next/static/[^"?]+\.js)'), ('CSS', r'href="(/_next/static/[^"?]+\.css)')]:
    asset = re.search(pattern, html)
    assert asset, f'{kind} asset missing'
    assert get(asset[1])[0] == 200, asset[1]
for path in ['/admin/account-settings', '/admin/analytics/dashboard', '/dashboard/account-settings', '/agency', '/u', '/login']:
    assert get(path)[0] == 200, path
for path in ['/not-a-real-route', '/blog/not-a-real-slug', '/product/not-a-real-slug']:
    assert get(path)[0] == 404, path
assert get('/static/admin/css/base.css')[0] == 200
assert get('/api/auth/me/')[0] in (401, 403)
assert get('/backend/')[0] == 200
assert get('/healthz')[0] == 200
assert 'socialstats-' in get('/sw.js')[1]
print('Next SSR, deep links, true 404s, assets, Django API/admin and health passed')
