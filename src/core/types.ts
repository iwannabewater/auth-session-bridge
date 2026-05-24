export type JsonPrimitive = boolean | number | string | null;
export type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
export type JsonObject = { [key: string]: JsonValue };

export const outputFormats = [
  'sub2api',
  'cpa',
  'cockpit',
  '9router',
  'axonhub',
  'codex-manager',
] as const;

export type OutputFormat = (typeof outputFormats)[number];

export type SourceKind =
  | 'chatgpt-session'
  | 'cpa-or-cockpit'
  | 'sub2api'
  | '9router'
  | 'axonhub'
  | 'codex-manager'
  | 'credential-json';

export interface Credential {
  readonly sourceName: string;
  readonly sourcePath: string;
  readonly sourceKind: SourceKind;
  readonly accessToken: string;
  readonly refreshToken?: string;
  readonly idToken?: string;
  readonly idTokenSynthetic: boolean;
  readonly sessionToken?: string;
  readonly email?: string;
  readonly accountId?: string;
  readonly chatgptAccountId?: string;
  readonly userId?: string;
  readonly workspaceId?: string;
  readonly planType?: string;
  readonly accessTokenExpiresAt?: number;
  readonly expiresAt?: string;
  readonly lastRefresh?: string;
}

export type IssueCode =
  | 'EMPTY_INPUT'
  | 'INVALID_JSON'
  | 'INPUT_TOO_LARGE'
  | 'MAX_FILES'
  | 'MAX_DEPTH'
  | 'MAX_NODES'
  | 'MAX_CREDENTIALS'
  | 'NO_CREDENTIAL'
  | 'TOKEN_METADATA_UNAVAILABLE'
  | 'ACCESS_ONLY'
  | 'SYNTHETIC_INPUT_TOKEN';

export interface ParseIssue {
  readonly severity: 'error' | 'warning';
  readonly code: IssueCode;
  readonly sourceName: string;
  readonly path: string;
  readonly detail?: string;
}

export interface ParseLimits {
  readonly maxBytes: number;
  readonly maxDepth: number;
  readonly maxNodes: number;
  readonly maxCredentials: number;
}

export interface ParseReport {
  readonly credentials: Credential[];
  readonly issues: ParseIssue[];
}

export type ExportWarningCode =
  | 'NO_REFRESH_TOKEN'
  | 'NO_ACCOUNT_ID'
  | 'SYNTHETIC_ID_TOKEN'
  | 'MULTI_DOCUMENT_OUTPUT'
  | 'ACCESS_TOKEN_IMPORT_ONLY';

export interface ExportWarning {
  readonly code: ExportWarningCode;
  readonly format: OutputFormat;
}

export interface ExportOptions {
  readonly includeSyntheticIdToken: boolean;
  readonly now: Date;
}

export interface ExportReport {
  readonly document: JsonValue;
  readonly filename: string;
  readonly warnings: ExportWarning[];
}
