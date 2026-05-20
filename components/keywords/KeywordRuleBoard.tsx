import { KeywordRuleCard } from "@/components/keywords/KeywordRuleCard";
import { PositionEfficiencyPanel } from "@/components/keywords/PositionEfficiencyPanel";
import type { KeywordRule } from "@/lib/domain/keywords";
import { getKeywordRuleSummary } from "@/lib/domain/operations";

export function KeywordRuleBoard({ rules }: { rules: KeywordRule[] }) {
  const summary = getKeywordRuleSummary(rules);

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
      <section>
        <div className="mb-4 grid gap-3 md:grid-cols-5">
          <MiniMetric label="브랜드 방어" value={summary.brandDefense} />
          <MiniMetric label="1위 방어" value={summary.topDefense} />
          <MiniMetric label="2~3위" value={summary.topTwoToThree} />
          <MiniMetric label="시즌 테스트" value={summary.seasonalTests} />
          <MiniMetric label="제외 후보" value={summary.negativeCandidates} />
        </div>
        <div className="grid gap-4 2xl:grid-cols-2">
          {rules.map((rule) => (
            <KeywordRuleCard key={rule.id} rule={rule} />
          ))}
        </div>
      </section>
      <PositionEfficiencyPanel />
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-3xl border border-[#eadfc8] bg-white p-4">
      <p className="text-xs font-black text-[#69727c]">{label}</p>
      <p className="mt-1 text-2xl font-black text-[#12302d]">{value}</p>
    </div>
  );
}
