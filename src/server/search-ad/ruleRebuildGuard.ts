import type { SearchAdBackfillRunRecord } from "@/lib/persistence/searchAdRepository";

export const RULE_REBUILD_BACKFILL_STALE_MS = 10 * 60 * 1000;

export type RuleRebuildGuard = {
  ageSeconds?: number;
  blocked: boolean;
  message: string;
  nextAttemptAt?: string;
};

export function getRuleRebuildBackfillGuard(run: SearchAdBackfillRunRecord | undefined, now = Date.now()): RuleRebuildGuard {
  if (!run || run.status === "completed" || run.status === "failed") {
    return {
      blocked: false,
      message: "규칙 결과를 재계산할 수 있습니다.",
    };
  }

  const updatedAt = Date.parse(run.updatedAt);
  const ageMs = Number.isFinite(updatedAt) ? Math.max(0, now - updatedAt) : Number.POSITIVE_INFINITY;
  const ageSeconds = Number.isFinite(ageMs) ? Math.round(ageMs / 1000) : undefined;
  const nextAttemptAt = getNextAttemptAt(run);

  if (run.status === "waiting" && nextAttemptAt && Date.parse(nextAttemptAt) > now) {
    return {
      ageSeconds,
      blocked: true,
      message: "보고서 백필이 자동 대기 중입니다. 다음 확인 뒤 완료 상태를 보고 규칙 결과를 재계산하세요.",
      nextAttemptAt,
    };
  }

  if (ageMs < RULE_REBUILD_BACKFILL_STALE_MS) {
    return {
      ageSeconds,
      blocked: true,
      message: "보고서 백필이 아직 진행 중입니다. 완료 후 규칙 결과를 재계산하세요.",
      nextAttemptAt,
    };
  }

  return {
    ageSeconds,
    blocked: false,
    message: "최근 백필 갱신이 오래되어 수동 재계산을 허용합니다. 먼저 백필 상태가 멈춘 것인지 확인하세요.",
    nextAttemptAt,
  };
}

function getNextAttemptAt(run: SearchAdBackfillRunRecord) {
  const job = run.resultJson?.job;
  if (!job || typeof job !== "object") {
    return undefined;
  }

  const nextAttemptAt = (job as { nextAttemptAt?: unknown }).nextAttemptAt;
  return typeof nextAttemptAt === "string" && Number.isFinite(Date.parse(nextAttemptAt)) ? nextAttemptAt : undefined;
}
