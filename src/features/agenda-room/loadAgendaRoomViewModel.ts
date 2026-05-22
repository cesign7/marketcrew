import { createLocalWorkflowRepository } from "@/lib/persistence/workflow-store";
import { buildAgendaRoomViewModel } from "./buildAgendaRoomViewModel";
import type { AgendaRoomViewModel } from "./types";

const DEFAULT_VIEW_MODEL_CACHE_TTL_MS = 10_000;

type CachedAgendaRoomViewModel = {
  expiresAt: number;
  viewModel: AgendaRoomViewModel;
};

declare global {
  // eslint-disable-next-line no-var
  var __marketcrewAgendaRoomViewModelCache: CachedAgendaRoomViewModel | undefined;
}

export function loadAgendaRoomViewModel() {
  const cached = readAgendaRoomViewModelCache();
  if (cached) {
    return cached;
  }

  const viewModel = buildAgendaRoomViewModel({
    repository: createLocalWorkflowRepository(),
  });
  writeAgendaRoomViewModelCache(viewModel);

  return viewModel;
}

export function clearAgendaRoomViewModelCache() {
  globalThis.__marketcrewAgendaRoomViewModelCache = undefined;
}

function readAgendaRoomViewModelCache() {
  const ttlMs = getViewModelCacheTtlMs();
  if (ttlMs <= 0) {
    return undefined;
  }

  const cached = globalThis.__marketcrewAgendaRoomViewModelCache;
  if (!cached || cached.expiresAt <= Date.now()) {
    clearAgendaRoomViewModelCache();
    return undefined;
  }

  return cached.viewModel;
}

function writeAgendaRoomViewModelCache(viewModel: AgendaRoomViewModel) {
  const ttlMs = getViewModelCacheTtlMs();
  if (ttlMs <= 0) {
    clearAgendaRoomViewModelCache();
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
