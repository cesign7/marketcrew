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
    updatedAt: string;
  };
};

const activeRuns = new Set<string>();
const MAX_BACKGROUND_CYCLES = 240;

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

  try {
    for (let cycle = 1; cycle <= MAX_BACKGROUND_CYCLES; cycle += 1) {
      await markSearchAdBackfillRunRunning(runId);
      const result = await runSearchAdReportBackfill({
        ...input,
        createMissing: true,
        dryRun: false,
        skipSaved: true,
      });
      latestResult = attachJobMeta(result, cycle);

      if (!result.ok) {
        await failSearchAdBackfillRun(runId, result.message, latestResult as unknown as Record<string, unknown>);
        return;
      }

      if (result.data.summary.planned === 0) {
        await completeSearchAdBackfillRun(runId, latestResult as unknown as Record<string, unknown>);
        return;
      }

      const delayMs = getNextDelayMs(result);
      latestResult = attachJobMeta(result, cycle, {
        message: getProgressMessage(result),
        nextAttemptAt: new Date(Date.now() + delayMs).toISOString(),
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
  return {
    createMissing: true,
    dryRun: false,
    fromDate: input.fromDate,
    maxCreates: input.maxCreates,
    maxDates: input.maxDates,
    maxDownloads: input.maxDownloads,
    reportTypes: input.reportTypes,
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
  meta: { message?: string; nextAttemptAt?: string } = {},
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

function getProgressMessage(result: SearchAdBackfillRunSuccess) {
  const { summary } = result.data;
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

function getNextDelayMs(result: SearchAdBackfillRunSuccess) {
  const { summary } = result.data;
  if (summary.failed > 0 && summary.created === 0 && summary.downloaded === 0) {
    return 60_000;
  }
  if (summary.created > 0 || summary.pending > 0) {
    return 30_000;
  }
  return 2_000;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
