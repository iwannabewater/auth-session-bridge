import type { Credential, JsonObject } from '../../src/core/types';

export const fixedNow = new Date('2026-05-24T00:00:00.000Z');

export function jwt(
  payload: JsonObject,
  header: JsonObject = { alg: 'RS256', typ: 'JWT' },
): string {
  return `${encode(header)}.${encode(payload)}.signature`;
}

function encode(value: JsonObject): string {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/gu, '-').replace(/\//gu, '_').replace(/=+$/gu, '');
}

export function credential(overrides: Partial<Credential> = {}): Credential {
  return {
    sourceName: 'session.json',
    sourcePath: '$',
    sourceKind: 'chatgpt-session',
    accessToken: jwt({
      email: 'lin@local.invalid',
      exp: 1893456000,
      'https://api.openai.com/auth': { chatgpt_account_id: 'acct_verified' },
    }),
    idTokenSynthetic: false,
    email: 'lin@local.invalid',
    accountId: 'acct_verified',
    chatgptAccountId: 'acct_verified',
    userId: 'user_verified',
    planType: 'plus',
    workspaceId: 'workspace_verified',
    accessTokenExpiresAt: 1893456000,
    expiresAt: '2030-01-01T00:00:00.000Z',
    ...overrides,
  };
}
