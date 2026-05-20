const sensitivePatterns: Array<[RegExp, string]> = [
  [/(api-key:\s*)[^,\s}"']+/gi, "$1[redacted]"],
  [/(customer-id:\s*)[^,\s}"']+/gi, "$1[redacted]"],
  [/(X-API-KEY:\s*)[^,\s}"']+/gi, "$1[redacted]"],
  [/(X-Signature:\s*)[^,\s}"']+/gi, "$1[redacted]"],
  [/(SECRET_KEY:\s*)[^,\s}"']+/gi, "$1[redacted]"],
  [/(secret[_-]?key[=:]\s*)[^,\s}"']+/gi, "$1[redacted]"],
];

export function sanitizeSearchAdErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  return sensitivePatterns.reduce(
    (sanitized, [pattern, replacement]) =>
      sanitized.replace(pattern, replacement),
    message,
  );
}
