import type { AgendaCandidate, EvidenceRequest, HypothesisCandidate } from "../domain";

export type HypothesisEvidenceQueue = {
  hypotheses: HypothesisCandidate[];
  evidenceRequests: EvidenceRequest[];
};

type BuildSampleHypothesisEvidenceQueueInput = {
  generatedAt?: string;
};

type PromoteVerifiedHypothesesInput = {
  generatedAt: string;
};

export function buildSampleHypothesisEvidenceQueue(
  input: BuildSampleHypothesisEvidenceQueueInput = {},
): HypothesisEvidenceQueue {
  const generatedAt = input.generatedAt ?? new Date().toISOString();

  return {
    hypotheses: [
      {
        id: "hypothesis-gro-mobile-evening-gift-card",
        character: "gro",
        title: "부처님오신날 선물카드 모바일 저녁 광고 가설",
        hypothesis:
          "부처님오신날 선물카드 검색 수요가 모바일 저녁 시간대에 몰리는데 광고 기기/시간 설정이 이를 충분히 받지 못했을 수 있습니다.",
        reasonFromKnownSignals: [
          "부처님오신날 선물카드 검색 수요가 시즌 직전에 증가합니다.",
          "키워드광고는 실제 PC/모바일 설정과 시간대 성과 확인이 필요합니다.",
        ],
        requestedEvidenceIds: ["evidence-request-gro-mobile-evening-gift-card"],
        status: "WAITING_EVIDENCE",
        createdAt: generatedAt,
        updatedAt: generatedAt,
      },
      {
        id: "hypothesis-pro-stickersee-season-bundle",
        character: "pro",
        title: "스티커씨 시즌 묶음상품 노출 가설",
        hypothesis:
          "스마트스토어 상위 상품을 시즌 선물 묶음으로 노출하면 검색 수요와 상품 전환 흐름을 함께 받을 수 있습니다.",
        reasonFromKnownSignals: [
          "스마트스토어 상위 상품 집계가 확인됐습니다.",
          "시즌 선물 키워드와 상품 발굴 안건이 연결됩니다.",
        ],
        requestedEvidenceIds: ["evidence-request-pro-stickersee-season-bundle"],
        status: "VERIFIED",
        promotedAgendaCandidateId: "agenda-hypothesis-pro-stickersee-season-bundle",
        createdAt: generatedAt,
        updatedAt: generatedAt,
      },
    ],
    evidenceRequests: [
      {
        id: "evidence-request-gro-mobile-evening-gift-card",
        hypothesisId: "hypothesis-gro-mobile-evening-gift-card",
        requestedBy: "gro",
        verifier: "day",
        neededSource: "search_ad",
        neededFields: ["PC/모바일 집행 설정", "시간대별 광고 성과", "모바일 입찰 가중치"],
        comparisonWindow: "부처님오신날 D-30 ~ D-7, 전년도 같은 상대일",
        reason: "모바일 저녁 검색 수요가 실제 광고 설정과 성과에 반영됐는지 확인해야 합니다.",
        status: "REQUESTED",
        verifiedEvidenceIds: [],
        createdAt: generatedAt,
        updatedAt: generatedAt,
      },
      {
        id: "evidence-request-pro-stickersee-season-bundle",
        hypothesisId: "hypothesis-pro-stickersee-season-bundle",
        requestedBy: "pro",
        verifier: "day",
        neededSource: "smartstore",
        neededFields: ["상위 상품 주문수", "상품별 매출", "클레임 제외 순매출"],
        comparisonWindow: "최근 30일 + 전년도 시즌 윈도우",
        reason: "시즌 묶음 노출 후보가 실제 주문 품질과 연결되는지 확인합니다.",
        status: "VERIFIED",
        verificationNote: "스티커씨 상위 상품 집계와 주문 품질 근거가 확인됐습니다.",
        verifiedEvidenceIds: ["commerce-aggregate-STICKERSEE-2026-05-22"],
        createdAt: generatedAt,
        updatedAt: generatedAt,
      },
    ],
  };
}

export function promoteVerifiedHypothesesToAgendaCandidates(
  queue: HypothesisEvidenceQueue,
  input: PromoteVerifiedHypothesesInput,
): AgendaCandidate[] {
  return queue.hypotheses
    .filter((hypothesis) => canPromoteHypothesis(hypothesis, queue.evidenceRequests))
    .map((hypothesis) => {
      const evidenceIds = queue.evidenceRequests
        .filter((request) => hypothesis.requestedEvidenceIds.includes(request.id))
        .flatMap((request) => request.verifiedEvidenceIds);

      return {
        id: hypothesis.promotedAgendaCandidateId ?? `agenda-${hypothesis.id}`,
        character: hypothesis.character,
        title: `${hypothesis.title} 승격안`,
        summary: hypothesis.hypothesis,
        severity: "MEDIUM",
        sourceSignalIds: [...new Set(evidenceIds)],
        opportunityIds: [hypothesis.id],
        dataConfidence: "READY_TO_APPROVE",
        duplicateKey: `hypothesis:${hypothesis.id}`,
        createdAt: input.generatedAt,
      };
    });
}

export function canPromoteHypothesis(
  hypothesis: HypothesisCandidate,
  evidenceRequests: EvidenceRequest[],
): boolean {
  const requests = evidenceRequests.filter((request) => hypothesis.requestedEvidenceIds.includes(request.id));

  return hypothesis.status === "VERIFIED" && requests.length > 0 && requests.every((request) => request.status === "VERIFIED");
}
