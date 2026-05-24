import type { JsonObject, JsonValue } from './types';

export function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function objectValue(value: JsonValue | undefined): JsonObject | undefined {
  return isObject(value) ? value : undefined;
}

export function stringValue(...values: Array<JsonValue | undefined>): string | undefined {
  for (const value of values) {
    if (typeof value === 'string' && value.trim() !== '') {
      return value.trim();
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
      return String(value);
    }
  }
  return undefined;
}

export function numberValue(...values: Array<JsonValue | undefined>): number | undefined {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string' && value.trim() !== '') {
      const number = Number(value);
      if (Number.isFinite(number)) {
        return number;
      }
    }
  }
  return undefined;
}

export function isoTimestamp(value: JsonValue | undefined): string | undefined {
  if (typeof value === 'string' && value.trim() !== '') {
    const millis = Date.parse(value);
    return Number.isFinite(millis) ? new Date(millis).toISOString() : undefined;
  }
  const numeric = numberValue(value);
  if (numeric === undefined) {
    return undefined;
  }
  const millis = numeric > 1_000_000_000_000 ? numeric : numeric * 1000;
  const date = new Date(millis);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

export function compactObject(entries: Record<string, JsonValue | undefined>): JsonObject {
  return Object.fromEntries(
    Object.entries(entries).filter((entry): entry is [string, JsonValue] => entry[1] !== undefined),
  );
}
