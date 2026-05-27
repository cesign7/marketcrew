"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { SEARCH_AD_BACKFILL_SAFETY_LIMITS } from "@/features/search-ad/domain/backfillSafety";
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

type BackfillJobStatus = "queued" | "running" | "waiting" | "completed" | "failed";

type BackfillJobRun = {
  completedAt?: string;
  createdAt: string;
  errorMessage?: string;
  id: string;
  resultJson?: Record<string, unknown>;
  status: BackfillJobStatus;
  updatedAt: string;
};

type BackfillJobResponse =
  | {
      data: {
        run: BackfillJobRun | null;
      };
      ok: true;
    }
  | {
      code?: string;
      message?: string;
      ok: false;
    };

const DAY_MS = 24 * 60 * 60 * 1000;
const ACTIVE_WAITING_JOB_MS = 90_000;

export const BACKFILL_REPORT_TYPE_OPTIONS: Array<{ label: string; value: SearchAdReportType }> = ALL_SEARCH_AD_REPORT_TYPES.map((value) => ({
  label: getReportTypeLabel(value),
  value,
}));

const STATUS_LABELS: Record<SearchAdBackfillResultStatus, string> = {
  created: "생성 요청",
  download_skipped: "다음 배치 대기",
  downloadable: "저장 가능",
  downloaded: "저장 완료",
  failed: "실패",
  missing: "생성 필요",
  no_data: "파일 없음",
  pending: "준비 중",
  rate_limited: "속도 제한",
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
    maxHourlyCreates: limits.maxHourlyCreates,
    rateLimitBackoffMs: limits.rateLimitBackoffMs,
    reportTypes: input.reportTypes,
    requestDelayMs: limits.requestDelayMs,
    skipSaved: true,
    toDate: input.toDate,
  };
}

export function buildBackgroundBackfillRequestBody(input: BackfillRequestInput) {
  return {
    ...buildBackfillRequestBody(input),
    background: true,
    createMissing: true,
    dryRun: false,
  };
}

export function getQuickBackfillLimits(input: { fromDate: string; reportTypes: SearchAdReportType[]; toDate: string }) {
  const selectedDates = countBackfillDates(input.fromDate, input.toDate);
  const maxDates = selectedDates > 0 ? selectedDates : 1;
  const batchItems = Math.max(1, maxDates * Math.max(1, input.reportTypes.length));
  return {
    batchItems,
    maxCreates: Math.min(batchItems, SEARCH_AD_BACKFILL_SAFETY_LIMITS.maxCreatesPerRun),
    maxDates,
    maxDownloads: Math.min(batchItems, SEARCH_AD_BACKFILL_SAFETY_LIMITS.maxDownloadsPerRun),
    maxHourlyCreates: SEARCH_AD_BACKFILL_SAFETY_LIMITS.maxCreatesPerHour,
    rateLimitBackoffMs: SEARCH_AD_BACKFILL_SAFETY_LIMITS.rateLimitBackoffMs,
    requestDelayMs: SEARCH_AD_BACKFILL_SAFETY_LIMITS.requestDelayMs,
    selectedDates,
    truncatedDates: Math.max(0, selectedDates - maxDates),
  };
}

export function getBackfillStatusLabel(status: SearchAdBackfillResultStatus, providerStatus?: string) {
  if (status === "no_data" || (status === "pending" && providerStatus === "NONE")) {
    return "파일 없음";
  }

  return STATUS_LABELS[status];
}

export function ReportBackfillPanel() {
  const [form] = useState<BackfillFormState>(() => createFullBackfillFormState());
  const [loadingMode, setLoadingMode] = useState<BackfillMode | null>(null);
  const [jobRun, setJobRun] = useState<BackfillJobRun | null>(null);
  const [response, setResponse] = useState<BackfillResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const requestSequence = useRef(0);
  const quickLimits = useMemo(() => getQuickBackfillLimits(form), [form]);
  const jobResponse = useMemo(() => getBackfillResponseFromRun(jobRun), [jobRun]);
  const displayResponse = jobResponse ?? response;
  const activeJob = jobRun && isActiveBackfillJob(jobRun);
  const visibleResults = useMemo(() => (displayResponse?.ok ? displayResponse.data.results.slice(0, 240) : []), [displayResponse]);

  useEffect(() => {
    let cancelled = false;

    async function loadLatestRun() {
      try {
        const result = await fetch("/api/search-ad/reports/backfill", { cache: "no-store" });
        const json = (await result.json()) as BackfillJobResponse;
        if (!cancelled && json.ok) {
          setJobRun(json.data.run);
        }
      } catch {
        // 최신 작업 확인은 보조 정보라서 화면 전체 오류로 올리지 않습니다.
      }
    }

    void loadLatestRun();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!jobRun || !isActiveBackfillJob(jobRun)) {
      return undefined;
    }

    let cancelled = false;
    const timer = window.setInterval(async () => {
      try {
        const result = await fetch(`/api/search-ad/reports/backfill?runId=${encodeURIComponent(jobRun.id)}`, { cache: "no-store" });
        const json = (await result.json()) as BackfillJobResponse;
        if (!cancelled && json.ok) {
          setJobRun(json.data.run);
        }
      } catch {
        if (!cancelled) {
          setError("진행상황을 잠시 확인하지 못했습니다. 서버 작업은 계속 진행될 수 있습니다.");
        }
      }
    }, 5_000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [jobRun?.id, jobRun?.status]);

  async function runBackfill(mode: BackfillMode) {
    const requestId = requestSequence.current + 1;
    requestSequence.current = requestId;
    setLoadingMode(mode);
    setError(null);
    try {
      if (mode === "recover-all") {
        const result = await fetch("/api/search-ad/reports/backfill", {
          body: JSON.stringify(buildBackgroundBackfillRequestBody({ ...form, mode })),
          headers: { "content-type": "application/json" },
          method: "POST",
        });
        const json = (await result.json()) as BackfillJobResponse;
        if (requestId !== requestSequence.current) {
          return;
        }
        if (!json.ok) {
          setError(json.message || "보고서 복구 작업을 시작하지 못했습니다.");
          return;
        }
        setJobRun(json.data.run);
        setResponse(null);
        return;
      }

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
            <strong>서버 자동 복구: 전체 기간을 긴 간격으로 이어받기</strong>
            <p>
              한 번 시작하면 남은 전체 기간을 계획하고, 요청 간 대기 시간을 길게 둔 채 준비 완료 보고서 저장과 누락 보고서 생성 요청을 이어갑니다.
            </p>
          </div>
          <button className="primary-button" disabled={Boolean(loadingMode) || Boolean(activeJob) || quickLimits.selectedDates === 0} onClick={() => runBackfill("recover-all")} type="button">
            {loadingMode === "recover-all" ? "작업 시작 중" : activeJob ? "서버에서 복구 중" : "전체 저장 / 이어받기"}
          </button>
        </div>
        <div className="backfill-safety-card" aria-label="네이버 API 안전 기준">
          <span>네이버 API 안전 기준</span>
          <strong>
            요청 사이 {formatSeconds(quickLimits.requestDelayMs)} 대기, 속도 제한 시 {formatMinutes(quickLimits.rateLimitBackoffMs)} 대기
          </strong>
          <p>{getBackfillSafetyDescription(quickLimits)}</p>
        </div>
        <div className="backfill-actions">
          <button className="button secondary-button" disabled={Boolean(loadingMode) || quickLimits.selectedDates === 0} onClick={() => runBackfill("preview")} type="button">
            {loadingMode === "preview" ? "확인 중" : "남은 보고서 확인"}
          </button>
        </div>
        {error ? <p className="state-message is-error">{error}</p> : null}
        {jobRun ? <p className={`state-message ${getBackfillJobMessageClass(jobRun)}`}>{getBackfillJobMessage(jobRun)}</p> : null}
        {displayResponse?.ok && !activeJob ? <p className="state-message is-success">{getBackfillNextStep(displayResponse.data.summary)}</p> : null}
      </section>

      {displayResponse?.ok ? (
        <>
          <BackfillSummaryCards summary={displayResponse.data.summary} />
          <section className="content-panel">
            <div className="section-heading">
              <div>
                <h2>보고서 상태</h2>
                <p>
                  {displayResponse.data.plan.fromDate}부터 {displayResponse.data.plan.toDate}까지 남은 {displayResponse.data.plan.totalItems.toLocaleString("ko-KR")}건을 확인했습니다.
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
                      <td>{getBackfillStatusLabel(item.status, item.providerStatus)}</td>
                      <td>{item.providerReportJobId ?? "-"}</td>
                      <td>{getBackfillResultMessage(item)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {displayResponse.data.results.length > visibleResults.length ? <p className="empty-text">표시는 최근 {visibleResults.length.toLocaleString("ko-KR")}건까지만 보여줍니다.</p> : null}
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
    { helper: "네이버에 생성 요청함", label: "생성 요청", value: summary.created },
    { helper: "네이버 생성 요청 필요", label: "생성 필요", value: summary.missing },
    { helper: "재요청 제외", label: "파일 없음", value: summary.noData ?? 0 },
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
    NONE: "네이버 파일 없음",
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
  if ((summary.noData ?? 0) > 0) {
    return "네이버가 파일 없음으로 응답한 보고서는 재요청하지 않고 제외했습니다.";
  }
  return "선택한 범위에서 추가로 처리할 보고서가 없습니다.";
}

function getBackfillResponseFromRun(run: BackfillJobRun | null): BackfillResponse | null {
  const result = run?.resultJson;
  if (!isBackfillResponse(result)) {
    return null;
  }

  return result;
}

function isBackfillResponse(value: unknown): value is BackfillResponse {
  if (!value || typeof value !== "object" || !("ok" in value)) {
    return false;
  }

  const ok = (value as { ok?: unknown }).ok;
  return ok === true || ok === false;
}

function isActiveBackfillJob(run: BackfillJobRun) {
  if (run.status === "queued" || run.status === "running") {
    return true;
  }
  if (run.status !== "waiting") {
    return false;
  }

  const nextAttemptAt = getBackfillJobMeta(run)?.nextAttemptAt;
  if (nextAttemptAt && Date.parse(nextAttemptAt) > Date.now()) {
    return true;
  }

  return Date.now() - Date.parse(run.updatedAt) < ACTIVE_WAITING_JOB_MS;
}

function getBackfillJobMessage(run: BackfillJobRun) {
  const response = getBackfillResponseFromRun(run);
  const jobMeta = getBackfillJobMeta(run);
  if (run.status === "failed") {
    return run.errorMessage ?? (response && !response.ok ? response.message : undefined) ?? "보고서 복구 작업이 실패했습니다.";
  }
  if (run.status === "completed") {
    return "전체 복구 작업이 끝났습니다. 이미 저장된 보고서는 중복 저장하지 않았습니다.";
  }
  if (isWaitingBackfillJobPastAttempt(run)) {
    return "자동 대기 시간이 지났지만 서버 작업이 재개되지 않았습니다. 전체 저장 / 이어받기를 누르면 남은 보고서부터 다시 시작합니다.";
  }
  if (jobMeta?.message) {
    return `${getBackfillJobStatusLabel(run.status)}: ${jobMeta.message}`;
  }
  if (run.status === "waiting") {
    return "자동 대기 중: 대기가 오래 이어지면 다시 전체 저장 / 이어받기로 남은 보고서부터 계속할 수 있습니다.";
  }
  return `${getBackfillJobStatusLabel(run.status)}: 화면을 닫아도 서버가 남은 보고서를 계속 처리합니다.`;
}

function getBackfillJobMessageClass(run: BackfillJobRun) {
  if (run.status === "failed") {
    return "is-error";
  }
  if (run.status === "completed") {
    return "is-success";
  }
  return "is-warning";
}

function getBackfillJobMeta(run: BackfillJobRun) {
  const job = run.resultJson?.job;
  if (!job || typeof job !== "object") {
    return null;
  }

  return job as { message?: string; nextAttemptAt?: string; updatedAt?: string };
}

function getBackfillJobStatusLabel(status: BackfillJobStatus) {
  const labels: Record<BackfillJobStatus, string> = {
    completed: "완료",
    failed: "실패",
    queued: "대기 중",
    running: "실행 중",
    waiting: "자동 대기 중",
  };
  return labels[status];
}

function isWaitingBackfillJobPastAttempt(run: BackfillJobRun) {
  if (run.status !== "waiting") {
    return false;
  }
  const nextAttemptAt = getBackfillJobMeta(run)?.nextAttemptAt;
  return Boolean(nextAttemptAt && Date.parse(nextAttemptAt) <= Date.now());
}

export function createFullBackfillFormState(todayKst?: string): BackfillFormState {
  return {
    fromDate: todayKst ? getDateOffsetFromKstDate(todayKst, -SEARCH_AD_MAX_REPORT_RETENTION_DAYS) : getKstDateOffset(-SEARCH_AD_MAX_REPORT_RETENTION_DAYS),
    reportTypes: ALL_SEARCH_AD_REPORT_TYPES,
    toDate: todayKst ? getDateOffsetFromKstDate(todayKst, -1) : getKstDateOffset(-1),
  };
}

export function getBackfillResultMessage(item: Pick<BackfillResult, "message" | "providerStatus" | "status">) {
  if (item.status === "download_skipped" && item.message?.includes("maxDownloads 제한")) {
    return "마켓크루 다운로드 안전 상한에 도달해 다음 자동 배치에서 이어서 저장합니다.";
  }
  if (item.status === "no_data" || (item.status === "pending" && item.providerStatus === "NONE")) {
    return "네이버가 다운로드 파일을 제공하지 않아 저장할 원본이 없습니다.";
  }

  return item.message ?? getProviderStatusLabel(item.providerStatus) ?? "-";
}

export function getBackfillSafetyDescription(limits: Pick<ReturnType<typeof getQuickBackfillLimits>, "maxCreates" | "maxHourlyCreates">) {
  return `마켓크루의 40건/시간당 80건 상한은 쓰지 않고, 전체 남은 보고서를 요청 사이 긴 대기 시간으로 이어받습니다. 네이버가 속도 제한을 보내면 자동으로 충분히 대기합니다.`;
}

function countBackfillDates(fromDate: string, toDate: string) {
  const from = parseDateOnly(fromDate);
  const to = parseDateOnly(toDate);
  if (!from || !to || from > to) {
    return 0;
  }
  return Math.floor((to.getTime() - from.getTime()) / DAY_MS) + 1;
}

function formatSeconds(ms: number) {
  return `${(ms / 1000).toLocaleString("ko-KR", { maximumFractionDigits: 2 })}초`;
}

function formatMinutes(ms: number) {
  return `${Math.ceil(ms / 60_000).toLocaleString("ko-KR")}분`;
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
