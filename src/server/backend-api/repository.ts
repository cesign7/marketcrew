import { createLocalWorkflowRepository, seedSampleWorkflowIfEmpty } from "@/lib/persistence/workflow-store";

export function createBackendWorkflowRepository(options: { seedSample?: boolean } = {}) {
  const repository = createLocalWorkflowRepository();
  if (options.seedSample) {
    seedSampleWorkflowIfEmpty(repository);
  }

  return repository;
}
