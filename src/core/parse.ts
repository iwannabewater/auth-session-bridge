import { normalizeCredential } from './normalize';
import type { Credential, JsonValue, ParseIssue, ParseLimits, ParseReport } from './types';
import { isObject } from './value';

export const defaultLimits: ParseLimits = {
  maxBytes: 4 * 1024 * 1024,
  maxDepth: 20,
  maxNodes: 20_000,
  maxCredentials: 250,
};

export function parseCredentialText(
  text: string,
  sourceName = 'pasted-json',
  limits = defaultLimits,
): ParseReport {
  if (text.trim() === '') {
    return {
      credentials: [],
      issues: [issue('error', 'EMPTY_INPUT', sourceName, '$')],
    };
  }
  if (new TextEncoder().encode(text).byteLength > limits.maxBytes) {
    return {
      credentials: [],
      issues: [issue('error', 'INPUT_TOO_LARGE', sourceName, '$')],
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    return {
      credentials: [],
      issues: [
        issue(
          'error',
          'INVALID_JSON',
          sourceName,
          '$',
          error instanceof Error ? error.message : undefined,
        ),
      ],
    };
  }

  const state = {
    nodes: 0,
    halted: false,
    credentials: [] as Credential[],
    issues: [] as ParseIssue[],
  };

  visit(parsed as JsonValue, '$', 0, sourceName, limits, state);
  if (
    state.credentials.length === 0 &&
    state.issues.every((item) => item.code !== 'MAX_DEPTH' && item.code !== 'MAX_NODES')
  ) {
    state.issues.push(issue('error', 'NO_CREDENTIAL', sourceName, '$'));
  }
  for (const credential of state.credentials) {
    if (!credential.expiresAt && !credential.email && !credential.accountId) {
      state.issues.push(
        issue('warning', 'TOKEN_METADATA_UNAVAILABLE', sourceName, credential.sourcePath),
      );
    }
    if (!credential.refreshToken) {
      state.issues.push(issue('warning', 'ACCESS_ONLY', sourceName, credential.sourcePath));
    }
    if (credential.idTokenSynthetic) {
      state.issues.push(
        issue('warning', 'SYNTHETIC_INPUT_TOKEN', sourceName, credential.sourcePath),
      );
    }
  }
  return { credentials: state.credentials, issues: state.issues };
}

function visit(
  value: JsonValue,
  path: string,
  depth: number,
  sourceName: string,
  limits: ParseLimits,
  state: {
    nodes: number;
    halted: boolean;
    credentials: Credential[];
    issues: ParseIssue[];
  },
): void {
  if (state.halted) {
    return;
  }
  state.nodes += 1;
  if (state.nodes > limits.maxNodes) {
    state.issues.push(issue('error', 'MAX_NODES', sourceName, path));
    state.halted = true;
    return;
  }
  if (depth > limits.maxDepth) {
    state.issues.push(issue('error', 'MAX_DEPTH', sourceName, path));
    state.halted = true;
    return;
  }
  if (isObject(value)) {
    const credential = normalizeCredential(value, { sourceName, sourcePath: path });
    if (credential) {
      if (state.credentials.length >= limits.maxCredentials) {
        state.issues.push(issue('error', 'MAX_CREDENTIALS', sourceName, path));
        state.halted = true;
        return;
      }
      state.credentials.push(credential);
      return;
    }
    Object.entries(value).forEach(([key, child]) => {
      if (!state.halted) {
        visit(child, `${path}.${key}`, depth + 1, sourceName, limits, state);
      }
    });
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((child, index) => {
      if (!state.halted) {
        visit(child, `${path}[${index}]`, depth + 1, sourceName, limits, state);
      }
    });
  }
}

function issue(
  severity: 'error' | 'warning',
  code: ParseIssue['code'],
  sourceName: string,
  path: string,
  detail?: string,
): ParseIssue {
  return detail
    ? { severity, code, sourceName, path, detail }
    : { severity, code, sourceName, path };
}

export function mergeReports(
  reports: readonly ParseReport[],
  maxCredentials = defaultLimits.maxCredentials,
): ParseReport {
  const credentials = reports.flatMap((report) => report.credentials);
  const issues = reports.flatMap((report) => report.issues);
  if (
    credentials.length > maxCredentials &&
    !issues.some((reportIssue) => reportIssue.code === 'MAX_CREDENTIALS')
  ) {
    issues.push(issue('error', 'MAX_CREDENTIALS', 'selected-files', '$'));
  }
  return {
    credentials: credentials.slice(0, maxCredentials),
    issues,
  };
}
