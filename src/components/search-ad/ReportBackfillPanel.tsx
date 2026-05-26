"use client";

import { useMemo, useRef, useState } from "react";
import { getReportTypeLabel } from "@/features/search-ad/domain/reportTypes";
import { ALL_SEARCH_AD_REPORT_TYPES, SEARCH_AD_MAX_REPORT_RETENTION_DAYS } from "@/features/search-ad/domain/reportRetention";
import type { SearchAdReportType } from "@/features/search-ad/domain/types";
import type { SearchAdBackfillResultStatus, SearchAdBackfillSummary } from "@/server/search-ad/reportBackfill";

type BackfillMode = "preview" | "recover-all";

type BackfillFormState = {
  fromDate: string;
  reportTypes: SearchAdReportType[];
  toDate: string;
};

type BackfillRequestInput = BackfillFormState & {
  mode: BackfillMode;
};

type BackfillResult = {
  downloadUrl?: string;
  message?: string;
  providerReportJobId?: string;
  providerStatus?: string;
  reportType: SearchAdReportType;
  statDate: string;
  status: SearchAdBackfillResultStatus;
};

type BackfillResponse =
  | {
      data: {
        plan: {
          fromDate: string;
          toDate: string;
          totalItems: number;
          truncatedDates: number;
        };
        results: BackfillResult[];
        summary: SearchAdBackfillSummary;
      };
      ok: true;
    }
  | {
      code?: string;
      message?: string;
      ok: false;
    };

const FAST_BACKFILL_MAX_DATES = 92;
const FAST_BACKFILL_MAX_CREATES = 120;
const FAST_BACKFILL_MAX_DOWNLOADS = 60;
const DAY_MS = 24 * 60 * 60 * 1000;

export const BACKFILL_REPORT_TYPE_OPTIONS: Array<{ label: string; value: SearchAdReportType }> = ALL_SEARCH_AD_REPORT_TYPES.map((value) => ({
  label: getReportTypeLabel(value),
  value,
}));

const STATUS_LABELS: Record<SearchAdBackfillResultStatus, string> = {
  created: "생성 요청",
  download_skipped: "이번 배치 제외",
  downloadable: "저장 가능",
  downloaded: "저장 완료",
  failed: "실패",
  missing: "생성 필요",
  pending: "준비 중",
};

export function buildBackfillRequestBody(input: BackfillRequestInput) {
  const limits = getQuickBackfillLimits(input);
  return {
    createMissing: input.mode === "recover-all" ? true : undefined,
    dryRun: input.mode === "preview",
    fromDate: input.fromDate,
    maxCreates: limits.maxCreates,
    maxDates: limits.maxDates,
    maxDownloads: limits.maxDownloads,
    reportTypes: input.reportTypes,
    skipSaved: true,
    toDate: input.toDate,
  };
}

export function getQuickBackfillLimits(input: { fromDate: string; reportTypes: SearchAdReportType[]; toDate: string }) {
  const selectedDates = countBackfillDates(input.fromDate, input.toDate);
  const maxDates = selectedDates > 0 ? Math.min(selectedDates, FAST_BACKFILL_MAX_DATES) : 1;
  const batchItems = Math.max(1, maxDates * Math.max(1, input.reportTypes.length));
  return {
    batchItems,
    maxCreates: Math.min(batchItems, FAST_BACKFILL_MAX_CREATES),
    maxDates,
    maxDownloads: Math.min(batchItems, FAST_BACKFILL_MAX_DOWNLOADS),
    selectedDates,
    truncatedDates: Math.max(0, selectedDates - maxDates),
  };
}

export function getBackfillStatusLabel(status: SearchAdBackfillResultStatus) {
  return STATUS_LABELS[status];
}

export function ReportBackfillPanel() {
  const [form] = useState<BackfillFormState>(() => createFullBackfillFormState());
  const [loadingMode, setLoadingMode] = useState<BackfillMode | null>(null);
  const [response, setResponse] = useState<BackfillResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const requestSequence = useRef(0);
  const quickLimits = useMemo(() => getQuickBackfillLimits(form), [form]);
  const visibleResults = useMemo(() => (response?.ok ? response.data.results.slice(0, 240) : []), [response]);

  async function runBackfill(mode: BackfillMode) {
    const requestId = requestSequence.current + 1;
    requestSequence.current = requestId;
    setLoadingMode(mode);
    setError(null);
    try {
      const result = await fetch("/api/search-ad/reports/backfill", {
        body: JSON.stringify(buildBackfillRequestBody({ ...form, mode })),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      const json = (await result.json()) as BackfillResponse;
      if (requestId !== requestSequence.current) {
        return;
      }
      setResponse(json);
      if (!json.ok) {
        setError(json.message || "보고서 복구 상태를 확인하지 못했습니다.");
      }
    } catch {
      if (requestId !== requestSequence.current) {
        return;
      }
      setError("보고서 복구 API 응답을 받지 못했습니다.");
    } finally {
      if (requestId === requestSequence.current) {
        setLoadingMode(null);
      }
    }
  }

  return (
    <div className="page-stack">
      <section className="content-panel">
        <div className="section-heading">
          <div>
            <h2>전체 보고서 복구</h2>
            <p>오늘 기준 받을 수 있는 가장 과거부터 전일까지, 전체 보고서 {form.reportTypes.length.toLocaleString("ko-KR")}종을 저장합니다. 이미 저장된 보고서는 건너뜁니다.</p>
          </div>
        </div>
        <div className="backfill-range-card" aria-label="전체 복구 범위">
          <div>
            <span>복구 범위</span>
            <strong>
              {form.fromDate}부터 {form.toDate}까지
            </strong>
            <p>보고서별 보관기간이 달라서 상세/전환 보고서는 가능한 날짜만 자동 포함됩니다.</p>
          </div>
          <div>
            <span>저장 방식</span>
            <strong>남은 보고서만 이어받기</strong>
            <p>한 번 누를 때마다 다음 남은 구간을 처리하고, 네이버가 아직 준비 중인 보고서는 다음 실행에서 다시 확인합니다.</p>
          </div>
        </div>
        <div className="backfill-fast-row">
          <div>
            <strong>이번 실행: 최대 {quickLimits.maxDates.toLocaleString("ko-KR")}일 구간 처리</strong>
            <p>
              준비 완료 보고서는 최대 {quickLimits.maxDownloads.toLocaleString("ko-KR")}건 저장하고, 누락 보고서는 최대 {quickLimits.maxCreates.toLocaleString("ko-KR")}건 생성 요청합니다.
              {quickLimits.truncatedDates > 0 ? ` 전체 기간은 길어서 다음 실행으로 이어받습니다.` : ""}
            </p>
          </div>
          <button className="primary-button" disabled={Boolean(loadingMode) || quickLimits.selectedDates === 0} onClick={() => runBackfill("recover-all")} type="button">
            {loadingMode === "recover-all" ? "저장 중" : "전체 저장 / 이어받기"}
          </button>
        </div>
        <div className="backfill-actions">
          <button className="button secondary-button" disabled={Boolean(loadingMode) || quickLimits.selectedDates === 0} onClick={() => runBackfill("preview")} type="button">
            {loadingMode === "preview" ? "확인 중" : "남은 보고서 확인"}
          </button>
        </div>
        {error ? <p className="state-message is-error">{error}</p> : null}
        {response?.ok ? <p className="state-message is-success">{getBackfillNextStep(response.data.summary)}</p> : null}
      </section>

      {response?.ok ? (
        <>
          <BackfillSummaryCards summary={response.data.summary} />
          <section className="content-panel">
            <div className="section-heading">
              <div>
                <h2>보고서 상태</h2>
                <p>
                  {response.data.plan.fromDate}부터 {response.data.plan.toDate}까지 남은 {response.data.plan.totalItems.toLocaleString("ko-KR")}건을 확인했습니다.
                </p>
              </div>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>기준일</th>
                    <th>보고서</th>
                    <th>상태</th>
                    <th>네이버 ID</th>
                    <th>비고</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleResults.map((item) => (
                    <tr key={`${item.reportType}-${item.statDate}-${item.providerReportJobId ?? item.status}`}>
                      <td>{item.statDate}</td>
                      <td>{getReportTypeLabel(item.reportType)}</td>
                      <td>{getBackfillStatusLabel(item.status)}</td>
                      <td>{item.providerReportJobId ?? "-"}</td>
                      <td>{item.message ?? getProviderStatusLabel(item.providerStatus) ?? "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {response.data.results.length > visibleResults.length ? <p className="empty-text">표시는 최근 {visibleResults.length.toLocaleString("ko-KR")}건까지만 보여줍니다.</p> : null}
          </section>
        </>
      ) : null}
    </div>
  );
}

function BackfillSummaryCards({ summary }: { summary: SearchAdBackfillSummary }) {
  const cards = [
    { helper: "이번 실행 대상", label: "남은 보고서", value: summary.planned },
    { helper: "다시 받지 않음", label: "이미 저장", value: summary.alreadySaved },
    { helper: "네이버 생성 요청 필요", label: "생성 필요", value: summary.missing },
    { helper: "네이버 준비 완료", label: "저장 가능", value: summary.downloadable },
    { helper: "아직 생성 중", label: "준비 중", value: summary.pending },
    { helper: "이번 실행 결과", label: "저장 완료", value: summary.downloaded },
    { helper: "확인 필요", label: "실패", value: summary.failed },
  ];

  return (
    <section className="summary-grid compact" aria-label="보고서 복구 요약">
      {cards.map((card) => (
        <article className="summary-card" key={card.label}>
          <span>{card.label}</span>
          <strong>{card.value.toLocaleString("ko-KR")}</strong>
          <p>{card.helper}</p>
        </article>
      ))}
    </section>
  );
}

function getProviderStatusLabel(status?: string) {
  if (!status) {
    return undefined;
  }

  const labels: Record<string, string> = {
    AGGREGATING: "집계 중",
    BUILT: "네이버 준비 완료",
    ERROR: "네이버 생성 실패",
    NONE: "대기",
    REGIST: "등록됨",
    RUNNING: "생성 중",
    WAITING: "대기 중",
  };
  return labels[status] ?? status;
}

function getBackfillNextStep(summary: SearchAdBackfillSummary) {
  if (summary.planned === 0 && summary.alreadySaved > 0) {
    return "선택 가능한 전체 범위의 보고서가 이미 저장되어 있습니다.";
  }
  if (summary.created > 0 && summary.downloaded > 0) {
    return "저장 가능한 보고서는 저장했고, 새로 요청한 보고서는 네이버 준비가 끝난 뒤 다시 전체 저장 / 이어받기로 저장합니다.";
  }
  if (summary.created > 0) {
    return "누락 보고서 생성을 요청했습니다. 네이버 준비가 끝난 뒤 다시 전체 저장 / 이어받기를 누르면 저장됩니다.";
  }
  if (summary.downloaded > 0) {
    return "준비 완료된 보고서를 저장했습니다. 남은 준비 중 보고서는 잠시 뒤 다시 확인하세요.";
  }
  if (summary.downloadable > 0) {
    return "저장 가능한 보고서가 있습니다. 전체 저장 / 이어받기를 누르면 DB에 저장됩니다.";
  }
  if (summary.missing > 0) {
    return "생성 필요한 보고서가 있습니다. 전체 저장 / 이어받기를 누르면 네이버에 생성 요청을 보냅니다.";
  }
  if (summary.pending > 0) {
    return "네이버가 보고서를 생성 중입니다. 잠시 뒤 계획을 다시 확인하세요.";
  }
  return "선택한 범위에서 추가로 처리할 보고서가 없습니다.";
}

export function createFullBackfillFormState(todayKst?: string): BackfillFormState {
  return {
    fromDate: todayKst ? getDateOffsetFromKstDate(todayKst, -SEARCH_AD_MAX_REPORT_RETENTION_DAYS) : getKstDateOffset(-SEARCH_AD_MAX_REPORT_RETENTION_DAYS),
    reportTypes: ALL_SEARCH_AD_REPORT_TYPES,
    toDate: todayKst ? getDateOffsetFromKstDate(todayKst, -1) : getKstDateOffset(-1),
  };
}

function countBackfillDates(fromDate: string, toDate: string) {
  const from = parseDateOnly(fromDate);
  const to = parseDateOnly(toDate);
  if (!from || !to || from > to) {
    return 0;
  }
  return Math.floor((to.getTime() - from.getTime()) / DAY_MS) + 1;
}

function parseDateOnly(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return null;
  }
  return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
}

function getKstDateOffset(offsetDays: number) {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  kst.setUTCDate(kst.getUTCDate() + offsetDays);
  return kst.toISOString().slice(0, 10);
}

function getDateOffsetFromKstDate(todayKst: string, offsetDays: number) {
  const date = parseDateOnly(todayKst);
  if (!date) {
    return todayKst;
  }
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return date.toISOString().slice(0, 10);
}
