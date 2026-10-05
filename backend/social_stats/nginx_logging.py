"""Keep nginx access JSON intact; redact raw nginx error diagnostics before stdout.

Nginx error messages may include the original query-bearing request and Referer,
so its stderr must pass through the same output policy as application errors.
"""
import logging
from logging.config import dictConfig
import signal
import subprocess

from django.conf import settings


def main():
    dictConfig(settings.LOGGING)
    logger = logging.getLogger('nginx.error')
    with subprocess.Popen(
        ['/usr/sbin/nginx', '-g', 'daemon off;'],
        stderr=subprocess.PIPE, text=True,
    ) as process:
        def forward_signal(signum, frame):
            if process.poll() is None:
                process.send_signal(signum)

        signal.signal(signal.SIGTERM, forward_signal)
        signal.signal(signal.SIGINT, forward_signal)
        for line in process.stderr:
            logger.warning(line.rstrip())
        return process.wait()


if __name__ == '__main__':
    raise SystemExit(main())
