import { parseSearchAdMediaMaster } from "@/features/search-ad/domain/parseSearchAdMediaMaster";
import { getSearchAdCredentials } from "@/lib/integrations/search-ad/client";
import {
  createSearchAdMasterReportJob,
  downloadSearchAdReport,
  getSearchAdMasterReportJob,
  listSearchAdMasterReportJobs,
  type SearchAdMasterReportJob,
} from "@/lib/integrations/search-ad/reports";
import { hasDatabaseUrl } from "@/lib/persistence/postgres";
import { rebuildAndSaveSearchAdRuleResults, saveSearchAdMediaSnapshots } from "@/lib/persistence/searchAdRepository";

const MEDIA_MASTER_ITEM = "Media";

type MediaMasterSyncInput = {
  forceCreate?: boolean;
};

export async function syncSearchAdMediaMaster(input: MediaMasterSyncInput = {}) {
  if (!getSearchAdCredentials()) {
    return {
      ok: false as const,
      code: "SEARCH_AD_CREDENTIALS_MISSING",
      message: "네이버 검색광고 API 설정이 필요합니다.",
    };
  }

  if (!hasDatabaseUrl()) {
    return {
      ok: false as const,
      code: "SEARCH_AD_DATABASE_MISSING",
      message: "매체 마스터를 저장할 DB 연결이 필요합니다.",
    };
  }

  const job = await resolveMediaMasterJob(Boolean(input.forceCreate));
  if (!job.downloadUrl) {
    return {
      ok: false as const,
      code: "SEARCH_AD_MEDIA_MASTER_NOT_READY",
      message: "네이버 매체 마스터 보고서가 아직 생성 중입니다. 잠시 후 다시 실행해 주세요.",
      data: { jobId: job.id, status: job.status },
    };
  }

  const download = await downloadSearchAdReport(job.downloadUrl);
  const parsed = parseSearchAdMediaMaster(download.text);
  const saved = await saveSearchAdMediaSnapshots(parsed.rows);
  const ruleRebuild = await rebuildAndSaveSearchAdRuleResults();

  return {
    ok: true as const,
    data: {
      jobId: job.id,
      sourceStatus: job.status,
      mediaRows: parsed.rows.length,
      saved: saved.saved,
      collectedAt: saved.collectedAt,
      ruleResults: ruleRebuild.saved,
      checksum: parsed.checksum,
    },
  };
}

async function resolveMediaMasterJob(forceCreate: boolean) {
  if (!forceCreate) {
    const existing = (await listSearchAdMasterReportJobs()).filter((job) => job.item === MEDIA_MASTER_ITEM);
    const built = existing
      .filter((job) => job.status === "BUILT" && Boolean(job.downloadUrl))
      .sort((a, b) => toTime(b.updateTime) - toTime(a.updateTime))[0];
    if (built) {
      return built;
    }
  }

  const created = await createSearchAdMasterReportJob(MEDIA_MASTER_ITEM);
  return pollMasterReport(created);
}

async function pollMasterReport(initialJob: SearchAdMasterReportJob) {
  let job = initialJob;
  for (let attempt = 0; attempt < getMediaMasterPollAttempts(); attempt += 1) {
    if (job.status === "BUILT" && job.downloadUrl) {
      return job;
    }
    if (job.status === "ERROR" || job.status === "NONE") {
      return job;
    }
    await sleep(getMediaMasterPollDelayMs());
    job = await getSearchAdMasterReportJob(job.id);
  }
  return job;
}

function getMediaMasterPollAttempts() {
  const raw = Number.parseInt(process.env.SEARCH_AD_MEDIA_MASTER_POLL_ATTEMPTS ?? "", 10);
  return Number.isFinite(raw) ? Math.max(1, raw) : 12;
}

function getMediaMasterPollDelayMs() {
  const raw = Number.parseInt(process.env.SEARCH_AD_MEDIA_MASTER_POLL_DELAY_MS ?? "", 10);
  return Number.isFinite(raw) ? Math.max(250, raw) : 1_500;
}

function toTime(value: string | undefined) {
  const time = value ? new Date(value).getTime() : 0;
  return Number.isFinite(time) ? time : 0;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
