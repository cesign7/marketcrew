import type { AgendaCandidate, EvidenceRequest, EvidenceRequestStatus, HypothesisCandidate } from "../domain";
import type { MarketingWorkflowRepository } from "./workflow-repository";
import { buildSampleHypothesisEvidenceQueue, promoteVerifiedHypothesesToAgendaCandidates } from "./evidence-request-guard";
import { recordEvidenceRequestReviewAgentRun } from "./agent-run-recorder";

export type EvidenceRequestReviewResult = {
  evidenceRequest: EvidenceRequest;
  hypothesis?: HypothesisCandidate;
  promotedAgendaCandidate?: AgendaCandidate;
};

export type ReviewEvidenceRequestInput = {
  repository: MarketingWorkflowRepository;
  evidenceRequestId: string;
  status: EvidenceRequestStatus;
  verificationNote?: string;
  verifiedEvidenceIds?: string[];
  reviewedAt?: string;
};

export class EvidenceRequestReviewError extends Error {
  constructor(
    readonly code: "NOT_FOUND",
    message: string,
  ) {
    super(message);
  }
}

export function ensureHypothesisEvidenceQueue(repository: MarketingWorkflowRepository, generatedAt = new Date().toISOString()): void {
  if (repository.listHypothesisCandidates().length > 0 && repository.listEvidenceRequests().length > 0) {
    return;
  }

  const queue = buildSampleHypothesisEvidenceQueue({ generatedAt });
  if (repository.listHypothesisCandidates().length === 0) {
    repository.saveHypothesisCandidates(queue.hypotheses);
  }
  if (repository.listEvidenceRequests().length === 0) {
    repository.saveEvidenceRequests(queue.evidenceRequests);
  }
}

export function reviewEvidenceRequest(input: ReviewEvidenceRequestInput): EvidenceRequestReviewResult {
  const reviewedAt = input.reviewedAt ?? new Date().toISOString();
  const evidenceRequest = input.repository.listEvidenceRequests().find((request) => request.id === input.evidenceRequestId);
  if (!evidenceRequest) {
    throw new EvidenceRequestReviewError("NOT_FOUND", "근거 요청을 찾을 수 없습니다.");
  }

  const updatedEvidenceRequest: EvidenceRequest = {
    ...evidenceRequest,
    status: input.status,
    verificationNote: normalizeOptionalText(input.verificationNote),
    verifiedEvidenceIds: resolveVerifiedEvidenceIds(input),
    updatedAt: reviewedAt,
  };

  input.repository.saveEvidenceRequests([updatedEvidenceRequest]);

  const hypothesis = input.repository
    .listHypothesisCandidates()
    .find((candidate) => candidate.id === updatedEvidenceRequest.hypothesisId);
  const result: EvidenceRequestReviewResult = {
    evidenceRequest: updatedEvidenceRequest,
  };

  if (hypothesis) {
    const relatedRequests = input.repository
      .listEvidenceRequests()
      .filter((request) => hypothesis.requestedEvidenceIds.includes(request.id));
    const allEvidenceVerified = relatedRequests.length > 0 && relatedRequests.every((request) => request.status === "VERIFIED");
    let updatedHypothesis: HypothesisCandidate = {
      ...hypothesis,
      status: allEvidenceVerified ? "VERIFIED" : "WAITING_EVIDENCE",
      updatedAt: reviewedAt,
    };

    if (allEvidenceVerified) {
      const [promotedAgendaCandidate] = promoteVerifiedHypothesesToAgendaCandidates(
        {
          hypotheses: [updatedHypothesis],
          evidenceRequests: relatedRequests,
        },
        { generatedAt: reviewedAt },
      );

      if (promotedAgendaCandidate) {
        input.repository.saveAgendaCandidates([promotedAgendaCandidate]);
        updatedHypothesis = {
          ...updatedHypothesis,
          status: "PROMOTED",
          promotedAgendaCandidateId: promotedAgendaCandidate.id,
          updatedAt: reviewedAt,
        };
        result.promotedAgendaCandidate = promotedAgendaCandidate;
      }
    }

    input.repository.saveHypothesisCandidates([updatedHypothesis]);
    result.hypothesis = updatedHypothesis;
  }

  recordEvidenceRequestReviewAgentRun(input.repository, {
    evidenceRequest: result.evidenceRequest,
    hypothesis: result.hypothesis,
    promotedAgendaCandidate: result.promotedAgendaCandidate,
    reviewedAt,
  });

  return result;
}

function resolveVerifiedEvidenceIds(input: ReviewEvidenceRequestInput): string[] {
  const ids = input.verifiedEvidenceIds ?? [];
  if (input.status !== "VERIFIED") {
    return uniqueNonEmpty(ids);
  }

  const fallbackEvidenceId = `manual-evidence-${input.evidenceRequestId}`;
  return uniqueNonEmpty(ids.length > 0 ? ids : [fallbackEvidenceId]);
}

function normalizeOptionalText(value: string | undefined): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

function uniqueNonEmpty(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}
