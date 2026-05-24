# Security policy

Session Bridge handles bearer credentials. A copied input or output can grant account access until the credential expires or is revoked.

## Product guarantees

- Parsing and export occur entirely in the browser.
- The application makes no API requests and writes no credential data to browser storage.
- The deployed page supplies a restrictive Content Security Policy, including `connect-src 'none'`.
- Credential values appear only in the input editor, generated output, an explicit clipboard copy, or an explicit download.
- Repository fixtures use invalid sample identities and are not usable credentials.

GitHub Pages cannot set every security response header. The application therefore enforces applicable policy through HTML metadata and does not rely on server-side storage or processing.

## Safe use

Use the tool only on a trusted device and browser profile. Clear copied credentials from clipboard history where the operating system supports it. If a real credential has been exposed, revoke the session through the account security controls rather than relying on deletion of the copied JSON.

## Reporting a vulnerability

Do not include real tokens or session JSON in a report. Report vulnerabilities privately through GitHub Security Advisories for this repository, with a minimal non-secret reproduction.

Only the latest deployed `main` branch is supported for security fixes.
