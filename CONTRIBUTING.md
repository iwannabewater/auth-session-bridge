# Contributing

Session Bridge has one narrow responsibility: convert credential document formats locally and state their limitations accurately.

## Non-negotiable rules

- Never add network submission, telemetry, credential persistence, or logging of input/output content.
- Never commit real tokens, sessions, exported account files, or screenshots containing them.
- Never create a placeholder `refresh_token` or describe an access-only export as renewable OAuth.
- Keep English and Chinese interface copy equivalent when changing user-visible text.
- Keep runtime dependencies minimal; fonts are the only intended production dependencies.

## Adapter changes

An output adapter must be justified by an authoritative importer or exporter in the target project. Include synthetic, non-secret tests for both complete credentials and access-token-only credentials. If a target cannot accept a capability safely, expose a warning instead of inventing data.

## Verification

Use Node.js 24.

```bash
npm ci
npx playwright install chromium
npm run verify
```

The verification command must pass before a change is merged or deployed.
