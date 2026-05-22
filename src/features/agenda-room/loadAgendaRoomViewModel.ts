import { createLocalWorkflowRepository } from "@/lib/persistence/workflow-store";
import { buildAgendaRoomViewModel } from "./buildAgendaRoomViewModel";

export function loadAgendaRoomViewModel() {
  return buildAgendaRoomViewModel({
    repository: createLocalWorkflowRepository(),
  });
}
