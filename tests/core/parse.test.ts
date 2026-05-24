import { describe, expect, it } from 'vitest';
import { mergeReports, parseCredentialText } from '../../src/core/parse';
import { jwt } from './helpers';

describe('parseCredentialText', () => {
  it('accepts a JWT-only input and extracts identity before requiring explicit fields', () => {
    const report = parseCredentialText(
      JSON.stringify({
        accessToken: jwt({
          email: 'claims@local.invalid',
          exp: 1893456000,
          'https://api.openai.com/auth': {
            chatgpt_account_id: 'acct_claims',
            chatgpt_plan_type: 'plus',
          },
        }),
      }),
    );

    expect(report.credentials).toHaveLength(1);
    expect(report.credentials[0]).toMatchObject({
      email: 'claims@local.invalid',
      accountId: 'acct_claims',
      chatgptAccountId: 'acct_claims',
      planType: 'plus',
      accessTokenExpiresAt: 1893456000,
      expiresAt: '2030-01-01T00:00:00.000Z',
    });
    expect(report.issues.map((item) => item.code)).toContain('ACCESS_ONLY');
  });

  it('accepts the minimal AxonHub auth shape and preserves real refresh tokens', () => {
    const report = parseCredentialText(
      JSON.stringify({
        auth_mode: 'chatgpt',
        last_refresh: '2026-05-23T22:00:00Z',
        tokens: {
          access_token: jwt({
            email: 'axon@local.invalid',
            'https://api.openai.com/auth': { chatgpt_account_id: 'acct_axon' },
          }),
          refresh_token: 'refresh.real',
          id_token: 'id.real.value',
        },
      }),
    );

    expect(report.credentials[0]).toMatchObject({
      sourceKind: 'axonhub',
      accountId: 'acct_axon',
      refreshToken: 'refresh.real',
      idToken: 'id.real.value',
      lastRefresh: '2026-05-23T22:00:00.000Z',
    });
    expect(report.issues).toHaveLength(0);
  });

  it('discovers nested sub2api and Codex-Manager accounts without duplicates', () => {
    const sub2api = parseCredentialText(
      JSON.stringify({
        type: 'sub2api-data',
        version: 1,
        accounts: [
          { credentials: { access_token: 'sub-token', email: 'sub@local.invalid' } },
          { credentials: { access_token: 'second-token', email: 'second@local.invalid' } },
        ],
      }),
    );
    const manager = parseCredentialText(
      JSON.stringify({
        tokens: { access_token: 'manager-token', account_id: 'manager-account' },
        meta: { label: 'manager@local.invalid' },
      }),
    );

    expect(sub2api.credentials.map((item) => item.sourceKind)).toEqual(['sub2api', 'sub2api']);
    expect(manager.credentials[0]?.sourceKind).toBe('codex-manager');
  });

  it('marks synthetic input and opaque access-only tokens without rejecting conversion', () => {
    const syntheticHeader = jwt({}, { alg: 'none', typ: 'JWT', cpa_synthetic: true }).replace(
      /signature$/u,
      'synthetic',
    );
    const report = parseCredentialText(
      JSON.stringify({ access_token: 'opaque-token', id_token: syntheticHeader }),
    );

    expect(report.credentials).toHaveLength(1);
    expect(report.issues.map((item) => item.code)).toEqual(
      expect.arrayContaining([
        'TOKEN_METADATA_UNAVAILABLE',
        'ACCESS_ONLY',
        'SYNTHETIC_INPUT_TOKEN',
      ]),
    );
  });

  it('reports empty, malformed, oversized, deeply nested, large and over-count inputs', () => {
    expect(parseCredentialText(' ').issues[0]?.code).toBe('EMPTY_INPUT');
    expect(parseCredentialText('{').issues[0]?.code).toBe('INVALID_JSON');
    expect(
      parseCredentialText('"abcdef"', 'large', {
        maxBytes: 2,
        maxDepth: 2,
        maxNodes: 2,
        maxCredentials: 2,
      }).issues[0]?.code,
    ).toBe('INPUT_TOO_LARGE');
    expect(
      parseCredentialText('{"a":{"b":{"c":1}}}', 'depth', {
        maxBytes: 500,
        maxDepth: 1,
        maxNodes: 20,
        maxCredentials: 2,
      }).issues.some((item) => item.code === 'MAX_DEPTH'),
    ).toBe(true);
    expect(
      parseCredentialText('{"a":1,"b":2}', 'nodes', {
        maxBytes: 500,
        maxDepth: 4,
        maxNodes: 1,
        maxCredentials: 2,
      }).issues.some((item) => item.code === 'MAX_NODES'),
    ).toBe(true);
    expect(
      parseCredentialText('[{"accessToken":"one"},{"accessToken":"two"}]', 'count', {
        maxBytes: 500,
        maxDepth: 4,
        maxNodes: 20,
        maxCredentials: 1,
      }).issues.some((item) => item.code === 'MAX_CREDENTIALS'),
    ).toBe(true);
    expect(
      parseCredentialText('[{"accessToken":"one"}]', 'exact-count', {
        maxBytes: 500,
        maxDepth: 4,
        maxNodes: 20,
        maxCredentials: 1,
      }).issues.some((item) => item.code === 'MAX_CREDENTIALS'),
    ).toBe(false);
  });

  it('merges reports from independently named files', () => {
    const first = parseCredentialText('{"accessToken":"first"}', 'first.json');
    const second = parseCredentialText('{"accessToken":"second"}', 'second.json');
    const report = mergeReports([first, second]);

    expect(report.credentials.map((item) => item.sourceName)).toEqual([
      'first.json',
      'second.json',
    ]);
    expect(report.issues.filter((item) => item.code === 'ACCESS_ONLY')).toHaveLength(2);
  });

  it('caps credentials when independently parsed files exceed the aggregate limit', () => {
    const first = parseCredentialText('{"accessToken":"first"}', 'first.json');
    const second = parseCredentialText('{"accessToken":"second"}', 'second.json');
    const report = mergeReports([first, second], 1);

    expect(report.credentials.map((item) => item.accessToken)).toEqual(['first']);
    expect(report.issues.map((item) => item.code)).toContain('MAX_CREDENTIALS');
  });
});
