import type { KeywordRule } from "@/lib/domain/keywords";

export function KeywordRuleCard({ rule }: { rule: KeywordRule }) {
  return (
    <article className="rounded-[28px] border border-[#eadfc8] bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black text-[#0e8f81]">
            {rule.brandKey === "COFFEEPRINT" ? "커피프린트" : "스티커씨"}
          </p>
          <h2 className="mt-1 text-xl font-black tracking-tight">
            {rule.keyword}
          </h2>
        </div>
        <span className="rounded-full bg-[#fff3d6] px-3 py-1 text-xs font-black text-[#8a5b00]">
          {rule.targetPositionLabel}
        </span>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-3">
        <Stat label="평균 순위" value={rule.currentAvgRank.toFixed(1)} />
        <Stat label="현재 CPC" value={`${rule.currentAvgCpc.toLocaleString()}원`} />
        <Stat label="최대 CPC" value={`${rule.maxCpc.toLocaleString()}원`} />
      </div>
      <p className="mt-4 text-sm font-semibold leading-6 text-[#69727c]">
        {rule.reason}
      </p>
      <div className="mt-4 h-2 rounded-full bg-[#f0e5d0]">
        <div
          className="h-2 rounded-full bg-[#0e8f81]"
          style={{ width: `${Math.round(rule.confidence * 100)}%` }}
        />
      </div>
      <p className="mt-2 text-xs font-bold text-[#7b8791]">
        신뢰도 {Math.round(rule.confidence * 100)}%
      </p>
    </article>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-[#fff8ec] p-3">
      <p className="text-[11px] font-black text-[#7b8791]">{label}</p>
      <p className="mt-1 text-sm font-black">{value}</p>
    </div>
  );
}
