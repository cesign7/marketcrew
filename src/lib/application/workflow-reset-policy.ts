import { workflowCollectionKeys, type WorkflowCollectionKey, type WorkflowRepositoryState } from "./workflow-state";

export const WORKFLOW_RESET_CONFIRMATION = "운영 시작 전 테스트 데이터 초기화";

export const WORKFLOW_RESET_PRESERVED_COLLECTIONS: WorkflowCollectionKey[] = ["aiOperationsSettings"];

export const WORKFLOW_RESETTABLE_COLLECTIONS: WorkflowCollectionKey[] = workflowCollectionKeys.filter(
  (key) => !WORKFLOW_RESET_PRESERVED_COLLECTIONS.includes(key),
);

export type WorkflowResetCollectionCount = {
  collection: WorkflowCollectionKey;
  count: number;
};

export function buildWorkflowResetPreview(state: WorkflowRepositoryState): {
  confirmation: string;
  resettableCollections: WorkflowResetCollectionCount[];
  preservedCollections: WorkflowResetCollectionCount[];
  resettableTotal: number;
  preservedTotal: number;
} {
  const resettableCollections = buildCounts(state, WORKFLOW_RESETTABLE_COLLECTIONS);
  const preservedCollections = buildCounts(state, WORKFLOW_RESET_PRESERVED_COLLECTIONS);

  return {
    confirmation: WORKFLOW_RESET_CONFIRMATION,
    resettableCollections,
    preservedCollections,
    resettableTotal: sumCounts(resettableCollections),
    preservedTotal: sumCounts(preservedCollections),
  };
}

export function isValidWorkflowResetConfirmation(value: unknown): boolean {
  return typeof value === "string" && value.trim() === WORKFLOW_RESET_CONFIRMATION;
}

function buildCounts(
  state: WorkflowRepositoryState,
  collections: WorkflowCollectionKey[],
): WorkflowResetCollectionCount[] {
  return collections.map((collection) => ({
    collection,
    count: state[collection].length,
  }));
}

function sumCounts(counts: WorkflowResetCollectionCount[]): number {
  return counts.reduce((sum, item) => sum + item.count, 0);
}
