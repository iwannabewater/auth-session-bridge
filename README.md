# Session Bridge

[中文文档](./README.zh-CN.md)

A local-only browser tool that converts ChatGPT session or Codex-compatible credential JSON into import documents for CPA / CLIProxyAPI, sub2api, Cockpit Tools, 9router, AxonHub, and Codex-Manager.

[Open the deployed application](https://iwannabewater.github.io/GPTSession2CPAandSub2API/)

## Security first

The input and output contain access credentials. Treat them like passwords.

- Conversion runs in the browser. The application has no upload, telemetry, or persistence path.
- A Content Security Policy blocks runtime connections from the deployed page.
- Pasted input or a selected file batch larger than 4 MiB, excessive nesting, and oversized account batches are rejected before conversion.
- Access-token-only accounts cannot renew themselves after expiry.
- Synthetic ID tokens are disabled by default. When explicitly enabled, they carry compatibility claims only and are visibly warned as unauthenticated.

Do not commit credential JSON, paste it into issues, or share it in chat logs.

## Use

Open the GitHub Pages deployment, paste JSON or drop one or more `.json` files, select an output format, then copy or download the generated document. Use the `English / 中文` control to switch the complete interface language.

To retrieve a ChatGPT Web session, sign in to ChatGPT in a separate browser tab and open `https://chatgpt.com/api/auth/session`. Copy the returned JSON only into this local converter. It contains sensitive credentials.

The safe example in the page uses an invalid local-domain identity and a non-authenticating sample token. It is suitable for UI evaluation only.

## Format support

| Output          | Export behavior                                                                                           |
| --------------- | --------------------------------------------------------------------------------------------------------- |
| `sub2api`       | Canonical batch payload with `type: "sub2api-data"`, `version: 1`, per-account expiry and pause behavior. |
| `CPA`           | Portable flat Codex token storage accepted by CLIProxyAPI-compatible flows.                               |
| `Cockpit`       | Portable flat Codex token storage used by Cockpit Tools.                                                  |
| `9router`       | Verified direct access-token import document; it does not claim OAuth renewal capability.                 |
| `AxonHub`       | ChatGPT auth JSON; `refresh_token` is included only when it exists in the input.                          |
| `Codex-Manager` | Token payload with current metadata keys, including `workspaceId` and `chatgptAccountId` when detected.   |

Recognized inputs include ChatGPT Web session JSON, JWT-only access-token JSON, and exports from each supported target. Identity and expiry hints may be decoded from JWT payloads; decoding is not token verification.

## Engineering model

```text
src/core/parse.ts       bounded traversal of untrusted JSON
src/core/normalize.ts   normalized credential record extraction
src/core/export.ts      target-specific output contracts
src/core/jwt.ts         claims decoding and explicit synthetic-token option
src/ui/app.ts           browser interaction without persistence
src/i18n.ts             typed English and Chinese catalog
```

The interface is a Vite-built static application written in strict TypeScript. Charter is bundled for English; the simplified Chinese LXGW WenKai Screen stylesheet is loaded only when the Chinese interface is selected.

## Development

Requirements: Node.js 24 and npm.

```bash
npm ci
npx playwright install chromium
npm run dev
npm run verify
```

`npm run verify` enforces formatting, linting, strict type checking, unit tests with coverage thresholds, a production build, and browser tests at desktop and mobile viewports.

## Compatibility maintenance

Format adapters are grounded in the current import or export implementations of CLIProxyAPI, sub2api, AxonHub, 9router, Cockpit Tools, and Codex-Manager. When a target changes its accepted document shape, update its adapter and fixtures together, then run the full verification command.

## License

MIT. Distributed font notices are included in [`public/licenses/THIRD-PARTY-NOTICES.txt`](./public/licenses/THIRD-PARTY-NOTICES.txt).
