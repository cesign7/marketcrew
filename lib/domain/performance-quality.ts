import type { ExecutionStatus } from "@/app/generated/prisma/enums";

export type PerformanceQualityStatus =
  | "NO_KEYWORDS"
  | "NO_PERFORMANCE_ROWS"
  | "SYNC_FAILED"
  | "STALE_PERFORMANCE"
  | "READY";

export interface LatestPerformanceRunLike {
  status: ExecutionStatus;
  startedAt: Date;
  finishedAt: Date | null;
  errorMessage: string | null;
}

export interface PerformanceQualityInput {
  keywordSnapshotCount: number;
  performanceRowCount: number;
  latestPerformanceRun: LatestPerformanceRunLike | null;
  now?: Date;
}

export interface PerformanceQualityResult {
  status: PerformanceQualityStatus;
  canDiagnose: boolean;
  title: string;
  detail: string;
  nextAction: string;
}

const FRESHNESS_WINDOW_DAYS = 2;

export function evaluatePerformanceDataQuality({
  keywordSnapshotCount,
  performanceRowCount,
  latestPerformanceRun,
  now = new Date(),
}: PerformanceQualityInput): PerformanceQualityResult {
  if (keywordSnapshotCount === 0) {
    return {
      status: "NO_KEYWORDS",
      canDiagnose: false,
      title: "키워드 목록이 필요합니다",
      detail: "검색광고 목록 동기화를 먼저 실행해야 AI가 진단할 키워드를 고를 수 있습니다.",
      nextAction: "설정에서 목록 동기화를 실행하세요.",
    };
  }

  if (latestPerformanceRun?.status === "FAILED") {
    return {
      status: "SYNC_FAILED",
      canDiagnose: false,
      title: "성과 동기화가 실패했습니다",
      detail:
        latestPerformanceRun.errorMessage ??
        "마지막 성과 동기화가 실패해서 진단을 보류합니다.",
      nextAction: "검색광고 API 설정과 동기화 이력을 확인하세요.",
    };
  }

  if (performanceRowCount === 0) {
    return {
      status: "NO_PERFORMANCE_ROWS",
      canDiagnose: false,
      title: "성과 데이터가 비어 있습니다",
      detail:
        "키워드 목록은 있지만 최근 성과 row가 없어 입찰/제외 키워드 제안을 만들지 않습니다.",
      nextAction: "성과 동기화를 다시 실행하거나 /stats 반환 범위를 점검하세요.",
    };
  }

  if (
    latestPerformanceRun?.finishedAt &&
    daysBetween(latestPerformanceRun.finishedAt, now) > FRESHNESS_WINDOW_DAYS
  ) {
    return {
      status: "STALE_PERFORMANCE",
      canDiagnose: true,
      title: "성과 데이터가 오래됐습니다",
      detail:
        "최근 성과가 오래되어 제안 신뢰도는 낮게 표시합니다. 그래도 기존 데이터 기준 진단은 가능합니다.",
      nextAction: "성과 동기화를 새로 실행한 뒤 제안을 검토하세요.",
    };
  }

  return {
    status: "READY",
    canDiagnose: true,
    title: "진단 준비 완료",
    detail: "키워드 목록과 성과 데이터가 준비되어 AI 진단을 실행할 수 있습니다.",
    nextAction: "운영실에서 AI 진단 실행을 눌러 제안을 생성하세요.",
  };
}

function daysBetween(from: Date, to: Date) {
  return (to.getTime() - from.getTime()) / 86_400_000;
}
