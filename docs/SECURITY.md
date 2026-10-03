# Security and incident response

Report repository vulnerabilities through [GitHub private vulnerability reporting](https://github.com/jaavid/social-media-manager/security/advisories/new). Include impact, reproduction/PoC, prior disclosure and optional credit name. Do not open a public issue. Maintainers aim to acknowledge within two business days.

## Scope and disclosure

In scope: repository backend/frontend, workspace isolation, OAuth/bots, auth/MFA/sessions, webhooks and encryption. Out of scope: third-party services, volumetric DoS, individual deployments (contact their operator), self-XSS/logged-out clickjacking, recently disclosed dependency CVEs and outdated browsers.
Good-faith researchers must protect privacy, avoid service degradation, access only the minimum evidence and allow reasonable remediation time (90 days requested). Maintainers will not pursue legal action for research meeting these conditions. There is no paid bounty; credit requires permission.

| Confirmed severity (CVSS 3.1) | Triage target | Patch target | Disclosure target |
| --- | --- | --- | --- |
| Critical | 4 hours | 7 days | 30 days after fix |
| High | 24 hours | 14 days | 60 days after fix |
| Medium | 3 business days | 30 days | 90 days after fix |
| Low | 5 business days | Next maintenance release | With fix |

These are maintenance targets, not a commercial SLA. Critical/high fixes may get hotfix releases. Updates: [advisories](https://github.com/jaavid/social-media-manager/security/advisories) and [releases](https://github.com/jaavid/social-media-manager/releases).
CI includes Bandit, pip-audit, safety, npm audit and gitleaks. Dependency scans currently include informational checks; a green workflow does not prove all advisories are resolved.

## Active deployment incident

1. Record time, affected workspaces/users and symptoms. Preserve logs and database/media snapshots privately before remediation where practical.
2. Contain the affected access: revoke sessions/API keys/provider tokens, pause affected workspaces/bots and restrict exposed ingress as needed. Verify each action against the deployed version.
3. Inspect SecurityAuditLog and ActionLog; determine scope and affected data. Check Celery jobs before restarting publication.
4. Patch, rotate compromised secrets using the encryption-key procedure, verify restoration and monitor recurrence.
5. The deployment operator owns user/regulatory notifications. Adapt [notification templates](../templates/breach-notifications/) to the facts and applicable obligations.

For Compose logs: `docker compose logs --since=2h app`; process status: `docker compose exec app supervisorctl status`.
`scripts/security-incident.sh` is an environment-specific helper with mutating commands and AWS/systemd assumptions; inspect it before use. It is not a universal Compose runbook. Automatic external incident alerts are not wired by default.

## Acknowledgement

Dicky Mulia Fiqri: OAuth state validation, social-login MFA bypass and password-reset session/refresh revocation findings, fixed in `9d422bf` (September 2026). Original/upstream and this repository attribution is preserved.
