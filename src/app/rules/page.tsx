import { MarketingShell } from "@/components/layout/MarketingShell";
import { getAdProductLabel, getBrandLabel } from "@/features/search-ad/domain/reportTypes";
import { DEFAULT_SEARCH_AD_FILTERS } from "@/features/search-ad/domain/sampleData";
import { loadSearchAdRuleCriteria } from "@/features/search-ad/loadSearchAdViews";

export const dynamic = "force-dynamic";

export default async function RulesPage() {
  const criteria = await loadSearchAdRuleCriteria();

  return (
    <MarketingShell activePath="/rules" description="저효율, 무클릭, 우수 후보를 나누는 기준을 확인합니다." filters={DEFAULT_SEARCH_AD_FILTERS} title="성과 기준">
      <section className="page-stack">
        <div className="content-panel">
          <div className="section-heading">
            <h2>판정 방식</h2>
            <p>검색광고 판단은 LLM보다 먼저 아래 숫자 기준으로 재현 가능하게 계산합니다.</p>
          </div>
          <div className="settings-grid">
            <article>
              <span>최근 30일 기준</span>
              <strong>기본 판단</strong>
              <p>최소 노출, 클릭, 비용을 넘은 검색어만 저효율/우수 후보로 봅니다.</p>
            </article>
            <article>
              <span>최근 7일 급등</span>
              <strong>다음 모듈 후보</strong>
              <p>비용 급증이나 클릭 급증은 기간 비교 데이터가 쌓이면 별도 카드로 분리합니다.</p>
            </article>
            <article>
              <span>시즌 윈도우</span>
              <strong>보류</strong>
              <p>명절/시즌 판단은 검색광고 기준이 안정화된 뒤 LLM 제안 근거로 연결합니다.</p>
            </article>
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
