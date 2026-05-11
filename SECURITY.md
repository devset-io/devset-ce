# Security Policy

## Supported Versions

| Version | Supported          |
|---------|--------------------|
| 0.1.x   | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability in Devset CE, please report it responsibly.

**Do NOT open a public GitHub issue for security vulnerabilities.**

Instead, please send an email to **security@devset.io** with:

- A description of the vulnerability
- Steps to reproduce the issue
- The potential impact
- Any suggested fix (optional)

You should receive an acknowledgment within **48 hours**. We will work with you to understand and address the issue before any public disclosure.

## Disclosure Policy

- We will confirm receipt of your report within 48 hours.
- We will provide an estimated timeline for a fix within 5 business days.
- We will notify you when the vulnerability is fixed.
- We will credit you in the release notes (unless you prefer to remain anonymous).

## Scope

This policy applies to all components of the Devset CE repository (backend, frontend, and infrastructure). If you find a vulnerability in a third-party dependency, please report it to the maintainers of that dependency and notify us so we can update.

## Security Best Practices for Deployers

- Never expose the application to the public internet without authentication.
- Use environment variables or external configuration for all secrets (broker credentials, database passwords).
- Run the backend behind a reverse proxy with TLS termination.
- Restrict CORS origins to your actual frontend domain in production.
- Review and rotate broker credentials regularly.
