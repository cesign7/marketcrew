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

const DEFAULT_VIEW_MODEL_CACHE_TTL_MS = 60_000;

type CachedAgendaRoomViewModel = {
  expiresAt: number;
  viewModel: AgendaRoomViewModel;
};

type WorkflowReadRepositoryOptions = {
  env?: NodeJS.ProcessEnv;
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
  if ((viewModel as Partial<AgendaRoomViewModel>).evidenceRequestQueue) {
    return viewModel;
  }

  const fallbackQueue = buildAgendaRoomViewModel().evidenceRequestQueue;

  return {
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
}

export async function clearAgendaRoomViewModelCache() {
  clearLocalAgendaRoomViewModelCache();
  await clearBackendReadThroughCache();
  await clearBackendWorkflowStateCache();
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
    void clearAgendaRoomViewModelCache();
    return undefined;
  }

  return cached.viewModel;
}

function writeAgendaRoomViewModelCache(viewModel: AgendaRoomViewModel) {
  const ttlMs = getViewModelCacheTtlMs();
  if (ttlMs <= 0) {
    void clearAgendaRoomViewModelCache();
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
