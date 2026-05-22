import type { CharacterKey, FollowUpInternalTask } from "@/lib/domain";

export type FollowUpTaskStatusLabel = "대기" | "완료";
export type FollowUpTaskTone = "open" | "done" | "blocked" | "evidence";

export type FollowUpTaskQueueItemView = {
  id: string;
  title: string;
  status: FollowUpInternalTask["status"];
  statusLabel: FollowUpTaskStatusLabel;
  tone: FollowUpTaskTone;
  assignedCharacter: CharacterKey;
  assignedCharacterName: string;
  createdAt: string;
  sourceApprovalId: string;
  sourceApprovalTitle: string;
  sourceApprovalStatusLabel: string;
  sourceApprovalHref: string;
  latestDecisionLabel: string;
  latestDecisionMemo?: string;
  latestOutcomeLabel: string;
  learningNote: string;
  nextActionLabel: string;
  blockerLabels: string[];
};

export type FollowUpCharacterQueueView = {
  character: CharacterKey;
  name: string;
  role: string;
  openCount: number;
  doneCount: number;
  priorityLabel: string;
  tasks: FollowUpTaskQueueItemView[];
};

export type OwnerLearningSignalView = {
  id: string;
  label: string;
  value: string;
  detail: string;
  tone: "ready" | "warning" | "blocked";
};

export type FollowUpQueueViewModel = {
  generatedAt: string;
  summary: {
    openTasks: number;
    doneTasks: number;
    sourceApprovals: number;
    learningSignals: number;
  };
  characterQueues: FollowUpCharacterQueueView[];
  ownerLearningSignals: OwnerLearningSignalView[];
};
