"use client";

import Link from "next/link";
import { useState } from "react";
import type { SearchAdActionLog, SearchAdActionPreview, SearchAdRequestedAction, SearchAdRuleActionTarget } from "@/features/search-ad/domain/types";
import { formatWon } from "./SearchAdCards";

type ActionPreviewResponse = {
  ok?: boolean;
  data?: SearchAdActionPreview;
  message?: string;
};

type ActionApplyResponse = {
  ok?: boolean;
  data?: SearchAdActionLog;
  message?: string;
};

export function RuleResultActionPanel({ actionTarget }: { actionTarget?: SearchAdRuleActionTarget }) {
  const [appliedLog, setAppliedLog] = useState<SearchAdActionLog | undefined>();
  const [preview, setPreview] = useState<SearchAdActionPreview | undefined>();
  const [message, setMessage] = useState<{ kind: "success" | "warning" | "error"; text: string } | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (!actionTarget) {
    return (
      <section className="content-panel">
        <div className="section-heading">
          <h2>실행 미리보기</h2>
          <p>이 규칙 결과에는 아직 캠페인이나 광고그룹 실행 대상이 연결되지 않았습니다.</p>
        </div>
      </section>
    );
  }

  async function requestPreview(requestedAction: SearchAdRequestedAction) {
    if (!actionTarget) {
      return;
    }

    setIsLoading(true);
    setAppliedLog(undefined);
    setConfirmOpen(false);
    setMessage(undefined);
    try {
      const response = await fetch("/api/search-ad/action-preview", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          targetType: actionTarget.targetType,
          targetId: actionTarget.targetId,
          requestedAction,
        }),
      });
      const payload = (await response.json()) as ActionPreviewResponse;
      if (!response.ok || payload.ok !== true || !payload.data) {
        throw new Error(payload.message ?? "실행 미리보기를 만들지 못했습니다.");
      }

      setPreview(payload.data);
      setMessage({ kind: "success", text: "실행 이력에 미리보기를 저장했습니다." });
    } catch (error) {
      setPreview(undefined);
      setMessage({ kind: "error", text: error instanceof Error ? error.message : "실행 미리보기 요청에 실패했습니다." });
    } finally {
      setIsLoading(false);
    }
  }

  async function applyPreview() {
    if (!preview) {
      return;
    }

    setIsLoading(true);
    setConfirmOpen(false);
    setMessage(undefined);
    try {
      const response = await fetch("/api/search-ad/action-apply", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ previewId: preview.id }),
      });
      const payload = (await response.json()) as ActionApplyResponse;
      if (payload.ok !== true || !payload.data) {
        throw new Error(payload.message ?? "실행 요청을 처리하지 못했습니다.");
      }

      setAppliedLog(payload.data);
      setMessage({
        kind: payload.data.status === "applied" ? "success" : payload.data.status === "blocked" ? "warning" : "error",
        text: payload.data.reason,
      });
    } catch (error) {
      setAppliedLog(undefined);
      setMessage({ kind: "error", text: error instanceof Error ? error.message : "실행 요청에 실패했습니다." });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="content-panel">
      <div className="section-heading">
        <div>
          <h2>실행 미리보기</h2>
          <p>실제 변경 전, 연결된 광고그룹 또는 캠페인의 예상 영향을 먼저 저장합니다.</p>
        </div>
      </div>
      <div className="action-target-card">
        <span>{actionTarget.targetType === "adgroup" ? "광고그룹" : "캠페인"}</span>
        <strong>{actionTarget.targetLabel}</strong>
        <p>미리보기로 영향을 저장한 뒤 실행 요청을 남깁니다. 실제 변경 권한이 닫혀 있으면 네이버에는 반영하지 않고 차단 이력만 남깁니다.</p>
        <div className="action-button-row">
          <button className="primary-button secondary-button" disabled={isLoading} onClick={() => requestPreview("turn_off")} type="button">
            끄기 미리보기
          </button>
          <button className="primary-button" disabled={isLoading} onClick={() => requestPreview("turn_on")} type="button">
            켜기 미리보기
          </button>
          <Link className="primary-button secondary-button" href="/action-logs">
            실행 이력 보기
          </Link>
        </div>
      </div>

      {message ? <p className={`state-message is-${message.kind}`} aria-live="polite">{message.text}</p> : null}

      {preview ? (
        <article className="rule-card action-preview-card">
          <div>
            <span className={`severity ${preview.writeGateOpen ? "severity-low" : "severity-medium"}`}>{preview.writeGateOpen ? "실행 가능" : "실제 변경 차단"}</span>
            <strong>{preview.targetLabel}</strong>
          </div>
          <p>{preview.impactSummary.expectedEffect}</p>
          <dl>
            <div>
              <dt>요청</dt>
              <dd>{preview.requestedAction === "turn_on" ? "켜기" : "끄기"}</dd>
            </div>
            <div>
              <dt>최근 비용</dt>
              <dd>{formatWon(preview.impactSummary.recentCost)}</dd>
            </div>
            <div>
              <dt>최근 클릭</dt>
              <dd>{preview.impactSummary.recentClicks.toLocaleString("ko-KR")}회</dd>
            </div>
            <div>
              <dt>최근 전환</dt>
              <dd>{preview.impactSummary.recentConversions.toLocaleString("ko-KR")}건</dd>
            </div>
          </dl>
          <div className="action-apply-row">
            <button className="primary-button" disabled={isLoading || !!appliedLog} onClick={() => setConfirmOpen(true)} type="button">
              {preview.writeGateOpen ? "대표 승인 확인" : "차단 이력 확인"}
            </button>
            <span>{preview.writeGateOpen ? "실제 변경 권한이 열려 있어 네이버 반영까지 진행됩니다." : "현재는 실제 변경 권한이 닫혀 있어 안전하게 차단됩니다."}</span>
          </div>
          {confirmOpen ? (
            <div className="confirm-box" role="group" aria-label="실행 최종 확인">
              <strong>{preview.writeGateOpen ? "실제 네이버 광고 상태를 변경합니다." : "실제 변경 없이 차단 이력만 남깁니다."}</strong>
              <p>
                {preview.targetLabel} {preview.requestedAction === "turn_on" ? "켜기" : "끄기"} 요청입니다. 실행 후에는 실행 이력에 남습니다.
              </p>
              <div className="confirm-actions">
                <button className="primary-button" disabled={isLoading || !!appliedLog} onClick={applyPreview} type="button">
                  최종 실행
                </button>
                <button className="primary-button secondary-button" disabled={isLoading} onClick={() => setConfirmOpen(false)} type="button">
                  취소
                </button>
              </div>
            </div>
          ) : null}
          {appliedLog ? (
            <div className="execution-result">
              <span className={`severity severity-${appliedLog.status === "applied" ? "low" : appliedLog.status === "blocked" ? "medium" : "high"}`}>
                {appliedLog.status === "applied" ? "반영" : appliedLog.status === "blocked" ? "차단" : "실패"}
              </span>
              <strong>{appliedLog.actionLabel}</strong>
              <p>{appliedLog.reason}</p>
            </div>
          ) : null}
        </article>
      ) : null}
    </section>
  );
}
