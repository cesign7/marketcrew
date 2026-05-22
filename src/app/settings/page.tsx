import { KeyRound, Lock, ShieldCheck, WalletCards } from "lucide-react";
import { LlmCostGovernancePanel } from "@/components/agenda-room/LlmCostGovernancePanel";
import { ProviderReadinessPanel } from "@/components/agenda-room/ProviderReadinessPanel";
import { AppShell } from "@/components/layout/AppShell";
import { AiBudgetSettingsPanel } from "@/components/settings/AiBudgetSettingsPanel";
import { loadAgendaRoomViewModel } from "@/features/agenda-room/loadAgendaRoomViewModel";
import { loadAiOperationsSettings } from "@/features/people/loadAiOperationsView";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [viewModel, aiSettings] = await Promise.all([loadAgendaRoomViewModel(), loadAiOperationsSettings()]);

  return (
    <AppShell
      active="settings"
      description="로그인, 연동 키, 예산 한도, 실제 쓰기 권한 잠금을 한곳에서 점검합니다."
      eyebrow="시스템 설정"
      generatedAt={viewModel.generatedAt}
      title="설정"
    >
      <section className="settings-grid" aria-label="운영 설정 요약">
        <article className="settings-card">
          <Lock size={20} aria-hidden="true" />
          <div>
            <strong>대표 전용 로그인</strong>
            <p>운영 화면과 API는 대표 세션이 없으면 로그인 화면 또는 401 응답으로 차단됩니다.</p>
          </div>
        </article>
        <article className="settings-card">
          <KeyRound size={20} aria-hidden="true" />
          <div>
            <strong>연동 키</strong>
            <p>채널별 읽기 키가 없으면 샘플/캐시 근거로 유지하고, 누락 키는 아래 준비상태에서 확인합니다.</p>
          </div>
        </article>
        <article className="settings-card">
          <WalletCards size={20} aria-hidden="true" />
          <div>
            <strong>AI 비용 한도</strong>
            <p>실제 모델 호출 전 1회 예산, 일 예산, 토큰 추정치를 먼저 확인합니다.</p>
          </div>
        </article>
        <article className="settings-card">
          <ShieldCheck size={20} aria-hidden="true" />
          <div>
            <strong>쓰기 권한 잠금</strong>
            <p>대표 승인 이후에도 외부 반영은 별도 잠금이 열리기 전까지 내부 초안으로만 기록합니다.</p>
          </div>
        </article>
      </section>

      <AiBudgetSettingsPanel initialSettings={aiSettings} />
      <LlmCostGovernancePanel governance={viewModel.llmCostGovernance} />
      <ProviderReadinessPanel providers={viewModel.providerReadiness} />
    </AppShell>
  );
}
