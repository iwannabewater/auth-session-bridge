import type { JsonObject } from './types';
import { isObject, numberValue, objectValue, stringValue } from './value';

function fromBase64Url(segment: string): string | undefined {
  const padded =
    segment.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (segment.length % 4)) % 4);
  try {
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return undefined;
  }
}

function toBase64Url(payload: JsonObject): string {
  const bytes = new TextEncoder().encode(JSON.stringify(payload));
  let binary = '';
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/u, '');
}

export function decodeJwtPayload(token: string | undefined): JsonObject | undefined {
  if (!token) {
    return undefined;
  }
  const segments = token.split('.');
  const segment = segments[1];
  if (!segment) {
    return undefined;
  }
  const json = fromBase64Url(segment);
  if (!json) {
    return undefined;
  }
  try {
    const payload: unknown = JSON.parse(json);
    return isObject(payload) ? payload : undefined;
  } catch {
    return undefined;
  }
}

export function openAiAuth(payload: JsonObject | undefined): JsonObject | undefined {
  return payload ? objectValue(payload['https://api.openai.com/auth']) : undefined;
}

export function tokenExpiry(payload: JsonObject | undefined): number | undefined {
  const expiry = payload ? numberValue(payload.exp) : undefined;
  return expiry === undefined ? undefined : Math.trunc(expiry);
}

export function timestampFromEpoch(seconds: number | undefined): string | undefined {
  if (seconds === undefined) {
    return undefined;
  }
  const date = new Date(seconds * 1000);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

export function isSyntheticIdToken(token: string | undefined): boolean {
  if (!token) {
    return false;
  }
  const payload = decodeJwtPayload(token);
  const headerText = fromBase64Url(token.split('.')[0] ?? '');
  let header: JsonObject | undefined;
  try {
    const parsed: unknown = headerText ? JSON.parse(headerText) : undefined;
    header = isObject(parsed) ? parsed : undefined;
  } catch {
    header = undefined;
  }
  return (
    token.endsWith('.synthetic') ||
    header?.cpa_synthetic === true ||
    stringValue(header?.alg)?.toLowerCase() === 'none' ||
    payload?.cpa_synthetic === true
  );
}

export function buildSyntheticIdToken(
  accountId: string,
  credential: {
    readonly email?: string;
    readonly userId?: string;
    readonly planType?: string;
    readonly expiresAt?: string;
  },
  now: Date,
): string {
  const nowSeconds = Math.trunc(now.getTime() / 1000);
  const expiresSeconds = credential.expiresAt
    ? Math.trunc(new Date(credential.expiresAt).getTime() / 1000)
    : nowSeconds + 90 * 24 * 60 * 60;
  const auth = compactJwt({
    chatgpt_account_id: accountId,
    chatgpt_user_id: credential.userId,
    user_id: credential.userId,
    chatgpt_plan_type: credential.planType,
  });
  const payload = compactJwt({
    iat: nowSeconds,
    exp: Number.isFinite(expiresSeconds) ? expiresSeconds : nowSeconds + 90 * 24 * 60 * 60,
    email: credential.email,
    'https://api.openai.com/auth': auth,
  });
  const header = { alg: 'none', typ: 'JWT', cpa_synthetic: true };
  return `${toBase64Url(header)}.${toBase64Url(payload)}.synthetic`;
}

function compactJwt(entries: Record<string, JsonObject | number | string | undefined>): JsonObject {
  return Object.fromEntries(
    Object.entries(entries).filter(
      (entry): entry is [string, JsonObject | number | string] => entry[1] !== undefined,
    ),
  );
}
