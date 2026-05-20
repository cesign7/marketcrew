export function PositionEfficiencyPanel() {
  return (
    <section className="rounded-[28px] border border-[#eadfc8] bg-[#12302d] p-5 text-white shadow-sm">
      <h2 className="text-lg font-black">1위 vs 2~3위 효율 비교</h2>
      <p className="mt-2 text-sm font-semibold leading-6 text-[#b9d9d2]">
        초기 MVP는 최근 90일 성과와 명절 D-day 기준 전년 동기간 데이터를
        비교해 키워드별 목표 순위를 제안합니다.
      </p>
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        <div className="rounded-3xl bg-white/10 p-4">
          <p className="text-sm font-black text-[#ffd28a]">1위 방어</p>
          <p className="mt-2 text-xs font-semibold leading-5 text-[#d9ebe7]">
            노출과 매출은 높지만 CPC가 급등하면 공헌이익이 낮아질 수
            있습니다.
          </p>
        </div>
        <div className="rounded-3xl bg-white/10 p-4">
          <p className="text-sm font-black text-[#8ee0d2]">2~3위 유지</p>
          <p className="mt-2 text-xs font-semibold leading-5 text-[#d9ebe7]">
            클릭수는 줄어도 광고비가 낮아져 실제 이익이 더 좋아질 수
            있습니다.
          </p>
        </div>
      </div>
    </section>
  );
}
