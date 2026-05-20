import { AppShell } from "@/components/layout/AppShell";
import { mockAutomationRule } from "@/lib/mock/marketingOperationsMock";

export default function AutomationRulesPage() {
  return (
    <AppShell>
      <section className="rounded-[28px] border border-[#eadfc8] bg-white p-8">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-[#0e8f81]">
          자동화 설정
        </p>
        <h2 className="mt-3 text-3xl font-black tracking-tight">
          {mockAutomationRule.name}
        </h2>
        <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Rule label="최대 변경폭" value="5%" />
          <Rule
            label="키워드별 일 변경"
            value={`${mockAutomationRule.maxDailyChangesPerKeyword}회`}
          />
          <Rule
            label="최대 CPC"
            value={`${mockAutomationRule.maxCpc.toLocaleString()}원`}
          />
          <Rule
            label="월 예산 상한"
            value={`${mockAutomationRule.monthlyBudgetLimit.toLocaleString()}원`}
          />
        </div>
      </section>
    </AppShell>
  );
}

function Rule({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl bg-[#fff8ec] p-5">
      <p className="text-xs font-black text-[#69727c]">{label}</p>
      <p className="mt-2 text-xl font-black">{value}</p>
    </div>
  );
}
