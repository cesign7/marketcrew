import Link from "next/link";
import { ClipboardList } from "lucide-react";
import { ApprovalPreviewPanel } from "@/components/agenda-room/ApprovalPreviewPanel";
import { ExecutionPanel } from "@/components/agenda-room/ExecutionPanel";
import { OwnerDecisionFlowPanel } from "@/components/agenda-room/OwnerDecisionFlowPanel";
import { AppShell } from "@/components/layout/AppShell";
import { loadAgendaRoomViewModel } from "@/features/agenda-room/loadAgendaRoomViewModel";

export const dynamic = "force-dynamic";

export default function ApprovalsPage() {
  const viewModel = loadAgendaRoomViewModel();

  return (
    <AppShell
      active="approvals"
      actions={
        <Link className="secondary-button" href="/follow-ups">
          <ClipboardList size={16} aria-hidden="true" />
          후속 업무
        </Link>
      }
      description="승인 대기, 보강 요청, 실행 차단, 성과 확인 대기를 한 흐름으로 봅니다."
      eyebrow="대표 결재"
      generatedAt={viewModel.generatedAt}
      title="결재/실행관리"
    >
      <ApprovalPreviewPanel previews={viewModel.approvalPreviews} />
      <OwnerDecisionFlowPanel flows={viewModel.ownerDecisionFlows} />
      <ExecutionPanel results={viewModel.executionResults} checkpoints={viewModel.outcomeCheckpoints} />
    </AppShell>
  );
}
