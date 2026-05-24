import {
  decodeJwtPayload,
  isSyntheticIdToken,
  openAiAuth,
  timestampFromEpoch,
  tokenExpiry,
} from './jwt';
import type { Credential, JsonObject, JsonValue, SourceKind } from './types';
import { isoTimestamp, objectValue, stringValue } from './value';

interface CandidateLocation {
  readonly sourceName: string;
  readonly sourcePath: string;
}

function kindOf(record: JsonObject): SourceKind {
  const tokens = objectValue(record.tokens);
  if (stringValue(record.auth_mode) === 'chatgpt' && tokens) {
    return 'axonhub';
  }
  if (stringValue(record.provider) === 'codex' || record.providerSpecificData) {
    return '9router';
  }
  if (tokens && record.meta) {
    return 'codex-manager';
  }
  if (record.credentials) {
    return 'sub2api';
  }
  if (stringValue(record.type) === 'codex') {
    return 'cpa-or-cockpit';
  }
  if (record.user || record.account || record.sessionToken) {
    return 'chatgpt-session';
  }
  return 'credential-json';
}

export function normalizeCredential(
  record: JsonObject,
  location: CandidateLocation,
): Credential | undefined {
  const tokens = objectValue(record.tokens);
  const token = objectValue(record.token);
  const credentials = objectValue(record.credentials);
  const accessToken = stringValue(
    record.accessToken,
    record.access_token,
    tokens?.accessToken,
    tokens?.access_token,
    token?.accessToken,
    token?.access_token,
    credentials?.accessToken,
    credentials?.access_token,
  );
  if (!accessToken) {
    return undefined;
  }

  const meta = objectValue(record.meta);
  const user = objectValue(record.user);
  const account = objectValue(record.account);
  const provider = objectValue(record.providerSpecificData);
  const accessPayload = decodeJwtPayload(accessToken);
  const accessAuth = openAiAuth(accessPayload);
  const idToken = stringValue(
    record.idToken,
    record.id_token,
    tokens?.idToken,
    tokens?.id_token,
    credentials?.id_token,
  );
  const idPayload = decodeJwtPayload(idToken);
  const idAuth = openAiAuth(idPayload);
  const accountId = stringValue(
    account?.id,
    record.accountId,
    record.account_id,
    tokens?.accountId,
    tokens?.account_id,
    record.chatgptAccountId,
    record.chatgpt_account_id,
    meta?.chatgptAccountId,
    meta?.chatgpt_account_id,
    provider?.chatgptAccountId,
    provider?.chatgpt_account_id,
    credentials?.chatgpt_account_id,
    accessAuth?.chatgpt_account_id,
    idAuth?.chatgpt_account_id,
  );
  const accessTokenExpiresAt = tokenExpiry(accessPayload);

  return {
    sourceName: location.sourceName,
    sourcePath: location.sourcePath,
    sourceKind: kindOf(record),
    accessToken,
    ...optional(
      'refreshToken',
      stringValue(
        record.refreshToken,
        record.refresh_token,
        tokens?.refreshToken,
        tokens?.refresh_token,
        credentials?.refresh_token,
      ),
    ),
    ...optional('idToken', idToken),
    idTokenSynthetic: isSyntheticIdToken(idToken),
    ...optional('sessionToken', stringValue(record.sessionToken, record.session_token)),
    ...optional(
      'email',
      stringValue(
        user?.email,
        record.email,
        credentials?.email,
        meta?.label,
        provider?.email,
        idPayload?.email,
        accessPayload?.email,
      ),
    ),
    ...optional('accountId', accountId),
    ...optional('chatgptAccountId', accountId),
    ...optional(
      'userId',
      stringValue(
        user?.id,
        record.userId,
        record.user_id,
        accessAuth?.chatgpt_user_id,
        idAuth?.chatgpt_user_id,
      ),
    ),
    ...optional(
      'workspaceId',
      stringValue(
        account?.workspaceId,
        account?.workspace_id,
        record.workspaceId,
        record.workspace_id,
        meta?.workspaceId,
        meta?.workspace_id,
      ),
    ),
    ...optional(
      'planType',
      stringValue(
        account?.planType,
        account?.plan_type,
        record.planType,
        record.plan_type,
        provider?.chatgptPlanType,
        accessAuth?.chatgpt_plan_type,
        idAuth?.chatgpt_plan_type,
      ),
    ),
    ...optional('accessTokenExpiresAt', accessTokenExpiresAt),
    ...optional(
      'expiresAt',
      timestampFromEpoch(accessTokenExpiresAt) ??
        isoTimestamp(record.expiresAt) ??
        isoTimestamp(record.expires_at) ??
        isoTimestamp(record.expired) ??
        isoTimestamp(record.expires),
    ),
    ...optional(
      'lastRefresh',
      isoTimestamp(record.last_refresh) ?? isoTimestamp(record.lastRefresh),
    ),
  };
}

function optional<Key extends string, Value extends JsonValue>(
  key: Key,
  value: Value | undefined,
): { [Property in Key]?: Value } {
  return value === undefined ? {} : ({ [key]: value } as { [Property in Key]: Value });
}
