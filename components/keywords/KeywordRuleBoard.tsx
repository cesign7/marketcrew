import { KeywordRuleCard } from "@/components/keywords/KeywordRuleCard";
import { PositionEfficiencyPanel } from "@/components/keywords/PositionEfficiencyPanel";
import type { KeywordRule } from "@/lib/domain/keywords";
import { getKeywordRuleSummary } from "@/lib/domain/operations";

export function KeywordRuleBoard({ rules }: { rules: KeywordRule[] }) {
  const summary = getKeywordRuleSummary(rules);

  if (rules.length === 0) {
    return (
      <div className="rounded-[28px] border border-[#eadfc8] bg-white p-8 text-center">
        <p className="text-lg font-black">아직 저장된 키워드 룰이 없습니다.</p>
        <p className="mt-2 text-sm font-semibold text-[#69727c]">
          seed 데이터 또는 검색광고 dry-run 분석 결과로 초기 룰을 만들 수 있습니다.
        </p>
      </div>
    );
  }

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
