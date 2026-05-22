"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import type { OwnerDecisionType } from "@/lib/domain";

type OwnerDecisionSubmitPanelProps = {
  approvalId: string;
  disabledReason?: string;
};

type SubmitState =
  | { status: "idle"; message: string; detail?: string }
  | { status: "submitting"; message: string; detail?: string }
  | { status: "success"; message: string; detail?: string }
  | { status: "warning"; message: string; detail?: string }
  | { status: "error"; message: string; detail?: string };

type DecisionResponse = {
  result?: {
    executionResult?: { state?: string; failedOperations?: Array<{ reason?: string }> };
    preflightCheck?: { status?: string; blockingReasons?: string[]; warnings?: string[] };
    outcomeReport?: { state?: string; summary?: string };
    updatedApprovalRequest?: { status?: string };
  };
  error?: {
    code?: string;
    message?: string;
  };
};

const decisionActions: Array<{
  type: OwnerDecisionType;
  label: string;
  primary?: boolean;
}> = [
  { type: "APPROVE_AND_APPLY", label: "승인 후 바로 반영", primary: true },
  { type: "APPROVE_DRAFT_ONLY", label: "초안만 승인" },
  { type: "REQUEST_REVISION", label: "수정 요청" },
  { type: "REQUEST_MORE_EVIDENCE", label: "추가 근거 요청" },
  { type: "HOLD", label: "보류" },
  { type: "REJECT", label: "반려" },
];

export function OwnerDecisionSubmitPanel({ approvalId, disabledReason }: OwnerDecisionSubmitPanelProps) {
  const [memo, setMemo] = useState("");
  const [submitState, setSubmitState] = useState<SubmitState>({
    status: "idle",
    message: "대표 결정을 선택하면 실행 전 점검과 외부 반영 잠금 결과가 바로 표시됩니다.",
  });

  async function submitDecision(decision: OwnerDecisionType) {
    if (decision === "APPROVE_AND_APPLY" && disabledReason) {
      setSubmitState({
        status: "warning",
        message: "즉시 반영이 차단되어 있습니다.",
        detail: disabledReason,
      });
      return;
    }

    setSubmitState({ status: "submitting", message: "대표 결정을 기록하고 실행 전 점검을 확인하는 중입니다." });

    try {
      const response = await fetch(`/api/approvals/${approvalId}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision,
          memo: memo.trim(),
          secondConfirmation: false,
        }),
      });
      const payload = (await response.json()) as DecisionResponse;

      setSubmitState(buildSubmitState(response.status, payload));
    } catch (error) {
      setSubmitState({
        status: "error",
        message: "대표 결정을 전송하지 못했습니다.",
        detail: error instanceof Error ? error.message : "알 수 없는 오류",
      });
    }
  }

  return (
    <section className="owner-submit-section" id="owner-decision-submit" aria-labelledby="owner-submit-title">
      <div className="owner-submit-card">
        <header>
          <div>
            <span className="eyebrow">대표 결정 입력</span>
            <h2 id="owner-submit-title">자료 확인 후 결재 처리</h2>
          </div>
          <span className="status-pill">
            <ShieldCheck size={14} aria-hidden="true" />
            API 연결됨
          </span>
        </header>
        <label className="memo-field">
          <span>결정 메모</span>
          <textarea
            value={memo}
            onChange={(event) => setMemo(event.target.value)}
            placeholder="예: 소액 테스트는 승인하되 실제 외부 반영은 잠금 확인 후 진행"
            rows={3}
          />
        </label>
        <div className="owner-action-grid">
          {decisionActions.map((action) => (
            <button
              className={action.primary ? "primary-button" : "secondary-button"}
              disabled={submitState.status === "submitting" || (action.type === "APPROVE_AND_APPLY" && Boolean(disabledReason))}
              key={action.type}
              onClick={() => void submitDecision(action.type)}
              type="button"
            >
              {submitState.status === "submitting" && action.primary ? <Loader2 size={16} aria-hidden="true" /> : null}
              {action.label}
            </button>
          ))}
        </div>
        {disabledReason ? <p className="owner-submit-disabled">{disabledReason}</p> : null}
        <SubmitNotice state={submitState} />
      </div>
    </section>
  );
}

function SubmitNotice({ state }: { state: SubmitState }) {
  const Icon = state.status === "error" || state.status === "warning" ? AlertTriangle : CheckCircle2;

  return (
    <div className={`submit-notice submit-${state.status}`} role="status">
      <Icon size={17} aria-hidden="true" />
      <div>
        <strong>{state.message}</strong>
        {state.detail ? <p>{state.detail}</p> : null}
      </div>
    </div>
  );
}

function buildSubmitState(status: number, payload: DecisionResponse): SubmitState {
  if (payload.error) {
    return {
      status: "error",
      message: payload.error.message ?? "대표 결정 처리 중 오류가 발생했습니다.",
      detail: payload.error.code,
    };
  }

  const result = payload.result;
  if (status === 423) {
    return {
      status: "warning",
      message: "결재는 기록됐지만 외부 반영은 차단됐습니다.",
      detail: result?.executionResult?.failedOperations?.[0]?.reason ?? "외부 반영 잠금",
    };
  }

  if (status === 409) {
    return {
      status: "warning",
      message: "실행 전 점검을 통과하지 못했습니다.",
      detail: result?.preflightCheck?.blockingReasons?.join(", ") ?? "실행 전 점검 차단",
    };
  }

  return {
    status: "success",
    message: "대표 결정이 기록됐습니다.",
    detail: result?.outcomeReport?.summary ?? result?.updatedApprovalRequest?.status,
  };
}
