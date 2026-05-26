"use client";

import Link from "next/link";
import { useState } from "react";
import type { SearchAdActionPreview, SearchAdRequestedAction, SearchAdRuleActionTarget } from "@/features/search-ad/domain/types";
import { formatWon } from "./SearchAdCards";

type ActionPreviewResponse = {
  ok?: boolean;
  data?: SearchAdActionPreview;
  message?: string;
};

export function RuleResultActionPanel({ actionTarget }: { actionTarget?: SearchAdRuleActionTarget }) {
  const [preview, setPreview] = useState<SearchAdActionPreview | undefined>();
  const [message, setMessage] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(false);

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
      setMessage("실행 이력에 미리보기를 저장했습니다.");
    } catch (error) {
      setPreview(undefined);
      setMessage(error instanceof Error ? error.message : "실행 미리보기 요청에 실패했습니다.");
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
        <p>대표 승인 전에는 여기서 바로 외부 광고를 변경하지 않고, 실행 이력에 미리보기만 남깁니다.</p>
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

      {message ? <p className="state-message" aria-live="polite">{message}</p> : null}

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
        </article>
      ) : null}
    </section>
  );
}
