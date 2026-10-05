#!/usr/bin/env python3
"""Verify nginx -> Django -> real Celery correlation and sanitized container logs."""
import json
import subprocess
import sys
import time
from urllib.error import HTTPError
from urllib.request import Request, urlopen
import uuid


def main(base_url):
    request_id = f'ci-{uuid.uuid4().hex}'
    secret = f'never-log-{uuid.uuid4().hex}'
    request = Request(f'{base_url}/api/not-a-real-endpoint/?code={secret}&custom={secret}', headers={
        'X-Request-ID': request_id, 'Referer': f'https://provider.invalid/?token={secret}',
        'Authorization': f'Bearer {secret}', 'Cookie': f'sessionid={secret}',
    })
    try:
        response = urlopen(request, timeout=10)
    except HTTPError as error:
        response = error
    with response:
        assert response.status == 404, response.status
        assert response.headers['X-Request-ID'] == request_id, response.headers
        response.read()
    # Before demo setup there are no post queues to process. Actual broker and
    # worker execution exercises publication headers, lifecycle logs and result.
    code = f'''
from social_stats.scheduler import process_post_queues
from social_stats.observability import request_id_context
context = request_id_context.set({request_id!r})
try:
    result = process_post_queues.delay()
finally:
    request_id_context.reset(context)
result.get(timeout=30)
print(result.id)
'''
    completed = subprocess.run(
        ['docker', 'compose', 'exec', '-T', 'app', 'python', 'manage.py', 'shell', '-c', code],
        capture_output=True, text=True, check=True,
    )
    task_id = completed.stdout.strip().splitlines()[-1]
    # Force an upstream failure: nginx's raw error text contains request/query
    # and Referer, which must be sanitized by the stderr wrapper too.
    control = ['docker', 'compose', 'exec', '-T', 'app', 'supervisorctl']
    subprocess.run([*control, 'stop', 'next'], check=True, capture_output=True)
    try:
        request = Request(f'{base_url}/?custom={secret}', headers={
            'X-Request-ID': request_id, 'Referer': f'https://provider.invalid/?unknown={secret}',
        })
        try:
            response = urlopen(request, timeout=10)
        except HTTPError as error:
            response = error
        with response:
            assert response.status == 502, response.status
            assert response.headers['X-Request-ID'] == request_id
            response.read()
    finally:
        subprocess.run([*control, 'start', 'next'], check=True, capture_output=True)
    for attempt in range(20):
        try:
            with urlopen(f'{base_url}/healthz', timeout=5) as response:
                assert response.status == 200
            break
        except HTTPError:
            time.sleep(1)
    else:
        raise AssertionError('frontend did not recover after the nginx error probe')
    logs = subprocess.run(['docker', 'compose', 'logs', '--no-log-prefix', 'app'],
                          capture_output=True, text=True, check=True).stdout
    assert secret not in logs, 'query/header credential leaked into container logs'
    assert 'Supervisor is running as root' not in logs
    assert 'nginx: [warn]' not in logs
    events = []
    for line in logs.splitlines():
        try:
            event = json.loads(line)
        except ValueError:
            continue
        if isinstance(event, dict) and event.get('request_id') == request_id:
            events.append(event)
    assert any(event.get('logger') == 'nginx.access' for event in events), events
    assert any(event.get('message') == 'request_completed' for event in events), events
    assert any(event.get('message') == 'task_started' and event.get('task_id') == task_id
               for event in events), events
    assert any(event.get('message') == 'task_finished' and event.get('task_id') == task_id
               for event in events), events
    assert '"logger": "nginx.error"' in logs, 'nginx stderr did not pass through the JSON formatter'
    print('Nginx, Django and broker-backed Celery share the request ID without query/header secrets.')


if __name__ == '__main__':
    main(sys.argv[1].rstrip('/'))
