import { MarketingShell } from "@/components/layout/MarketingShell";
import { RuleCriteriaEditor } from "@/components/search-ad/RuleCriteriaEditor";
import { RuleRebuildPanel } from "@/components/search-ad/RuleRebuildPanel";
import { RULE_CATEGORY_GUIDES, RULE_EXECUTION_GUIDE_ITEMS, RULE_PERIOD_GUIDE_ITEMS } from "@/features/search-ad/domain/ruleCriteriaGuides";
import { API_AND_REPORT_CHECK_GUIDE_ITEMS, BRAND_OPERATION_GUIDE_ITEMS } from "@/features/search-ad/domain/targetSettings";
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
            <h2>실행 안전장치</h2>
            <p>규칙 결과는 바로 외부 광고를 바꾸지 않고, 미리보기와 게이트를 거쳐 실행 이력으로 남깁니다.</p>
          </div>
          <div className="rule-period-grid">
            {RULE_EXECUTION_GUIDE_ITEMS.map((item) => (
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
            <h2>API와 보고서 비교</h2>
            <p>운영시간, 기기, 타게팅 질문은 네이버 설정값과 실제 보고서 성과를 함께 확인합니다.</p>
          </div>
          <div className="rule-period-grid">
            {API_AND_REPORT_CHECK_GUIDE_ITEMS.map((item) => (
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
            <h2>운영시간 기준</h2>
            <p>확정된 운영 기준은 API 타게팅 설정과 보고서 성과를 비교할 때 사용합니다.</p>
          </div>
          <div className="rule-period-grid">
            {BRAND_OPERATION_GUIDE_ITEMS.map((item) => (
              <article key={item.brandKey}>
                <span>{item.title}</span>
                <strong>{item.value}</strong>
                <p>{item.description}</p>
              </article>
            ))}
          </div>
        </div>
        <div className="content-panel">
          <div className="section-heading">
            <h2>브랜드별 기준</h2>
            <p>브랜드와 광고유형별 최소 데이터가 쌓인 항목만 판단합니다. 저장한 값은 다음 규칙 재계산부터 적용됩니다.</p>
          </div>
          <RuleCriteriaEditor criteria={criteria} />
        </div>
      </section>
    </MarketingShell>
  );
}
