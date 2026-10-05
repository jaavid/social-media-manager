#!/usr/bin/env python3
"""Run inside the Compose app to verify real process privileges and writable paths."""
from pathlib import Path
import os


def main():
    assert (os.getuid(), os.getgid()) == (999, 999), 'container exec must default to 999:999'
    processes = []
    for proc in Path('/proc').iterdir():
        if not proc.name.isdigit():
            continue
        try:
            status = dict(line.split(':', 1) for line in (proc / 'status').read_text().splitlines()
                          if ':' in line)
            command = (proc / 'cmdline').read_bytes().replace(b'\0', b' ').decode()
        except (FileNotFoundError, ProcessLookupError):
            continue
        assert set(status['Uid'].split()) == {'999'}, f'privileged UID: {command}'
        assert set(status['Gid'].split()) == {'999'}, f'privileged GID: {command}'
        assert int(status['CapEff'].strip(), 16) == 0, f'effective capabilities: {command}'
        assert int(status['CapPrm'].strip(), 16) == 0, f'permitted capabilities: {command}'
        assert status['NoNewPrivs'].strip() == '1', f'no-new-privileges missing: {command}'
        if command:
            processes.append(command)
    for expected in ('supervisord', 'next-server', 'daphne', 'celery', 'nginx: master', 'nginx: worker'):
        assert any(expected in command for command in processes), f'missing process: {expected}'
    for directory in ('/app/backend/media', '/app/backend/staticfiles', '/run/socialstats',
                      '/var/cache/nginx', '/app/frontend/.next/cache'):
        path = Path(directory)
        assert (path.stat().st_uid, path.stat().st_gid) == (999, 999), directory
        probe = path / f'.runtime-check-{os.getpid()}'
        try:
            probe.write_text('runtime write check')
        finally:
            probe.unlink(missing_ok=True)
    for code in ('/app/backend/dashboard/settings.py', '/app/frontend/server.js', '/etc/nginx/nginx.conf'):
        assert not os.access(code, os.W_OK), f'application code must not be runtime-writable: {code}'
    print('All supervised processes run as 999:999 with no capabilities; runtime paths are writable.')


if __name__ == '__main__':
    main()
