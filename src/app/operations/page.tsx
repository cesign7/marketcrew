import Link from "next/link";
import { ClipboardList, RefreshCcw, ShieldCheck } from "lucide-react";
import { AgentRunSummaryPanel } from "@/components/agenda-room/AgentRunSummaryPanel";
import { AgendaCard } from "@/components/agenda-room/AgendaCard";
import { ApprovalPreviewPanel } from "@/components/agenda-room/ApprovalPreviewPanel";
import { CharacterRail } from "@/components/agenda-room/CharacterRail";
import { ExecutionPanel } from "@/components/agenda-room/ExecutionPanel";
import { InboxBucketBar } from "@/components/agenda-room/InboxBucketBar";
import { LlmCostGovernancePanel } from "@/components/agenda-room/LlmCostGovernancePanel";
import { OwnerDecisionFlowPanel } from "@/components/agenda-room/OwnerDecisionFlowPanel";
import { PlannerPreviewPanel } from "@/components/agenda-room/PlannerPreviewPanel";
import { ProductGrowthOpportunityPanel } from "@/components/agenda-room/ProductGrowthOpportunityPanel";
import { ProviderReadinessPanel } from "@/components/agenda-room/ProviderReadinessPanel";
import { ProviderSyncEvidencePanel } from "@/components/agenda-room/ProviderSyncEvidencePanel";
import { SeasonalKeywordPanel } from "@/components/agenda-room/SeasonalKeywordPanel";
import { LogoutButton } from "@/components/auth/LogoutButton";
import { buildAgendaRoomViewModel } from "@/features/agenda-room/buildAgendaRoomViewModel";
import { createLocalWorkflowRepository } from "@/lib/persistence/workflow-store";

export const dynamic = "force-dynamic";

export default function OperationsPage() {
  const viewModel = buildAgendaRoomViewModel({
    repository: createLocalWorkflowRepository(),
  });

  return (
    <main className="operations-shell">
      <header className="topbar">
        <div>
          <span className="eyebrow">마켓크루 업무실</span>
          <h1>오늘 올라온 안건</h1>
        </div>
        <div className="topbar-actions">
          <span>생성 시각 {viewModel.generatedAt}</span>
          <button className="secondary-button" type="button">
            <RefreshCcw size={16} aria-hidden="true" />
            새로고침
          </button>
          <Link className="secondary-button" href="/follow-ups">
            <ClipboardList size={16} aria-hidden="true" />
            후속 업무
          </Link>
          <button className="primary-button" type="button">
            <ShieldCheck size={16} aria-hidden="true" />
            승인 검토
          </button>
          <LogoutButton />
        </div>
      </header>

      <section className="summary-strip" aria-label="오늘 업무 요약">
        <article>
          <span>승인 대기</span>
          <strong>{viewModel.summary.waitingApproval}</strong>
        </article>
        <article>
          <span>추가 근거 대기</span>
          <strong>{viewModel.summary.waitingEvidence}</strong>
        </article>
        <article>
          <span>즉시 반영 후보</span>
          <strong>{viewModel.summary.readyToApply}</strong>
        </article>
        <article>
          <span>실패 실행</span>
          <strong>{viewModel.summary.failedExecutions}</strong>
        </article>
      </section>

      <InboxBucketBar buckets={viewModel.inboxBuckets} />
      <ProviderReadinessPanel providers={viewModel.providerReadiness} />
      <ProviderSyncEvidencePanel reports={viewModel.providerSyncEvidence} />
      <PlannerPreviewPanel preview={viewModel.plannerPreview} />
      <LlmCostGovernancePanel governance={viewModel.llmCostGovernance} />
      <AgentRunSummaryPanel summary={viewModel.agentRunSummary} />

      <div className="workspace-grid">
        <CharacterRail characters={viewModel.characters} />
        <section className="agenda-section" aria-labelledby="agenda-section-title">
          <div className="section-heading">
            <div>
              <span className="eyebrow">하위 담당자 보고</span>
              <h2 id="agenda-section-title">오피가 묶어 올린 승인 안건</h2>
              <p>{viewModel.opiReport.summary}</p>
            </div>
            <div className="segmented-control" aria-label="안건 상태 필터">
              <button type="button" aria-pressed="true">
                전체
              </button>
              <button type="button">승인</button>
              <button type="button">보강</button>
              <button type="button">실패</button>
            </div>
          </div>
          <div className="agenda-list">
            {viewModel.agendaCards.map((agenda) => (
              <AgendaCard agenda={agenda} key={agenda.id} />
            ))}
          </div>
        </section>
      </div>

      <ProductGrowthOpportunityPanel opportunities={viewModel.productGrowthOpportunities} />
      <ApprovalPreviewPanel previews={viewModel.approvalPreviews} />
      <OwnerDecisionFlowPanel flows={viewModel.ownerDecisionFlows} />
      <SeasonalKeywordPanel plans={viewModel.seasonalKeywordPlans} />
      <ExecutionPanel results={viewModel.executionResults} checkpoints={viewModel.outcomeCheckpoints} />
    </main>
  );
}
