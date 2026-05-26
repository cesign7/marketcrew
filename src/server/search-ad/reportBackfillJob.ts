import { resolveSearchAdBackfillSafetyLimits, type SearchAdBackfillSafetyLimits } from "@/features/search-ad/domain/backfillSafety";
import {
  completeSearchAdBackfillRun,
  createSearchAdBackfillRun,
  failSearchAdBackfillRun,
  getLatestSearchAdBackfillRun,
  getSearchAdBackfillRun,
  markSearchAdBackfillRunRunning,
  updateSearchAdBackfillRunProgress,
  type SearchAdBackfillRunRecord,
} from "@/lib/persistence/searchAdRepository";
import { runSearchAdReportBackfill, type SearchAdBackfillRunFailure, type SearchAdBackfillRunInput, type SearchAdBackfillRunSuccess } from "./reportBackfill";

type BackgroundBackfillInput = Omit<SearchAdBackfillRunInput, "dependencies">;

export type SearchAdBackfillJobResult =
  | {
      data: {
        run: SearchAdBackfillRunRecord;
      };
      ok: true;
    }
  | {
      code: "SEARCH_AD_BACKFILL_JOB_FAILED";
      message: string;
      ok: false;
    };

type StoredBackfillResult = (SearchAdBackfillRunSuccess | SearchAdBackfillRunFailure) & {
  job: {
    cycle: number;
    message?: string;
    nextAttemptAt?: string;
    safety?: BackfillSafetyWindow;
    updatedAt: string;
  };
};

const activeRuns = new Set<string>();
const MAX_BACKGROUND_CYCLES = 240;
const HOUR_MS = 60 * 60 * 1000;
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

type BackfillSafetyWindow = {
  createdThisHour: number;
  createdToday: number;
  dayKey: string;
  hourStartedAt: string;
};

export async function startSearchAdReportBackfillJob(input: BackgroundBackfillInput): Promise<SearchAdBackfillJobResult> {
  try {
    const normalizedInput = normalizeBackgroundInput(input);
    const latestRun = await getLatestSearchAdBackfillRun();
    if (latestRun && isResumableRun(latestRun)) {
      const resumedRun = (await markSearchAdBackfillRunRunning(latestRun.id)) ?? latestRun;
      queueBackfillRun(latestRun.id, normalizeBackgroundInput(latestRun.inputJson as BackgroundBackfillInput));
      return { data: { run: resumedRun }, ok: true };
    }

    const run = await createSearchAdBackfillRun(normalizedInput as Record<string, unknown>);
    queueBackfillRun(run.id, normalizedInput);
    return { data: { run }, ok: true };
  } catch (error) {
    return {
      code: "SEARCH_AD_BACKFILL_JOB_FAILED",
      message: error instanceof Error ? error.message : "보고서 복구 작업을 시작하지 못했습니다.",
      ok: false,
    };
  }
}

export async function getSearchAdReportBackfillJob(runId?: string): Promise<{ data: { run: SearchAdBackfillRunRecord | null }; ok: true }> {
  const run = runId ? await getSearchAdBackfillRun(runId) : await getLatestSearchAdBackfillRun();
  return { data: { run: run ?? null }, ok: true };
}

function queueBackfillRun(runId: string, input: BackgroundBackfillInput) {
  setTimeout(() => {
    void runBackgroundBackfill(runId, input);
  }, 0);
}

async function runBackgroundBackfill(runId: string, input: BackgroundBackfillInput) {
  if (activeRuns.has(runId)) {
    return;
  }

  activeRuns.add(runId);
  let latestResult: StoredBackfillResult | undefined;
  let safetyWindow = readSafetyWindow((await getSearchAdBackfillRun(runId))?.resultJson);

  try {
    for (let cycle = 1; cycle <= MAX_BACKGROUND_CYCLES; cycle += 1) {
      await markSearchAdBackfillRunRunning(runId);
      const safetyLimits = resolveSearchAdBackfillSafetyLimits(input);
      safetyWindow = refreshSafetyWindow(safetyWindow);
      const result = await runSearchAdReportBackfill({
        ...input,
        createMissing: true,
        dryRun: false,
        maxCreates: getAllowedCreatesForCycle(safetyWindow, safetyLimits),
        maxDownloads: safetyLimits.maxDownloads,
        skipSaved: true,
      });

      if (!result.ok) {
        latestResult = attachJobMeta(result, cycle, { safety: safetyWindow });
        await failSearchAdBackfillRun(runId, result.message, latestResult as unknown as Record<string, unknown>);
        return;
      }

      safetyWindow = addCreatedReportsToSafetyWindow(safetyWindow, result.data.summary.created);
      latestResult = attachJobMeta(result, cycle, { safety: safetyWindow });

      if (result.data.summary.planned === 0) {
        await completeSearchAdBackfillRun(runId, latestResult as unknown as Record<string, unknown>);
        return;
      }

      const delayMs = getNextDelayMs(result, safetyWindow, safetyLimits);
      latestResult = attachJobMeta(result, cycle, {
        message: getProgressMessage(result, safetyWindow, safetyLimits),
        nextAttemptAt: new Date(Date.now() + delayMs).toISOString(),
        safety: safetyWindow,
      });
      await updateSearchAdBackfillRunProgress(runId, latestResult as unknown as Record<string, unknown>, "waiting");
      await sleep(delayMs);
    }

    await updateSearchAdBackfillRunProgress(
      runId,
      {
        ...(latestResult ?? {}),
        job: {
          ...(latestResult?.job ?? {}),
          message: "장시간 작업 제한에 도달했습니다. 다시 전체 저장 / 이어받기를 누르면 남은 보고서부터 계속합니다.",
          updatedAt: new Date().toISOString(),
        },
      },
      "waiting",
    );
  } catch (error) {
    await failSearchAdBackfillRun(
      runId,
      error instanceof Error ? error.message : "보고서 복구 작업 중 오류가 발생했습니다.",
      latestResult as unknown as Record<string, unknown> | undefined,
    );
  } finally {
    activeRuns.delete(runId);
  }
}

function normalizeBackgroundInput(input: BackgroundBackfillInput): BackgroundBackfillInput {
  const safetyLimits = resolveSearchAdBackfillSafetyLimits(input);
  return {
    createMissing: true,
    dryRun: false,
    fromDate: input.fromDate,
    maxCreates: safetyLimits.maxCreates,
    maxDailyCreates: safetyLimits.maxDailyCreates,
    maxDates: input.maxDates,
    maxDownloads: safetyLimits.maxDownloads,
    maxHourlyCreates: safetyLimits.maxHourlyCreates,
    rateLimitBackoffMs: safetyLimits.rateLimitBackoffMs,
    reportTypes: input.reportTypes,
    requestDelayMs: safetyLimits.requestDelayMs,
    skipSaved: true,
    toDate: input.toDate,
    todayKst: input.todayKst,
  };
}

function isResumableRun(run: SearchAdBackfillRunRecord) {
  return run.status === "queued" || run.status === "running" || run.status === "waiting";
}

function attachJobMeta(
  result: SearchAdBackfillRunSuccess | SearchAdBackfillRunFailure,
  cycle: number,
  meta: { message?: string; nextAttemptAt?: string; safety?: BackfillSafetyWindow } = {},
): StoredBackfillResult {
  return {
    ...result,
    job: {
      cycle,
      ...meta,
      updatedAt: new Date().toISOString(),
    },
  };
}

function getProgressMessage(result: SearchAdBackfillRunSuccess, safetyWindow: BackfillSafetyWindow, safetyLimits: SearchAdBackfillSafetyLimits) {
  const { summary } = result.data;
  if (summary.rateLimited > 0) {
    return "네이버 호출 속도 제한 신호가 있어 자동으로 충분히 대기합니다.";
  }
  if (safetyWindow.createdToday >= safetyLimits.maxDailyCreates) {
    return "일일 생성 안전 상한에 도달해 다음 날짜에 남은 보고서를 이어받습니다.";
  }
  if (safetyWindow.createdThisHour >= safetyLimits.maxHourlyCreates) {
    return "시간당 생성 안전 상한에 도달해 다음 시간대에 남은 보고서를 이어받습니다.";
  }
  if (summary.created > 0 || summary.pending > 0) {
    return "네이버가 보고서를 생성하는 동안 자동으로 다시 확인합니다.";
  }
  if (summary.downloaded > 0 || summary.skippedDownloads > 0) {
    return "저장한 보고서를 건너뛰고 다음 남은 구간으로 이어갑니다.";
  }
  if (summary.failed > 0) {
    return "실패한 항목이 있어 잠시 뒤 다시 시도합니다.";
  }
  return "남은 보고서를 계속 확인합니다.";
}

function getNextDelayMs(result: SearchAdBackfillRunSuccess, safetyWindow: BackfillSafetyWindow, safetyLimits: SearchAdBackfillSafetyLimits) {
  const { summary } = result.data;
  if (summary.rateLimited > 0) {
    return summary.rateLimitBackoffMs;
  }
  const safetyDelayMs = getSafetyWindowDelayMs(safetyWindow, safetyLimits);
  if (safetyDelayMs > 0) {
    return safetyDelayMs;
  }
  if (summary.failed > 0 && summary.created === 0 && summary.downloaded === 0) {
    return 60_000;
  }
  if (summary.created > 0 || summary.pending > 0) {
    return 30_000;
  }
  return 2_000;
}

function getAllowedCreatesForCycle(safetyWindow: BackfillSafetyWindow, safetyLimits: SearchAdBackfillSafetyLimits) {
  return Math.max(
    0,
    Math.min(
      safetyLimits.maxCreates,
      safetyLimits.maxHourlyCreates - safetyWindow.createdThisHour,
      safetyLimits.maxDailyCreates - safetyWindow.createdToday,
    ),
  );
}

function getSafetyWindowDelayMs(safetyWindow: BackfillSafetyWindow, safetyLimits: SearchAdBackfillSafetyLimits) {
  if (safetyWindow.createdToday >= safetyLimits.maxDailyCreates) {
    return msUntilNextKstDay();
  }
  if (safetyWindow.createdThisHour >= safetyLimits.maxHourlyCreates) {
    return Math.max(60_000, Date.parse(safetyWindow.hourStartedAt) + HOUR_MS - Date.now());
  }
  return 0;
}

function addCreatedReportsToSafetyWindow(safetyWindow: BackfillSafetyWindow, created: number) {
  return {
    ...safetyWindow,
    createdThisHour: safetyWindow.createdThisHour + created,
    createdToday: safetyWindow.createdToday + created,
  };
}

function refreshSafetyWindow(input?: BackfillSafetyWindow): BackfillSafetyWindow {
  const now = Date.now();
  const currentDayKey = getKstDayKey(new Date(now));
  const current = input ?? {
    createdThisHour: 0,
    createdToday: 0,
    dayKey: currentDayKey,
    hourStartedAt: new Date(now).toISOString(),
  };
  const hourStartedAt = Date.parse(current.hourStartedAt);

  return {
    createdThisHour: Number.isFinite(hourStartedAt) && now - hourStartedAt < HOUR_MS ? current.createdThisHour : 0,
    createdToday: current.dayKey === currentDayKey ? current.createdToday : 0,
    dayKey: currentDayKey,
    hourStartedAt: Number.isFinite(hourStartedAt) && now - hourStartedAt < HOUR_MS ? current.hourStartedAt : new Date(now).toISOString(),
  };
}

function readSafetyWindow(resultJson?: Record<string, unknown>): BackfillSafetyWindow | undefined {
  const job = resultJson?.job;
  if (!job || typeof job !== "object") {
    return undefined;
  }
  const safety = (job as { safety?: unknown }).safety;
  if (!safety || typeof safety !== "object") {
    return undefined;
  }
  const window = safety as Partial<BackfillSafetyWindow>;
  if (typeof window.hourStartedAt !== "string" || typeof window.dayKey !== "string") {
    return undefined;
  }

  return {
    createdThisHour: toNonNegativeInteger(window.createdThisHour),
    createdToday: toNonNegativeInteger(window.createdToday),
    dayKey: window.dayKey,
    hourStartedAt: window.hourStartedAt,
  };
}

function toNonNegativeInteger(value: unknown) {
  return Number.isInteger(value) && Number(value) >= 0 ? Number(value) : 0;
}

function getKstDayKey(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "Asia/Seoul",
    year: "numeric",
  }).format(date);
}

function msUntilNextKstDay() {
  const now = Date.now();
  const kstNow = new Date(now + KST_OFFSET_MS);
  kstNow.setUTCHours(24, 0, 0, 0);
  return Math.max(60_000, kstNow.getTime() - KST_OFFSET_MS - now);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
