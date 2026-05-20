import { AppShell } from "@/components/layout/AppShell";
import { getPrimaryAutomationRule } from "@/lib/db/marketing-operations";
import { updateAutomationRuleAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function AutomationRulesPage() {
  const rule = await getPrimaryAutomationRule();

  return (
    <AppShell>
      <section className="rounded-[28px] border border-[#eadfc8] bg-white p-8">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[#0e8f81]">
          자동화 설정
        </p>
        <h2 className="mt-3 text-3xl font-black tracking-tight">
          저위험 자동 실행 규칙
        </h2>
        <p className="mt-2 max-w-3xl text-sm font-semibold leading-6 text-[#69727c]">
          이 범위 안의 변경만 자동 실행 후보가 됩니다. 현재 단계에서는 설정과
          승인 이력만 저장하고, 외부 광고 API 실행은 dry-run 이후에 엽니다.
        </p>

        {rule ? (
          <form action={updateAutomationRuleAction} className="mt-7 grid gap-6">
            <input type="hidden" name="id" value={rule.id} />
            <label className="flex items-center justify-between gap-4 rounded-3xl bg-[#fff8ec] p-5">
              <span>
                <span className="block text-sm font-black">자동 실행 허용</span>
                <span className="mt-1 block text-xs font-semibold text-[#69727c]">
                  꺼두면 모든 제안이 승인실로 이동합니다.
                </span>
              </span>
              <input
                name="enabled"
                type="checkbox"
                defaultChecked={rule.enabled}
                className="size-6 accent-[#0e8f81]"
              />
            </label>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              <RuleInput
                label="최대 변경폭"
                name="maxBidChangeRate"
                step="0.01"
                suffix="예: 0.05 = 5%"
                defaultValue={rule.maxBidChangeRate}
              />
              <RuleInput
                label="키워드별 일 변경"
                name="maxDailyChangesPerKeyword"
                suffix="회"
                defaultValue={rule.maxDailyChangesPerKeyword}
              />
              <RuleInput
                label="최대 CPC"
                name="maxCpc"
                suffix="원"
                defaultValue={rule.maxCpc ?? ""}
              />
              <RuleInput
                label="월 예산 상한"
                name="monthlyBudgetLimit"
                suffix="원"
                defaultValue={rule.monthlyBudgetLimit ?? ""}
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-semibold text-[#69727c]">
                승인 기준: {riskLabel(rule.requiresApprovalAboveRisk)} 초과는 승인실로
                보냅니다.
              </p>
              <button className="rounded-full bg-[#0e8f81] px-5 py-3 text-sm font-black text-white hover:-translate-y-0.5">
                저장
              </button>
            </div>
          </form>
        ) : (
          <div className="mt-7 rounded-3xl bg-[#fff8ec] p-6">
            <p className="font-black">자동화 룰이 아직 준비되지 않았습니다.</p>
            <p className="mt-2 text-sm font-semibold text-[#69727c]">
              기본 안전 기준을 만든 뒤 저위험 자동 실행을 켤 수 있습니다.
            </p>
          </div>
        )}
      </section>
    </AppShell>
  );
}

function RuleInput({
  label,
  name,
  defaultValue,
  suffix,
  step,
}: {
  label: string;
  name: string;
  defaultValue: number | string;
  suffix: string;
  step?: string;
}) {
  return (
    <label className="rounded-3xl bg-[#fff8ec] p-5">
      <span className="text-xs font-black text-[#69727c]">{label}</span>
      <input
        name={name}
        type="number"
        step={step}
        defaultValue={defaultValue}
        className="mt-2 w-full rounded-2xl border border-[#eadfc8] bg-white px-3 py-2 text-xl font-black outline-none focus:border-[#0e8f81]"
      />
      <span className="mt-2 block text-xs font-bold text-[#7b8791]">
        {suffix}
      </span>
    </label>
  );
}

function riskLabel(risk: string) {
  if (risk === "LOW") return "저위험";
  if (risk === "MEDIUM") return "중위험";
  return "고위험";
}
