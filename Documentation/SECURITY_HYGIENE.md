# Security Hygiene Notes

## Scope

This document records portfolio and repository-hygiene recommendations. It does not change application behaviour, infrastructure, deployment configuration or secrets.

## Repository Hygiene Recommendations

- Never commit `.env` files, service-account material, database credentials or third-party API keys.
- Treat any credential that has appeared in version control as exposed: revoke or rotate it, then remove it from current files and repository history through an approved security process.
- Keep example configuration files limited to placeholders and clearly label them as non-production values.
- Use managed secret storage for deployed environments and separate values by environment.
- Keep generated assets, local caches, test output and machine-specific files out of version control unless they are necessary source artefacts.

## Review Before Publication

Before sharing a deployment or inviting external contributors, review the Git history, issue attachments, screenshots, build logs and documentation for accidental credentials, personal data, hostnames and internal service details.

## Reporting

If a credential is discovered, revoke it first. Do not publish the value in issues, pull requests or documentation. Record the remediation action and replacement date in the private project-security record.
