"use client";

import { Save } from "lucide-react";
import { useMemo, useState } from "react";
import type { AiOperationsSettings } from "@/lib/domain";

type AiBudgetSettingsPanelProps = {
  initialSettings: AiOperationsSettings;
};

type SaveState = "idle" | "saving" | "saved" | "failed";

export function AiBudgetSettingsPanel({ initialSettings }: AiBudgetSettingsPanelProps) {
  const [settings, setSettings] = useState(initialSettings);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const budget = settings.budget;
  const monthlyToDailyRatioLabel = useMemo(() => {
    const days = budget.dailyBudgetKrw > 0 ? Math.floor(budget.monthlyBudgetKrw / budget.dailyBudgetKrw) : 0;
    return days > 0 ? `일 예산 기준 약 ${days.toLocaleString("ko-KR")}일` : "일 예산 기준 계산 대기";
  }, [budget.dailyBudgetKrw, budget.monthlyBudgetKrw]);

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
    <section className="ai-budget-settings-card" aria-labelledby="ai-budget-settings-title">
      <header>
        <div>
          <span className="eyebrow">AI 예산 설정</span>
          <h2 id="ai-budget-settings-title">대표 승인 전 비용 한도</h2>
          <p>월 예산, 1일 예산, 1회 호출 한도와 토큰 상한을 운영 기준으로 저장합니다.</p>
        </div>
        <span>{monthlyToDailyRatioLabel}</span>
      </header>

      <div className="ai-budget-form-grid">
        <NumberField
          label="월 예산"
          suffix="원"
          value={budget.monthlyBudgetKrw}
          onChange={(value) => updateBudget("monthlyBudgetKrw", value)}
        />
        <NumberField
          label="일 예산"
          suffix="원"
          value={budget.dailyBudgetKrw}
          onChange={(value) => updateBudget("dailyBudgetKrw", value)}
        />
        <NumberField
          label="1회 호출"
          suffix="원"
          value={budget.runBudgetKrw}
          onChange={(value) => updateBudget("runBudgetKrw", value)}
        />
        <NumberField
          label="입력 상한"
          suffix="토큰"
          value={budget.maxInputTokens}
          onChange={(value) => updateBudget("maxInputTokens", value)}
        />
        <NumberField
          label="출력 상한"
          suffix="토큰"
          value={budget.maxOutputTokens}
          onChange={(value) => updateBudget("maxOutputTokens", value)}
        />
        <NumberField
          label="총 상한"
          suffix="토큰"
          value={budget.maxTotalTokens}
          onChange={(value) => updateBudget("maxTotalTokens", value)}
        />
        <NumberField
          label="적용 환율"
          suffix="원/USD"
          value={budget.krwPerUsd}
          onChange={(value) => updateBudget("krwPerUsd", value)}
        />
      </div>

      <label className="ai-budget-memo-field">
        <span>운영 메모</span>
        <textarea
          value={budget.memo}
          onChange={(event) =>
            setSettings((current) => ({
              ...current,
              budget: {
                ...current.budget,
                memo: event.target.value,
              },
            }))
          }
          rows={3}
        />
      </label>

      <footer>
        <button className="primary-button" disabled={saveState === "saving"} onClick={saveSettings} type="button">
          <Save size={16} aria-hidden="true" />
          저장
        </button>
        <span aria-live="polite">{saveStateLabel(saveState)}</span>
      </footer>
    </section>
  );

  function updateBudget(key: keyof typeof budget, value: number) {
    setSettings((current) => ({
      ...current,
      budget: {
        ...current.budget,
        [key]: value,
      },
    }));
  }
}

function NumberField({
  label,
  suffix,
  value,
  onChange,
}: {
  label: string;
  suffix: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="ai-number-field">
      <span>{label}</span>
      <input
        inputMode="numeric"
        min={1}
        type="number"
        value={value}
        onChange={(event) => onChange(Math.max(1, Number.parseInt(event.target.value || "1", 10)))}
      />
      <small>{suffix}</small>
    </label>
  );
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
