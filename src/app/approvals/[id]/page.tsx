import { notFound } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { ApprovalAgentRunTimelinePanel } from "@/components/agenda-room/ApprovalAgentRunTimelinePanel";
import { ApprovalPreviewPanel } from "@/components/agenda-room/ApprovalPreviewPanel";
import { ExecutionPanel } from "@/components/agenda-room/ExecutionPanel";
import { OwnerDecisionFlowPanel } from "@/components/agenda-room/OwnerDecisionFlowPanel";
import { OwnerDecisionSubmitPanel } from "@/components/agenda-room/OwnerDecisionSubmitPanel";
import { OutcomeReportHistoryPanel } from "@/components/agenda-room/OutcomeReportHistoryPanel";
import { ProviderSyncEvidencePanel } from "@/components/agenda-room/ProviderSyncEvidencePanel";
import { AppShell } from "@/components/layout/AppShell";
import { loadWorkflowReadRepository } from "@/features/agenda-room/loadAgendaRoomViewModel";
import { buildApprovalDetailViewModel } from "@/features/approvals/buildApprovalDetailViewModel";

type ApprovalDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ApprovalDetailPage({ params }: ApprovalDetailPageProps) {
  const { id } = await params;
  const repository = await loadWorkflowReadRepository();
  const viewModel = buildApprovalDetailViewModel(id, {
    repository,
  });
  if (!viewModel) {
    notFound();
  }

  return (
    <AppShell
      active="approvals"
      actions={
        <a className="primary-button" href="#owner-decision-submit" aria-disabled={Boolean(viewModel.approvalPreview.disabledReason)}>
          <ShieldCheck size={16} aria-hidden="true" />
          승인 후 바로 반영
        </a>
      }
      description={viewModel.moaSummary}
      eyebrow="대표 결재 상세"
      generatedAt={viewModel.generatedAt}
      title={viewModel.title}
    >
      <ApprovalPreviewPanel previews={[viewModel.approvalPreview]} />
      <ProviderSyncEvidencePanel
        reports={viewModel.providerSyncEvidence}
        headingId="approval-provider-sync-title"
        eyebrow="결재 근거 추적"
        title="이 결재의 연동 수집 근거"
        description="연관 근거를 먼저 보여주고, 전체 수집 기록을 스마트스토어(스티커씨)와 쇼핑몰(커피프린트) 단위로도 확인합니다."
        emptyMessage="이 결재와 연결된 연동 수집 기록이 아직 없습니다. 읽기 전용 수집 후 다시 확인합니다."
      />
      <ApprovalAgentRunTimelinePanel runs={viewModel.agentRunTimeline} />
      <OwnerDecisionSubmitPanel
        approvalId={viewModel.id}
        disabledReason={viewModel.approvalPreview.disabledReason}
        executionScopeProposal={viewModel.approvalPreview.executionScopeProposal}
      />
      <OutcomeReportHistoryPanel reports={viewModel.outcomeHistory} />
      <OwnerDecisionFlowPanel flows={viewModel.ownerDecisionFlows} />
      <ExecutionPanel results={viewModel.executionResults} checkpoints={viewModel.outcomeCheckpoints} />
    </AppShell>
  );
}
