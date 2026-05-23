"use client";

import { Save, ShieldCheck } from "lucide-react";
import { useState } from "react";
import type { AgentRunProvider, AiCharacterProfileSettings, AiOperationsSettings } from "@/lib/domain";
import type { AiPeopleOfficeView } from "@/features/people/ai-operations-settings";
import { keywordPilotScopeLabel } from "@/features/characters/keyword-pilot";

type AiPeopleOfficeProps = {
  view: AiPeopleOfficeView;
};

type SaveState = "idle" | "saving" | "saved" | "failed";

export function AiPeopleOffice({ view }: AiPeopleOfficeProps) {
  const [settings, setSettings] = useState(view.settings);
  const [saveState, setSaveState] = useState<SaveState>("idle");

  async function saveSettings() {
    setSaveState("saving");
    try {
      const response = await fetch("/api/settings/ai-operations", {
        body: JSON.stringify({ settings }),
        headers: { "content-type": "application/json" },
        method: "PUT",
      });
      if (!response.ok) {
        throw new Error("save failed");
      }
      const payload = (await response.json()) as { settings: AiOperationsSettings };
      setSettings(payload.settings);
      setSaveState("saved");
    } catch {
      setSaveState("failed");
    }
  }

  return (
    <section className="people-office-section" aria-label="AI 인사과">
      <div className={`ai-payroll-summary summary-${view.budgetStatusTone}`} aria-label="이번 달 AI 사용 명세">
        <header>
          <div>
            <span className="eyebrow">{view.monthLabel} 사용 명세</span>
            <h2>모델별 토큰과 예상금액</h2>
            <p>{view.sourceNote}</p>
          </div>
          <span>{view.budgetStatusLabel}</span>
        </header>
        <div className="ai-payroll-metrics">
          <span>입력 {view.totalInputTokensLabel}</span>
          <span>출력 {view.totalOutputTokensLabel}</span>
          <span>예상 {view.totalCostLabel}</span>
          <span>월 한도 {view.monthlyBudgetLabel}</span>
          <span>{view.monthlyRemainingLabel}</span>
        </div>
        <div className="ai-model-usage-grid">
          {view.modelUsageRows.map((row) => (
            <article key={row.id}>
              <header>
                <strong>{row.model}</strong>
                <span>{row.providerLabel}</span>
              </header>
              <div>
                <span>실행 {row.runCountLabel}</span>
                <span>입력 {row.inputTokensLabel}</span>
                <span>출력 {row.outputTokensLabel}</span>
                <span>총 {row.totalTokensLabel}</span>
                <span>예상 {row.estimatedCostLabel}</span>
              </div>
              <p>{row.pricingBasisLabel}</p>
            </article>
          ))}
        </div>
      </div>

      <div className="ai-exploration-policy" aria-label={view.explorationPolicy.title}>
        <header>
          <div>
            <span className="eyebrow">판단 방식</span>
            <h2>{view.explorationPolicy.title}</h2>
            <p>{view.explorationPolicy.summary}</p>
          </div>
          <span>{view.explorationPolicy.steps.at(-1)?.title ?? "검증"}</span>
        </header>
        <ol className="ai-exploration-steps">
          {view.explorationPolicy.steps.map((step, index) => (
            <li key={step.title}>
              <span>{index + 1}</span>
              <strong>{step.title}</strong>
              <p>{step.description}</p>
            </li>
          ))}
        </ol>
        <div className="ai-exploration-safeguards" aria-label="안전 기준">
          {view.explorationPolicy.safeguards.map((safeguard) => (
            <span key={safeguard}>{safeguard}</span>
          ))}
        </div>
      </div>

      <div className="ai-people-toolbar">
        <div>
          <span className="eyebrow">캐릭터 롤모델</span>
          <h2>AI 직원 기본 역할</h2>
          <p>{keywordPilotScopeLabel}에 필요한 캐릭터부터 활성화하고, 나머지 역할은 준비중으로 둡니다.</p>
        </div>
        <button className="primary-button" disabled={saveState === "saving"} onClick={saveSettings} type="button">
          <Save size={16} aria-hidden="true" />
          저장
        </button>
        <span aria-live="polite">{saveStateLabel(saveState)}</span>
      </div>

      <div className="ai-people-grid">
        {settings.characterProfiles.map((profile) => {
          const usage = view.characterProfiles.find((item) => item.id === profile.id);
          return (
            <article
              className={`ai-person-card${usage?.availability === "PREPARING" ? " is-preparing" : ""}`}
              key={profile.id}
            >
              <header>
                <div className="avatar" aria-hidden="true">
                  {profile.name.slice(0, 1)}
                </div>
                <div>
                  <span className="eyebrow">{profile.departmentRole}</span>
                  <h3>{profile.name}</h3>
                </div>
                <div className="ai-person-badges">
                  <span className={`character-availability-badge availability-${usage?.availability.toLowerCase() ?? "preparing"}`}>
                    {usage?.availabilityLabel ?? "준비중"}
                  </span>
                  <span>
                    <ShieldCheck size={14} aria-hidden="true" />
                    {usage?.estimatedCostLabel ?? "0원"}
                  </span>
                </div>
              </header>

              <div className="ai-person-usage">
                <span>{usage?.usageSummaryLabel ?? "입력 0 / 출력 0토큰"}</span>
                <span>{usage?.availabilityDescription ?? "준비중"}</span>
              </div>

              <label>
                <span>직무명</span>
                <input
                  value={profile.departmentRole}
                  onChange={(event) => updateProfile(profile.id, { departmentRole: event.target.value })}
                />
              </label>
              <label>
                <span>기본 모델</span>
                <select
                  value={`${profile.provider}:${profile.model}`}
                  onChange={(event) => {
                    const [provider, model] = event.target.value.split(":");
                    updateProfile(profile.id, {
                      provider: provider as AgentRunProvider,
                      model,
                    });
                  }}
                >
                  {view.modelOptions.map((option) => (
                    <option key={`${option.provider}:${option.model}`} value={`${option.provider}:${option.model}`}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>롤모델</span>
                <textarea
                  rows={3}
                  value={profile.roleModel}
                  onChange={(event) => updateProfile(profile.id, { roleModel: event.target.value })}
                />
              </label>
              <label>
                <span>담당 책임</span>
                <textarea
                  rows={3}
                  value={profile.responsibility}
                  onChange={(event) => updateProfile(profile.id, { responsibility: event.target.value })}
                />
              </label>
              <label>
                <span>보고 형식</span>
                <textarea
                  rows={3}
                  value={profile.outputContract}
                  onChange={(event) => updateProfile(profile.id, { outputContract: event.target.value })}
                />
              </label>
              <label>
                <span>월간 평가 기준</span>
                <textarea
                  rows={3}
                  value={profile.monthlyReviewRule}
                  onChange={(event) => updateProfile(profile.id, { monthlyReviewRule: event.target.value })}
                />
              </label>
            </article>
          );
        })}
      </div>
    </section>
  );

  function updateProfile(id: AiCharacterProfileSettings["id"], patch: Partial<AiCharacterProfileSettings>) {
    setSettings((current) => ({
      ...current,
      characterProfiles: current.characterProfiles.map((profile) =>
        profile.id === id
          ? {
              ...profile,
              ...patch,
            }
          : profile,
      ),
    }));
  }
}

function saveStateLabel(state: SaveState): string {
  const labels: Record<SaveState, string> = {
    idle: "저장 전",
    saving: "저장 중",
    saved: "저장 완료",
    failed: "저장 실패",
  };

  return labels[state];
}
