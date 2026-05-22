import type { AgendaCandidate, DataConfidence } from "../types";

const severityScore: Record<AgendaCandidate["severity"], number> = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
};

const confidenceScore: Record<DataConfidence, number> = {
  READY_TO_APPROVE: 5,
  SEASONAL_CONTEXT_REQUIRED: 3,
  LUNAR_EVENT_CONTEXT_REQUIRED: 3,
  AD_TRACKING_UNVERIFIED: 3,
  EVIDENCE_WEAK: 2,
  KEYWORD_DEMAND_STALE: 2,
  BUDGET_GUARD_MISSING: 1,
  API_PARTIAL_FAILURE: 1,
  INSUFFICIENT_HISTORY: 1,
};

export function triageAgendaCandidates(candidates: AgendaCandidate[]): AgendaCandidate[] {
  const promotedByDuplicateKey = new Map<string, AgendaCandidate>();

  for (const candidate of candidates) {
    const current = promotedByDuplicateKey.get(candidate.duplicateKey);
    if (!current || compareAgendaCandidate(candidate, current) > 0) {
      promotedByDuplicateKey.set(candidate.duplicateKey, candidate);
    }
  }

  return [...promotedByDuplicateKey.values()].sort((left, right) => compareAgendaCandidate(right, left));
}

function compareAgendaCandidate(left: AgendaCandidate, right: AgendaCandidate): number {
  const severityDelta = severityScore[left.severity] - severityScore[right.severity];
  if (severityDelta !== 0) {
    return severityDelta;
  }

  const confidenceDelta = confidenceScore[left.dataConfidence] - confidenceScore[right.dataConfidence];
  if (confidenceDelta !== 0) {
    return confidenceDelta;
  }

  const evidenceDelta = left.sourceSignalIds.length - right.sourceSignalIds.length;
  if (evidenceDelta !== 0) {
    return evidenceDelta;
  }

  return new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
}
