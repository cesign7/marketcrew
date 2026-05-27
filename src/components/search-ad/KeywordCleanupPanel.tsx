"use client";

import Link from "next/link";
import { useState } from "react";
import { getAdProductLabel, getBrandLabel } from "@/features/search-ad/domain/reportTypes";
import type {
  SearchAdActionLog,
  SearchAdActionPreview,
  SearchAdDuplicateKeywordGroup,
  SearchAdKeywordCleanupCandidate,
  SearchAdKeywordCleanupRecommendation,
  SearchAdKeywordCleanupView,
} from "@/features/search-ad/domain/types";

type ApiPayload<T> = {
  ok?: boolean;
  data?: T;
  message?: string;
};

export function KeywordCleanupDashboard({ view }: { view: SearchAdKeywordCleanupView }) {
  return (
    <section className="page-stack">
      <section className="summary-grid" aria-label="키워드 정리 요약">
        {view.summaryCards.map((card) => (
          <article className="summary-card" key={card.key}>
            <span>{card.label}</span>
            <strong>{card.value}</strong>
            <p>{card.helper}</p>
          </article>
        ))}
      </section>

      <section className="content-panel">
        <div className="section-heading">
          <h2>운영 원칙</h2>
          <p>실제 삭제는 아직 열지 않고, 끄기/삭제 후보를 먼저 검토합니다.</p>
        </div>
        <div className="metric-pill-row">
          <span className="metric-pill">
            <span>같은 광고그룹 중복</span>
            <strong>삭제 우선 검토</strong>
          </span>
          <span className="metric-pill">
            <span>다른 광고그룹 중복</span>
            <strong>랜딩/시즌 목적 확인</strong>
          </span>
          <span className="metric-pill">
            <span>1년 클릭 없음</span>
            <strong>백필 완료 후 강한 근거</strong>
          </span>
          <span className="metric-pill">
            <span>실제 반영</span>
            <strong>대표 승인 전 차단</strong>
          </span>
        </div>
      </section>

      <section className="content-panel">
        <div className="section-heading">
          <h2>중복 키워드</h2>
          <p>브랜드와 광고유형 안에서 같은 키워드가 여러 운영 위치에 들어간 경우입니다.</p>
        </div>
        <DuplicateKeywordGroups groups={view.duplicateGroups} />
      </section>

      <section className="content-panel">
        <div className="section-heading">
          <h2>클릭 없는 키워드</h2>
          <p>저장된 최근 성과 범위에서 클릭이 없는 키워드입니다. 신규/시즌 키워드는 바로 삭제하지 않습니다.</p>
        </div>
        <KeywordCleanupTable candidates={view.noClickCandidates} />
      </section>

      <section className="content-panel">
        <div className="section-heading">
          <h2>성과 데이터 범위</h2>
          <p>백필이 완료되면 최근 1년 기준에 더 가까워집니다.</p>
        </div>
        <div className="metric-pill-row">
          {view.coverageSummaries.map((coverage) => (
            <span className="metric-pill" key={`${coverage.brandKey}-${coverage.adProductType}`}>
              <span>
                {getBrandLabel(coverage.brandKey)} · {getAdProductLabel(coverage.adProductType)}
              </span>
              <strong>{coverage.label}</strong>
            </span>
          ))}
          {view.coverageSummaries.length === 0 ? <p className="empty-text">아직 저장된 성과 데이터가 없습니다.</p> : null}
        </div>
      </section>
    </section>
  );
}

function DuplicateKeywordGroups({ groups }: { groups: SearchAdDuplicateKeywordGroup[] }) {
  if (groups.length === 0) {
    return <p className="empty-text">현재 조건에서 중복 키워드가 없습니다.</p>;
  }

  return (
    <div className="card-list">
      {groups.map((group) => (
        <article className="rule-card" key={group.id}>
          <div className="rule-card-header">
            <div className="rule-card-title-group">
              <div className="rule-card-kicker">
                <span className="severity severity-medium">중복 {group.duplicateCount.toLocaleString("ko-KR")}개</span>
                <span className="target-chip">{getBrandLabel(group.brandKey)}</span>
                <span className="target-chip">{getAdProductLabel(group.adProductType)}</span>
              </div>
              <strong className="rule-card-title">{group.keywordText}</strong>
            </div>
          </div>
          <p className="rule-card-diagnosis">{group.recommendationSummary}</p>
          <div className="metric-pill-row" aria-label="중복 묶음 성과">
            <span className="metric-pill">
              <span>켜진 키워드</span>
              <strong>{group.activeCount.toLocaleString("ko-KR")}개</strong>
            </span>
            <span className="metric-pill">
              <span>최근 클릭</span>
              <strong>{group.totalClicks365.toLocaleString("ko-KR")}회</strong>
            </span>
            <span className="metric-pill">
              <span>최근 비용</span>
              <strong>{formatWon(group.totalCost365)}</strong>
            </span>
          </div>
          <KeywordCleanupTable candidates={group.candidates} />
        </article>
      ))}
    </div>
  );
}

function KeywordCleanupTable({ candidates }: { candidates: SearchAdKeywordCleanupCandidate[] }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>조치</th>
            <th>키워드</th>
            <th>브랜드</th>
            <th>광고유형</th>
            <th>연결 위치</th>
            <th>상태</th>
            <th>노출</th>
            <th>클릭</th>
            <th>비용</th>
            <th>전환</th>
            <th>근거</th>
            <th>실행</th>
          </tr>
        </thead>
        <tbody>
          {candidates.map((candidate) => (
            <tr key={candidate.keywordId}>
              <td>
                <span className={`severity ${recommendationSeverityClass(candidate.recommendation)}`}>{candidate.recommendationLabel}</span>
              </td>
              <td>
                <span className="text-clip" title={candidate.keywordText}>
                  {candidate.keywordText}
                </span>
              </td>
              <td>{getBrandLabel(candidate.brandKey)}</td>
              <td>{getAdProductLabel(candidate.adProductType)}</td>
              <td>
                <span className="text-clip" title={getLocationLabel(candidate)}>
                  {getLocationLabel(candidate)}
                </span>
              </td>
              <td>{formatLockState(candidate.userLock)}</td>
              <td>{candidate.impressions365.toLocaleString("ko-KR")}회</td>
              <td>{candidate.clicks365.toLocaleString("ko-KR")}회</td>
              <td>{formatWon(candidate.cost365)}</td>
              <td>{candidate.conversions365.toLocaleString("ko-KR")}건</td>
              <td>{candidate.reason}</td>
              <td>
                <KeywordCandidateActionCell candidate={candidate} />
              </td>
            </tr>
          ))}
          {candidates.length === 0 ? (
            <tr>
              <td colSpan={12}>해당 조건의 키워드 후보가 없습니다.</td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

function KeywordCandidateActionCell({ candidate }: { candidate: SearchAdKeywordCleanupCandidate }) {
  const [isLoading, setIsLoading] = useState(false);
  const [preview, setPreview] = useState<SearchAdActionPreview | undefined>();
  const [log, setLog] = useState<SearchAdActionLog | undefined>();
  const [message, setMessage] = useState<{ kind: "success" | "warning" | "error"; text: string } | undefined>();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const canRequestAction = candidate.userLock !== true && (candidate.recommendation === "pause_candidate" || candidate.recommendation === "delete_candidate");

  if (!canRequestAction) {
    return <span className="keyword-action-note">{candidate.userLock === true ? "이미 꺼짐" : "처리 없음"}</span>;
  }

  async function requestPreview() {
    setIsLoading(true);
    setLog(undefined);
    setConfirmOpen(false);
    setMessage(undefined);
    try {
      const nextPreview = await postJson<SearchAdActionPreview>("/api/search-ad/action-preview", {
        requestedAction: "turn_off",
        targetId: candidate.keywordId,
        targetType: "keyword",
      });
      setPreview(nextPreview);
      setMessage({ kind: "success", text: "대표 승인 전 미리보기를 저장했습니다." });
    } catch (error) {
      setPreview(undefined);
      setMessage({ kind: "error", text: error instanceof Error ? error.message : "미리보기를 만들지 못했습니다." });
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
      const nextLog = await postJson<SearchAdActionLog>("/api/search-ad/action-apply", {
        previewId: preview.id,
      });
      setLog(nextLog);
      setMessage({
        kind: nextLog.status === "applied" ? "success" : nextLog.status === "blocked" ? "warning" : "error",
        text: nextLog.reason,
      });
    } catch (error) {
      setLog(undefined);
      setMessage({ kind: "error", text: error instanceof Error ? error.message : "실행 요청에 실패했습니다." });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="keyword-action-cell">
      <button className="primary-button secondary-button" disabled={isLoading} onClick={requestPreview} type="button">
        {isLoading && !preview ? "준비 중" : "끄기 미리보기"}
      </button>
      {candidate.recommendation === "delete_candidate" ? <span className="keyword-action-note">삭제 후보도 1차는 끄기로 처리합니다.</span> : null}
      {preview ? (
        <div className="keyword-preview-mini">
          <span className={`severity ${preview.writeGateOpen ? "severity-low" : "severity-medium"}`}>{preview.writeGateOpen ? "실행 가능" : "실제 변경 차단"}</span>
          <strong>{preview.targetLabel}</strong>
          <div className="keyword-preview-metrics" aria-label="미리보기 영향">
            <span>비용 {formatWon(preview.impactSummary.recentCost)}</span>
            <span>클릭 {preview.impactSummary.recentClicks.toLocaleString("ko-KR")}회</span>
            <span>전환 {preview.impactSummary.recentConversions.toLocaleString("ko-KR")}건</span>
          </div>
          <button className="primary-button" disabled={isLoading || !!log} onClick={() => setConfirmOpen(true)} type="button">
            {preview.writeGateOpen ? "대표 승인 확인" : "차단 이력 확인"}
          </button>
          <Link className="text-link" href="/action-logs">
            실행 로그
          </Link>
          {confirmOpen ? (
            <div className="confirm-box" role="group" aria-label="키워드 실행 최종 확인">
              <strong>{preview.writeGateOpen ? "실제 네이버 키워드를 끕니다." : "실제 변경 없이 차단 이력만 남깁니다."}</strong>
              <p>{preview.targetLabel} 키워드에 대한 요청입니다. 삭제 후보도 지금은 삭제하지 않고 끄기만 처리합니다.</p>
              <div className="confirm-actions">
                <button className="primary-button" disabled={isLoading || !!log} onClick={applyPreview} type="button">
                  최종 실행
                </button>
                <button className="primary-button secondary-button" disabled={isLoading} onClick={() => setConfirmOpen(false)} type="button">
                  취소
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
      {message ? <span className={`state-message is-${message.kind}`}>{message.text}</span> : null}
    </div>
  );
}

function getLocationLabel(candidate: SearchAdKeywordCleanupCandidate) {
  const campaign = candidate.campaignName ?? "캠페인 확인 필요";
  const adgroup = candidate.adgroupName ?? "광고그룹 확인 필요";
  return `${campaign} · ${adgroup}`;
}

function recommendationSeverityClass(recommendation: SearchAdKeywordCleanupRecommendation) {
  if (recommendation === "delete_candidate") {
    return "severity-high";
  }
  if (recommendation === "pause_candidate") {
    return "severity-medium";
  }
  return "severity-low";
}

function formatLockState(value: boolean | null) {
  if (value === true) {
    return "꺼짐";
  }
  if (value === false) {
    return "켜짐";
  }
  return "확인 필요";
}

function formatWon(value: number) {
  return `${Math.round(value).toLocaleString("ko-KR")}원`;
}

async function postJson<T>(url: string, body: Record<string, unknown>): Promise<T> {
  const response = await fetch(url, {
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
    method: "POST",
  });
  const payload = (await response.json().catch(() => ({}))) as ApiPayload<T>;

  if (payload.ok === true && payload.data) {
    return payload.data;
  }

  throw new Error(payload.message ?? (response.ok ? "요청을 처리하지 못했습니다." : `요청 실패: ${response.status}`));
}
