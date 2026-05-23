"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, SearchCheck, ShieldAlert } from "lucide-react";
import type { EvidenceRequestStatus } from "@/lib/domain";

type EvidenceRequestReviewActionsProps = {
  requestId: string;
  requestStatus?: EvidenceRequestStatus;
};

type PatchResponse = {
  evidenceRequest?: {
    status?: EvidenceRequestStatus;
  };
  promotedAgendaCandidate?: {
    id: string;
  };
  error?: {
    code?: string;
    message?: string;
  };
};

export function EvidenceRequestReviewActions({ requestId, requestStatus }: EvidenceRequestReviewActionsProps) {
  const router = useRouter();
  const [submittingStatus, setSubmittingStatus] = useState<EvidenceRequestStatus | undefined>();
  const [message, setMessage] = useState<string | undefined>();

  if (!requestStatus) {
    return null;
  }

  if (requestStatus === "VERIFIED") {
    return (
      <div className="evidence-request-actions">
        <span role="status">검증 완료</span>
      </div>
    );
  }

  async function updateStatus(status: EvidenceRequestStatus) {
    setSubmittingStatus(status);
    setMessage(undefined);

    try {
      const response = await fetch(`/api/evidence-requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          verificationNote: reviewNote(status),
          verifiedEvidenceIds: status === "VERIFIED" ? [`manual-evidence-${requestId}`] : [],
        }),
      });
      const payload = (await response.json()) as PatchResponse;

      if (!response.ok || payload.error) {
        setMessage(payload.error?.message ?? "근거 요청 상태를 바꾸지 못했습니다.");
        return;
      }

      setMessage(resultMessage(status, Boolean(payload.promotedAgendaCandidate)));
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.");
    } finally {
      setSubmittingStatus(undefined);
    }
  }

  return (
    <div className="evidence-request-actions">
      {requestStatus === "REQUESTED" ? (
        <button
          className="secondary-button"
          disabled={Boolean(submittingStatus)}
          onClick={() => void updateStatus("COLLECTING")}
          type="button"
        >
          {submittingStatus === "COLLECTING" ? <Loader2 size={15} aria-hidden="true" /> : <SearchCheck size={15} aria-hidden="true" />}
          수집 시작
        </button>
      ) : null}
      <button
        className="primary-button"
        disabled={Boolean(submittingStatus)}
        onClick={() => void updateStatus("VERIFIED")}
        type="button"
      >
        {submittingStatus === "VERIFIED" ? <Loader2 size={15} aria-hidden="true" /> : <CheckCircle2 size={15} aria-hidden="true" />}
        근거 충분
      </button>
      {requestStatus !== "INSUFFICIENT" ? (
        <button
          className="secondary-button"
          disabled={Boolean(submittingStatus)}
          onClick={() => void updateStatus("INSUFFICIENT")}
          type="button"
        >
          {submittingStatus === "INSUFFICIENT" ? (
            <Loader2 size={15} aria-hidden="true" />
          ) : (
            <ShieldAlert size={15} aria-hidden="true" />
          )}
          근거 부족
        </button>
      ) : null}
      {message ? <span role="status">{message}</span> : null}
    </div>
  );
}

function reviewNote(status: EvidenceRequestStatus): string {
  const notes: Record<EvidenceRequestStatus, string> = {
    REQUESTED: "근거 요청을 다시 확인 대기로 돌렸습니다.",
    COLLECTING: "데이가 원천 필드와 비교 기간을 수집하는 중입니다.",
    VERIFIED: "데이가 화면에서 확인 가능한 근거를 충분하다고 판정했습니다.",
    INSUFFICIENT: "데이가 현재 근거만으로는 결재 승격이 어렵다고 판정했습니다.",
  };

  return notes[status];
}

function resultMessage(status: EvidenceRequestStatus, promoted: boolean): string {
  if (promoted) {
    return "근거 확인 후 안건 후보로 승격했습니다.";
  }

  const messages: Record<EvidenceRequestStatus, string> = {
    REQUESTED: "확인 대기로 저장했습니다.",
    COLLECTING: "수집 중으로 저장했습니다.",
    VERIFIED: "근거 충분으로 저장했습니다.",
    INSUFFICIENT: "근거 부족으로 저장했습니다.",
  };

  return messages[status];
}
