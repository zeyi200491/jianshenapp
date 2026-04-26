import { Decimal } from '@prisma/client/runtime/library';

export function serializeValue<T>(value: T): T {
  if (value instanceof Decimal) {
    return value.toNumber() as T;
  }

  if (Array.isArray(value)) {
    return value.map((item) => serializeValue(item)) as T;
  }

  if (value instanceof Date) {
    return value.toISOString() as T;
  }

  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).map(([key, current]) => [key, serializeValue(current)]);
    return Object.fromEntries(entries) as T;
  }

  return value;
}
