import { describe, expect, it } from 'vitest';
import { decodeJwtPayload } from '../../src/core/jwt';
import { exportCredentials } from '../../src/core/export';
import { credential, fixedNow } from './helpers';

const options = { includeSyntheticIdToken: false, now: fixedNow };

describe('exportCredentials', () => {
  it('emits canonical sub2api batch data with access-token expiry fields', () => {
    const source = credential();
    const result = exportCredentials('sub2api', [source], options);

    expect(result.document).toEqual({
      type: 'sub2api-data',
      version: 1,
      exported_at: '2026-05-24T00:00:00.000Z',
      proxies: [],
      accounts: [
        {
          name: 'lin@local.invalid',
          platform: 'openai',
          type: 'oauth',
          expires_at: 1893456000,
          auto_pause_on_expired: true,
          concurrency: 10,
          priority: 1,
          credentials: {
            access_token: source.accessToken,
            chatgpt_account_id: 'acct_verified',
            chatgpt_user_id: 'user_verified',
            email: 'lin@local.invalid',
            expires_at: '2030-01-01T00:00:00.000Z',
            plan_type: 'plus',
          },
        },
      ],
    });
  });

  it('emits the portable CPA and Cockpit shape without unnecessary session token leakage', () => {
    const source = credential({ sessionToken: 'must-not-export', refreshToken: 'refresh.real' });
    const cpa = exportCredentials('cpa', [source], options).document;
    const cockpit = exportCredentials('cockpit', [source], options).document;

    expect(cpa).toEqual(cockpit);
    expect(cpa).toMatchObject({
      type: 'codex',
      id_token: '',
      refresh_token: 'refresh.real',
      account_id: 'acct_verified',
      last_refresh: '2026-05-24T00:00:00.000Z',
    });
    expect(cpa).not.toHaveProperty('session_token');
  });

  it('generates synthetic identity claims only after explicit opt-in', () => {
    const normal = exportCredentials('cpa', [credential()], options);
    const optedIn = exportCredentials('cpa', [credential()], {
      includeSyntheticIdToken: true,
      now: fixedNow,
    });
    const token = (optedIn.document as { id_token: string }).id_token;

    expect((normal.document as { id_token: string }).id_token).toBe('');
    expect(token.endsWith('.synthetic')).toBe(true);
    expect(decodeJwtPayload(token)).toMatchObject({
      email: 'lin@local.invalid',
      'https://api.openai.com/auth': {
        chatgpt_account_id: 'acct_verified',
        chatgpt_plan_type: 'plus',
      },
    });
    expect(optedIn.warnings.map((warning) => warning.code)).toContain('SYNTHETIC_ID_TOKEN');
  });

  it('never invents an AxonHub refresh token', () => {
    const source = credential();
    const accessOnly = exportCredentials('axonhub', [source], options).document;
    const renewable = exportCredentials(
      'axonhub',
      [credential({ refreshToken: 'refresh.real', idToken: 'id.real.value' })],
      options,
    ).document;

    expect(accessOnly).toMatchObject({
      auth_mode: 'chatgpt',
      tokens: { access_token: source.accessToken },
    });
    expect((accessOnly as { tokens: Record<string, string> }).tokens).not.toHaveProperty(
      'refresh_token',
    );
    expect(renewable).toMatchObject({
      tokens: { refresh_token: 'refresh.real', id_token: 'id.real.value' },
    });
  });

  it('uses 9router access-token import documents rather than asserting OAuth capability', () => {
    const source = credential({ refreshToken: 'not-exported-as-oauth' });
    const result = exportCredentials('9router', [source], options);

    expect(result.document).toEqual({
      accessToken: source.accessToken,
      name: 'lin@local.invalid',
    });
    expect(result.document).not.toHaveProperty('authType');
    expect(result.warnings.map((warning) => warning.code)).toContain('ACCESS_TOKEN_IMPORT_ONLY');
  });

  it('emits current Codex-Manager metadata keys and preserves account identity', () => {
    const source = credential({ idToken: 'id.real.value', refreshToken: 'refresh.real' });
    const result = exportCredentials('codex-manager', [source], options);

    expect(result.document).toEqual({
      tokens: {
        access_token: source.accessToken,
        id_token: 'id.real.value',
        refresh_token: 'refresh.real',
        account_id: 'acct_verified',
      },
      meta: {
        label: 'lin@local.invalid',
        issuer: 'https://chatgpt.com',
        note: 'Imported from a local session conversion.',
        status: 'active',
        workspaceId: 'workspace_verified',
        chatgptAccountId: 'acct_verified',
        exportedAt: 1779580800,
      },
    });
  });

  it('emits arrays with a compatibility warning for multi-account non-batch targets', () => {
    const { accountId: omittedAccountId, ...withoutAccountId } = credential({
      email: 'two@local.invalid',
    });
    const result = exportCredentials('cpa', [credential(), withoutAccountId], options);

    expect(Array.isArray(result.document)).toBe(true);
    expect(omittedAccountId).toBe('acct_verified');
    expect(result.filename).toBe('session-bridge-cpa-2-20260524T000000Z.json');
    expect(result.warnings.map((warning) => warning.code)).toEqual(
      expect.arrayContaining(['MULTI_DOCUMENT_OUTPUT', 'NO_REFRESH_TOKEN', 'NO_ACCOUNT_ID']),
    );
  });
});
