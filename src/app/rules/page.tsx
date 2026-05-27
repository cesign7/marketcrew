import { MarketingShell } from "@/components/layout/MarketingShell";
import { RuleRebuildPanel } from "@/components/search-ad/RuleRebuildPanel";
import { getAdProductLabel, getBrandLabel } from "@/features/search-ad/domain/reportTypes";
import { RULE_CATEGORY_GUIDES, RULE_PERIOD_GUIDE_ITEMS } from "@/features/search-ad/domain/ruleCriteriaGuides";
import { DEFAULT_SEARCH_AD_FILTERS } from "@/features/search-ad/domain/sampleData";
import { loadSearchAdRuleCriteria } from "@/features/search-ad/loadSearchAdViews";

export const dynamic = "force-dynamic";

export default async function RulesPage() {
  const criteria = await loadSearchAdRuleCriteria();

  return (
    <MarketingShell activePath="/rules" description="저효율, 무클릭, 우수 후보를 나누는 기준을 확인합니다." filters={DEFAULT_SEARCH_AD_FILTERS} title="성과 기준">
      <section className="page-stack">
        <div className="content-panel">
          <RuleRebuildPanel />
        </div>
        <div className="content-panel">
          <div className="section-heading">
            <h2>판정 방식</h2>
            <p>검색광고 판단은 LLM보다 먼저 아래 숫자 기준으로 재현 가능하게 계산합니다.</p>
          </div>
          <div className="rule-period-grid">
            {RULE_PERIOD_GUIDE_ITEMS.map((item) => (
              <article key={item.title}>
                <span>{item.title}</span>
                <strong>{item.value}</strong>
                <p>{item.description}</p>
              </article>
            ))}
          </div>
        </div>
        <div className="content-panel">
          <div className="section-heading">
            <h2>규칙 카드 해석</h2>
            <p>각 카드는 아래 조건 중 하나에 걸린 결과입니다. 실제 실행 전에는 연결 대상과 추적 상태를 다시 확인합니다.</p>
          </div>
          <div className="rule-guide-grid">
            {RULE_CATEGORY_GUIDES.map((guide) => (
              <article key={guide.category}>
                <div>
                  <span>{guide.title}</span>
                  <strong>{guide.when}</strong>
                </div>
                <dl>
                  <div>
                    <dt>필요 데이터</dt>
                    <dd>{guide.requiredData}</dd>
                  </div>
                  <div>
                    <dt>첫 조치</dt>
                    <dd>{guide.firstAction}</dd>
                  </div>
                  <div>
                    <dt>주의</dt>
                    <dd>{guide.caution}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        </div>
        <div className="content-panel">
          <div className="section-heading">
            <h2>브랜드별 기준</h2>
            <p>첫 버전은 조회 중심이며, 수정 기능은 다음 단계에서 붙입니다.</p>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>브랜드</th>
                  <th>광고유형</th>
                  <th>기간</th>
                  <th>최소 노출</th>
                  <th>최소 클릭</th>
                  <th>최소 비용</th>
                  <th>목표 CPA</th>
                  <th>목표 ROAS</th>
                </tr>
              </thead>
              <tbody>
                {criteria.map((item) => (
                  <tr key={item.id}>
                    <td>{getBrandLabel(item.brandKey)}</td>
                    <td>{getAdProductLabel(item.adProductType)}</td>
                    <td>{item.periodDays}일</td>
                    <td>{item.minImpressions.toLocaleString("ko-KR")}</td>
                    <td>{item.minClicks.toLocaleString("ko-KR")}</td>
                    <td>{item.minCost.toLocaleString("ko-KR")}원</td>
                    <td>{item.targetCpa === null ? "-" : `${item.targetCpa.toLocaleString("ko-KR")}원`}</td>
                    <td>{item.targetRoas === null ? "-" : `${item.targetRoas.toLocaleString("ko-KR")}%`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
