import { ExecutionPanel } from "@/components/agenda-room/ExecutionPanel";
import { ProductGrowthOpportunityPanel } from "@/components/agenda-room/ProductGrowthOpportunityPanel";
import { SeasonalKeywordPanel } from "@/components/agenda-room/SeasonalKeywordPanel";
import { AppShell } from "@/components/layout/AppShell";
import { loadAgendaRoomViewModel } from "@/features/agenda-room/loadAgendaRoomViewModel";

export const dynamic = "force-dynamic";

export default async function GrowthPage() {
  const viewModel = await loadAgendaRoomViewModel();

  return (
    <AppShell
      active="growth"
      description="상품별 키워드, 시즌 마케팅 제안, 상품 발굴 후보와 승인 후 성과 판단 기준을 함께 봅니다."
      eyebrow="성장 제안"
      generatedAt={viewModel.generatedAt}
      title="성장/성과"
    >
      <ProductGrowthOpportunityPanel opportunities={viewModel.productGrowthOpportunities} />
      <SeasonalKeywordPanel plans={viewModel.seasonalKeywordPlans} />
      <ExecutionPanel results={viewModel.executionResults} checkpoints={viewModel.outcomeCheckpoints} />
    </AppShell>
  );
}
