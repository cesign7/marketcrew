import {
  clearBackendReadThroughCache,
  clearBackendWorkflowStateCache,
  readBackendAgendaRoomViewModel,
  readBackendWorkflowRepositoryState,
} from "@/lib/backend/workflow-state-client";
import { isHostedFrontendRuntime } from "@/lib/backend/proxy";
import { runAgendaCycle } from "@/lib/application/agenda-cycle";
import { SampleProviderAdapter } from "@/lib/integrations/sample/provider";
import { createMemoryMarketingWorkflowRepository } from "@/lib/application/memory-workflow-repository";
import type { MarketingWorkflowRepository } from "@/lib/application/workflow-repository";
import { buildAgendaRoomViewModel } from "./buildAgendaRoomViewModel";
import type { AgendaRoomViewModel } from "./types";

const DEFAULT_VIEW_MODEL_CACHE_TTL_MS = 0;

type CachedAgendaRoomViewModel = {
  expiresAt: number;
  viewModel: AgendaRoomViewModel;
};

type WorkflowReadRepositoryOptions = {
  env?: NodeJS.ProcessEnv;
};

type ClearAgendaRoomViewModelCacheOptions = {
  remoteWorkflowState?: boolean;
};

declare global {
  // eslint-disable-next-line no-var
  var __marketcrewAgendaRoomViewModelCache: CachedAgendaRoomViewModel | undefined;
}

export async function loadAgendaRoomViewModel() {
  const cached = readAgendaRoomViewModelCache();
  if (cached) {
    return normalizeAgendaRoomViewModelCompatibility(cached);
  }

  const backendViewModel = await readBackendAgendaRoomViewModel();
  if (backendViewModel) {
    const normalizedViewModel = normalizeAgendaRoomViewModelCompatibility(backendViewModel);
    writeAgendaRoomViewModelCache(normalizedViewModel);
    return normalizedViewModel;
  }

  const viewModel = normalizeAgendaRoomViewModelCompatibility(buildAgendaRoomViewModel({
    repository: await loadWorkflowReadRepository(),
  }));
  writeAgendaRoomViewModelCache(viewModel);

  return viewModel;
}

export function normalizeAgendaRoomViewModelCompatibility(viewModel: AgendaRoomViewModel): AgendaRoomViewModel {
  const partialViewModel = viewModel as Partial<AgendaRoomViewModel>;
  if (
    partialViewModel.evidenceRequestQueue &&
    partialViewModel.llmDryRunQueue &&
    partialViewModel.aiPilotInsight &&
    partialViewModel.workDeskCards &&
    partialViewModel.keywordPerformanceDashboard
  ) {
    return normalizeProductGrowthOpportunityImages(viewModel);
  }

  const fallbackViewModel = buildAgendaRoomViewModel();
  const fallbackQueue = fallbackViewModel.evidenceRequestQueue;
  const withEvidenceQueue = partialViewModel.evidenceRequestQueue
    ? viewModel
    : {
        ...viewModel,
        summary: {
          ...viewModel.summary,
          waitingEvidence: viewModel.summary.waitingEvidence + fallbackQueue.openRequestCount,
        },
        inboxBuckets: viewModel.inboxBuckets.map((bucket) =>
          bucket.id === "WAITING_EVIDENCE"
            ? {
                ...bucket,
                count: bucket.count + fallbackQueue.openRequestCount,
              }
            : bucket,
        ),
        evidenceRequestQueue: fallbackQueue,
      };

  return normalizeProductGrowthOpportunityImages({
    ...withEvidenceQueue,
    workDeskCards: partialViewModel.workDeskCards ?? fallbackViewModel.workDeskCards,
    keywordPerformanceDashboard: partialViewModel.keywordPerformanceDashboard ?? fallbackViewModel.keywordPerformanceDashboard,
    llmDryRunQueue: partialViewModel.llmDryRunQueue ?? fallbackViewModel.llmDryRunQueue,
    aiPilotInsight: partialViewModel.aiPilotInsight ?? fallbackViewModel.aiPilotInsight,
  });
}

export async function clearAgendaRoomViewModelCache(options: ClearAgendaRoomViewModelCacheOptions = {}) {
  clearLocalAgendaRoomViewModelCache();
  await clearBackendReadThroughCache();
  if (options.remoteWorkflowState ?? true) {
    await clearBackendWorkflowStateCache();
  }
}

export function clearLocalAgendaRoomViewModelCache() {
  globalThis.__marketcrewAgendaRoomViewModelCache = undefined;
}

function readAgendaRoomViewModelCache() {
  const ttlMs = getViewModelCacheTtlMs();
  if (ttlMs <= 0) {
    return undefined;
  }

  const cached = globalThis.__marketcrewAgendaRoomViewModelCache;
  if (!cached || cached.expiresAt <= Date.now()) {
    clearLocalAgendaRoomViewModelCache();
    return undefined;
  }

  return cached.viewModel;
}

function writeAgendaRoomViewModelCache(viewModel: AgendaRoomViewModel) {
  const ttlMs = getViewModelCacheTtlMs();
  if (ttlMs <= 0) {
    clearLocalAgendaRoomViewModelCache();
    return;
  }

  globalThis.__marketcrewAgendaRoomViewModelCache = {
    expiresAt: Date.now() + ttlMs,
    viewModel,
  };
}

function getViewModelCacheTtlMs(env: NodeJS.ProcessEnv = process.env): number {
  const rawValue = env.MARKETCREW_VIEW_MODEL_CACHE_TTL_MS;
  if (!rawValue) {
    return DEFAULT_VIEW_MODEL_CACHE_TTL_MS;
  }

  const parsed = Number.parseInt(rawValue, 10);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : DEFAULT_VIEW_MODEL_CACHE_TTL_MS;
}

export async function loadWorkflowReadRepository(
  options: WorkflowReadRepositoryOptions = {},
): Promise<MarketingWorkflowRepository> {
  const env = options.env ?? process.env;
  const backendState = await readBackendWorkflowRepositoryState(env);
  if (backendState) {
    return createMemoryMarketingWorkflowRepository(backendState);
  }

  if (isHostedFrontendRuntime(env)) {
    throw new Error("Vercel 화면 런타임에서는 Railway 백엔드 workflow state가 필요합니다.");
  }

  return createSampleWorkflowReadRepository();
}

function createSampleWorkflowReadRepository(): MarketingWorkflowRepository {
  const repository = createMemoryMarketingWorkflowRepository();
  runAgendaCycle({
    repository,
    sampleProvider: new SampleProviderAdapter(),
  });

  return repository;
}

function normalizeProductGrowthOpportunityImages(viewModel: AgendaRoomViewModel): AgendaRoomViewModel {
  return {
    ...viewModel,
    productGrowthOpportunities: viewModel.productGrowthOpportunities.map((opportunity) => {
      const legacyOpportunity = opportunity as typeof opportunity & {
        productImageAlt?: string;
        productImageUrl?: string;
      };
      if (legacyOpportunity.productImageUrl && legacyOpportunity.productImageAlt) {
        return opportunity;
      }

      const targetLabel = legacyOpportunity.targetLabel || legacyOpportunity.title || "상품";
      return {
        ...opportunity,
        productImageUrl: legacyOpportunity.productImageUrl ?? buildCompatibilityProductThumbnailDataUri(targetLabel),
        productImageAlt: legacyOpportunity.productImageAlt ?? `${targetLabel} 상품 이미지`,
      };
    }),
  };
}

function buildCompatibilityProductThumbnailDataUri(targetLabel: string): string {
  const label = [...targetLabel.split("/")[0]!.trim()].slice(0, 5).join("") || "상품";
  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 96 96">`,
    `<rect width="96" height="96" rx="14" fill="#eaf1fb"/>`,
    `<rect x="18" y="20" width="60" height="48" rx="8" fill="#ffffff" stroke="#bdd3ee" stroke-width="3"/>`,
    `<path d="M24 34h48M24 47h36M24 60h28" stroke="#245c9f" stroke-width="4" stroke-linecap="round" opacity="0.72"/>`,
    `<circle cx="72" cy="26" r="10" fill="#245c9f" opacity="0.9"/>`,
    `<text x="48" y="84" text-anchor="middle" font-size="14" font-family="Arial, sans-serif" font-weight="700" fill="#245c9f">${escapeCompatibilitySvgText(label)}</text>`,
    `</svg>`,
  ].join("");

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function escapeCompatibilitySvgText(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
