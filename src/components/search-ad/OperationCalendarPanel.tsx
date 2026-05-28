import { getAdProductLabel, getBrandLabel } from "@/features/search-ad/domain/reportTypes";
import type { SearchAdOperationCalendarPreview } from "@/features/search-ad/domain/operationCalendar";
import type { SearchAdFilters } from "@/features/search-ad/domain/types";

type OperationCalendarPanelProps = {
  filters: SearchAdFilters;
  preview: SearchAdOperationCalendarPreview;
};

export function OperationCalendarPanel({ filters, preview }: OperationCalendarPanelProps) {
  const decisions = preview.decisions.filter((decision) => {
    const brandMatched = filters.brand === "all" || decision.brandKey === filters.brand;
    const adProductMatched = filters.adProduct === "all" || decision.adProductType === filters.adProduct;
    return brandMatched && adProductMatched;
  });
  const actionable = decisions.filter((decision) => decision.shouldCreatePreview);

  return (
    <div className="operation-calendar-panel">
      <div className="operation-calendar-status">
        <div>
          <span>자동 적용</span>
          <strong>{preview.automationEnabled ? "켜짐" : "모의 실행"}</strong>
          <p>{preview.automationEnabled ? "캘린더 판단을 실행 미리보기로 넘깁니다." : "실제 광고 변경 없이 판단만 보여줍니다."}</p>
        </div>
        <div>
          <span>실제 변경권한</span>
          <strong>{preview.writeEnabled ? "허용" : "차단"}</strong>
          <p>{preview.writeEnabled ? "네이버 광고 변경 요청을 보낼 수 있습니다." : "실행해도 네이버 광고에는 반영하지 않습니다."}</p>
        </div>
      </div>

      <div className="rule-period-grid">
        {preview.summaryCards.map((card) => (
          <article key={card.key}>
            <span>{card.label}</span>
            <strong>{card.value}</strong>
            <p>{card.helper}</p>
          </article>
        ))}
      </div>

      <div className="operation-policy-grid">
        {preview.policies.map((policy) => (
          <article key={policy.brandKey}>
            <div>
              <span>{policy.label}</span>
              <strong>{policy.mode === "always_on" ? "상시 운영" : "고정 운영시간"}</strong>
            </div>
            <p>{policy.summary}</p>
            <dl>
              <div>
                <dt>일요일</dt>
                <dd>{policy.sundayPolicy === "off" ? "자동 OFF 기준" : "운영 유지"}</dd>
              </div>
              <div>
                <dt>공휴일</dt>
                <dd>{policy.publicHolidayPolicy === "off" ? "자동 OFF 기준" : "운영 유지"}</dd>
              </div>
            </dl>
          </article>
        ))}
      </div>

      <div className="section-heading is-sub">
        <h3>오늘의 운영 판단</h3>
        <p>{actionable.length > 0 ? `${actionable.length.toLocaleString("ko-KR")}개 광고그룹이 미리보기 생성 대상입니다.` : "현재 필터에서는 자동 조치 대상이 없습니다."}</p>
      </div>
      <div className="table-wrap operation-calendar-table">
        <table>
          <thead>
            <tr>
              <th>브랜드</th>
              <th>광고유형</th>
              <th>광고그룹</th>
              <th>판단</th>
              <th>현재 상태</th>
              <th>이유</th>
            </tr>
          </thead>
          <tbody>
            {decisions.slice(0, 20).map((decision) => (
              <tr key={`${decision.targetId}-${decision.requestedAction}`}>
                <td>{decision.brandKey ? getBrandLabel(decision.brandKey) : "미지정"}</td>
                <td>{decision.adProductType ? getAdProductLabel(decision.adProductType) : "미지정"}</td>
                <td className="text-clip" title={decision.targetLabel}>
                  {decision.targetLabel}
                </td>
                <td>
                  <span className={`operation-action-badge is-${decision.requestedAction}`}>{decision.actionLabel}</span>
                </td>
                <td>{decision.currentUserLock === true ? "꺼짐" : decision.currentUserLock === false ? "켜짐" : "확인 필요"}</td>
                <td>{decision.reason}</td>
              </tr>
            ))}
            {decisions.length === 0 ? (
              <tr>
                <td colSpan={6}>현재 필터에 해당하는 광고그룹이 없습니다.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      {decisions.length > 20 ? <p className="operation-calendar-help">화면 속도를 위해 앞 20개만 표시합니다. 전체 판단은 API 응답에 포함됩니다.</p> : null}
    </div>
  );
}
