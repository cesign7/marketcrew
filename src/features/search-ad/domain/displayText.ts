export function truncateDisplayText(value: string, maxLength = 34) {
  const normalized = value.trim();
  const chars = Array.from(normalized);
  if (chars.length <= maxLength) {
    return normalized;
  }

  const candidate = chars.slice(0, Math.max(1, maxLength)).join("").trimEnd();
  const lastSpaceIndex = candidate.lastIndexOf(" ");
  const wordSafeCandidate = lastSpaceIndex > Math.floor(maxLength * 0.55) ? candidate.slice(0, lastSpaceIndex) : candidate;

  return `${wordSafeCandidate}…`;
}
