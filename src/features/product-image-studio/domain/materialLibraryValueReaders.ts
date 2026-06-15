export function normalizeOptionalString(value: string | undefined): string | undefined {
  return value?.trim() || undefined;
}

export function normalizeRequiredString(value: string): string | null {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

export function readString(value: unknown): string | null {
  return typeof value === "string" ? normalizeRequiredString(value) : null;
}

export function readPositiveNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
}

export function isColorHex(value: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(value);
}

export function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
