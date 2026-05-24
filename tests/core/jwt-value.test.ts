import { describe, expect, it } from 'vitest';
import {
  buildSyntheticIdToken,
  decodeJwtPayload,
  isSyntheticIdToken,
  openAiAuth,
  timestampFromEpoch,
  tokenExpiry,
} from '../../src/core/jwt';
import {
  compactObject,
  isoTimestamp,
  numberValue,
  objectValue,
  stringValue,
} from '../../src/core/value';
import { fixedNow, jwt } from './helpers';

describe('JWT and JSON primitives', () => {
  it('handles decodable, malformed and unavailable payloads safely', () => {
    const payload = {
      exp: 1893456000,
      'https://api.openai.com/auth': { chatgpt_account_id: 'acct' },
    };

    expect(decodeJwtPayload(jwt(payload))).toEqual(payload);
    expect(decodeJwtPayload('bad.token')).toBeUndefined();
    expect(decodeJwtPayload(undefined)).toBeUndefined();
    expect(openAiAuth(payload)).toEqual({ chatgpt_account_id: 'acct' });
    expect(tokenExpiry(payload)).toBe(1893456000);
    expect(timestampFromEpoch(1893456000)).toBe('2030-01-01T00:00:00.000Z');
    expect(timestampFromEpoch(undefined)).toBeUndefined();
  });

  it('builds and identifies explicitly synthetic tokens', () => {
    const token = buildSyntheticIdToken(
      'account',
      { email: 'unicode+测试@local.invalid', userId: 'user', planType: 'plus' },
      fixedNow,
    );

    expect(isSyntheticIdToken(token)).toBe(true);
    expect(isSyntheticIdToken(jwt({ email: 'real@local.invalid' }))).toBe(false);
    expect(decodeJwtPayload(token)?.email).toBe('unicode+测试@local.invalid');
  });

  it('normalizes values without retaining undefined fields', () => {
    expect(objectValue({ value: 'x' })).toEqual({ value: 'x' });
    expect(objectValue('x')).toBeUndefined();
    expect(stringValue('', 42, 'later')).toBe('42');
    expect(numberValue('42', null)).toBe(42);
    expect(numberValue('not-number')).toBeUndefined();
    expect(isoTimestamp('2030-01-01T00:00:00Z')).toBe('2030-01-01T00:00:00.000Z');
    expect(isoTimestamp(1893456000)).toBe('2030-01-01T00:00:00.000Z');
    expect(isoTimestamp('invalid')).toBeUndefined();
    expect(compactObject({ included: 'yes', omitted: undefined })).toEqual({ included: 'yes' });
  });
});
