# Security policy

We take security seriously and welcome reports from researchers, users,
and the public. This document covers the project's **Vulnerability Disclosure
Program (VDP)** and target patching timelines for this independently maintained
repository.

## Reporting a vulnerability

**Preferred channel:** [GitHub private vulnerability reporting](https://github.com/jaavid/social-media-manager/security/advisories/new)
(Security tab → *Report a vulnerability*). Reports stay private between you
and the maintainers until a fix ships.

When reporting, include:

1. A description of the vulnerability + the impact you believe it has
2. Reproduction steps (or a minimal proof-of-concept)
3. Whether you've disclosed this to anyone else
4. Your name / handle if you'd like credit

Maintainers aim to acknowledge security reports within **2 business days**.

### Scope

| In scope | Out of scope |
|---|---|
| The code in this repository (backend API + frontend) | Third-party services the code integrates with (Anthropic, Pinbot, social/messaging platforms) |
| OAuth/bot flows + token handling | DoS / volumetric attacks against someone's self-hosted instance |
| Tenant-isolation bugs (IDOR, SSRF) | Individual self-hosted deployments (report those to their operator) |
| Auth, MFA, session and webhook handling | Self-XSS / clickjacking on logged-out marketing pages |
| Authentication + authorization | Recently-disclosed CVEs in dependencies (we patch via Dependabot) |
| Encryption at rest + in transit | Outdated browser support |

### Safe-harbor

We will not pursue legal action against good-faith researchers who:

- Don't violate users' privacy
- Don't degrade services for other users
- Don't access data beyond the minimum needed to demonstrate the issue
- Give maintainers reasonable time to fix before public disclosure (90 days is requested)

## Bug-bounty rewards

This project does not currently run a paid bounty program. Reports can earn:

- **Public credit** in the Acknowledgements section below and in the fix's release notes (with permission)

## Target patching timelines

Once a vulnerability is **confirmed**, maintainers target the following timelines:

| Severity | Triage target | Patch target | Public disclosure target |
|---|---|---|---|
| **Critical** (data breach, RCE, auth bypass) | 4 hours | 7 days | 30 days post-fix |
| **High** (privilege escalation, CSRF on sensitive ops, stored XSS) | 24 hours | 14 days | 60 days post-fix |
| **Medium** (SSRF on internal services, info disclosure, weak crypto) | 3 business days | 30 days | 90 days post-fix |
| **Low** (clickjacking, missing security header, verbose error messages) | 5 business days | next maintenance release | with the fix |

Severity is assigned using **CVSS 3.1**. These are project targets rather than a
commercial support SLA for individual self-hosted deployments.

### Out-of-cycle releases

For Critical and High issues, maintainers may cut a hotfix release outside the
regular release cadence. Security release notes are published through:

- [GitHub security advisories](https://github.com/jaavid/social-media-manager/security/advisories)
- [GitHub releases](https://github.com/jaavid/social-media-manager/releases)

## Automated security checks

The repository contains CI/security workflows for:

- **Bandit** — Python static security scan
- **pip-audit + safety** — Python dependency vulnerability scans
- **npm audit** — JavaScript dependency vulnerability scans
- **gitleaks** — secret scanning

Dependabot configuration is used to surface dependency updates where enabled for
the repository. Workflow execution depends on GitHub Actions being enabled for
the repository/fork.

## Incident response

For active security incidents affecting a deployment, see the
[Incident Response Runbook](./INCIDENT_RESPONSE.md). Operators of self-hosted
instances remain responsible for their own incident notifications and regulatory
obligations.

---

*Last updated: 2026-09-28 — independent maintenance line*

## Acknowledgements

Researchers who have responsibly disclosed vulnerabilities to the original/upstream
project or this repository (listed with permission):

- **Dicky Mulia Fiqri** — OAuth state validation in social login callbacks, MFA bypass via social login, and missing session/refresh-token revocation on password reset (September 2026, fixed in `9d422bf`)
