"""Check a disposable, seeded test account through the unified production ingress.

Supply BROWSER_TEST_EMAIL and BROWSER_TEST_PASSWORD; never use production accounts.
No credentials or cookie values are printed.
"""
import http.cookiejar
import json
import os
import sys
from urllib.error import HTTPError
from urllib.request import HTTPCookieProcessor, Request, build_opener

origin = sys.argv[1].rstrip('/')
jar = http.cookiejar.CookieJar()
browser = build_opener(HTTPCookieProcessor(jar))


def request(path, method='GET', data=None, csrf=None, request_origin=None):
    headers = {'X-Browser-Session': '1', 'Origin': request_origin or origin}
    if csrf:
        headers['X-CSRFToken'] = csrf
    if data is not None:
        headers['Content-Type'] = 'application/json'
    req = Request(origin + path, method=method, headers=headers,
                  data=json.dumps(data).encode() if data is not None else None)
    try:
        response = browser.open(req, timeout=30)
    except HTTPError as error:
        response = error
    return response.status, response.headers, response.read()


status, _, body = request('/api/auth/session/')
assert status == 200
csrf = json.loads(body)['csrfToken']
status, headers, body = request('/api/auth/login/', 'POST', {
    'username': os.environ['BROWSER_TEST_EMAIL'],
    'password': os.environ['BROWSER_TEST_PASSWORD'], 'terms_accepted': True,
}, csrf)
assert status == 200
login = json.loads(body)
assert login['session'] and 'access' not in login and 'refresh' not in login
assert any('sessionid=' in cookie and 'HttpOnly' in cookie and 'SameSite=Lax' in cookie
           for cookie in headers.get_all('Set-Cookie', []))
status, _, body = request('/api/auth/me/')
assert status == 200
identity = json.loads(body)
status, _, html = request('/admin/account-settings')
assert status == 200 and identity['email'].encode() in html
assert b'"refresh"' not in html and b'"access"' not in html
csrf = json.loads(request('/api/auth/session/')[2])['csrfToken']
assert request('/api/profile/', 'PATCH', {}, csrf, 'https://attacker.invalid')[0] == 403
assert request('/api/auth/session/', 'DELETE', csrf=csrf)[0] == 204
assert request('/api/auth/me/')[0] == 401
print('Unified ingress: CSRF, opaque cookie login, DAL identity, Origin and logout passed.')
