import { CalendarClock, Database, History, Layers3, RefreshCcw, ShieldCheck } from "lucide-react";
import type { ProviderDataContractView, ProviderSyncEvidenceView } from "@/features/agenda-room/types";
import { getProviderHistoryPolicy } from "@/lib/domain";

type ProviderCollectionPolicyPanelProps = {
  contracts: ProviderDataContractView[];
  periodLabel: string;
  periodPolicyLabel: string;
  reports: ProviderSyncEvidenceView[];
};

export function ProviderCollectionPolicyPanel({
  contracts,
  periodLabel,
  periodPolicyLabel,
  reports,
}: ProviderCollectionPolicyPanelProps) {
  const policies = buildUniquePolicies(reports, contracts);

  if (policies.length === 0) {
    return null;
  }

  return (
    <section className="collection-policy-section" aria-labelledby="collection-policy-title">
      <div className="section-heading compact">
        <div>
          <span className="eyebrow">수집 설계</span>
          <h2 id="collection-policy-title">조회 한계와 저장 기준</h2>
          <p>{periodLabel} 화면은 API에서 다시 가져올 수 있는 기간과 이미 저장한 일별 스냅샷을 구분해서 판단합니다.</p>
        </div>
      </div>

      <div className="policy-principle-row" aria-label="데이터 운영 기준">
        <span>
          <Database size={16} aria-hidden="true" />
          원천 행 제외
        </span>
        <span>
          <CalendarClock size={16} aria-hidden="true" />
          일별 집계 저장
        </span>
        <span>
          <History size={16} aria-hidden="true" />
          백필은 분할 실행
        </span>
        <span>
          <ShieldCheck size={16} aria-hidden="true" />
          AI 입력은 요약만
        </span>
      </div>

      <p className="policy-period-note">{periodPolicyLabel}</p>

      <CollectionScheduleBoard />

      <div className="collection-policy-grid">
        {policies.map((policy) => (
          <article className="collection-policy-card" key={policy.providerKey}>
            <header>
              <span>{policy.providerLabel}</span>
              <strong>{policy.historyPolicy.apiLimitLabel}</strong>
            </header>
            <dl>
              <div>
                <dt>자동</dt>
                <dd>{policy.historyPolicy.baseScheduleLabel}</dd>
              </div>
              <div>
                <dt>강화</dt>
                <dd>{policy.historyPolicy.intensiveScheduleLabel}</dd>
              </div>
              <div>
                <dt>수동</dt>
                <dd>{policy.historyPolicy.manualRefreshLabel}</dd>
              </div>
              <div>
                <dt>중복</dt>
                <dd>{policy.historyPolicy.dedupeKeyLabel}</dd>
              </div>
              <div>
                <dt>저장</dt>
                <dd>{policy.historyPolicy.storageLabel}</dd>
              </div>
            </dl>
          </article>
        ))}
      </div>
    </section>
  );
}

const scheduleOperatingRules = [
  {
    icon: <CalendarClock size={16} aria-hidden="true" />,
    title: "자동 스케줄",
    body: "매일 07:00대 기본 수집으로 빠짐없이 기준 스냅샷을 쌓습니다. 실패해도 수집 이력은 남겨 다음 안건에서 근거 부족으로 표시합니다.",
  },
  {
    icon: <RefreshCcw size={16} aria-hidden="true" />,
    title: "수동 연동 수집",
    body: "광고·상품·CRM 변경 직후, 결재 직전, 이상 신호 확인 시 즉시 갱신합니다. 자동 수집을 대체하지 않고 최신 근거를 보강합니다.",
  },
  {
    icon: <Layers3 size={16} aria-hidden="true" />,
    title: "중복 방지",
    body: "같은 채널/브랜드/날짜/기간/시즌 이벤트는 최신 스냅샷으로 덮어쓰고, 실행 이력과 실패 사유만 별도 누적합니다.",
  },
  {
    icon: <ShieldCheck size={16} aria-hidden="true" />,
    title: "결재 전 최신성",
    body: "광고·주문 근거는 2시간 이내를 권장하고 24시간을 넘기면 결재 전에 수동 갱신을 요구합니다. AI에는 요약만 전달합니다.",
  },
];

const scheduleSlots = [
  {
    time: "07:00",
    title: "전체 채널 기본 수집",
    detail: "키워드광고, 데이터랩, 스마트스토어, 커피프린트 집계의 당일 기준선을 만듭니다.",
  },
  {
    time: "07:05 / 15:05",
    title: "광고 집행 중 2회",
    detail: "네이버 키워드광고와 시즌 키워드 수요만 추가 점검합니다. 광고 변경 직후에는 수동 갱신을 우선합니다.",
  },
  {
    time: "시즌 D-30",
    title: "시즌 강화 수집",
    detail: "음력 명절은 연도별 양력 환산일 기준으로 주문, 광고, 검색 추이를 같은 D-기간끼리 비교합니다.",
  },
  {
    time: "결재 직전",
    title: "수동 최신 근거",
    detail: "대표 결재 화면에서 근거가 오래됐거나 방금 변경한 캠페인이 있으면 즉시 수집 후 판단합니다.",
  },
];

function CollectionScheduleBoard() {
  return (
    <div className="collection-schedule-board" aria-label="추천 수집 주기와 중복 방지 기준">
      <div className="collection-schedule-rule-grid">
        {scheduleOperatingRules.map((rule) => (
          <article className="collection-schedule-rule" key={rule.title}>
            <span>{rule.icon}</span>
            <div>
              <strong>{rule.title}</strong>
              <p>{rule.body}</p>
            </div>
          </article>
        ))}
      </div>

      <div className="collection-schedule-timeline">
        <header>
          <span>추천 수집 주기</span>
          <strong>자동 기준선 + 필요할 때 수동 최신화</strong>
        </header>
        <ol>
          {scheduleSlots.map((slot) => (
            <li key={`${slot.time}-${slot.title}`}>
              <time>{slot.time}</time>
              <div>
                <strong>{slot.title}</strong>
                <p>{slot.detail}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

function buildUniquePolicies(reports: ProviderSyncEvidenceView[], contracts: ProviderDataContractView[]) {
  const policiesByProvider = new Map<
    ProviderSyncEvidenceView["providerKey"],
    Pick<ProviderSyncEvidenceView, "providerKey" | "providerLabel" | "historyPolicy">
  >();

  for (const contract of contracts) {
    if (!policiesByProvider.has(contract.providerKey)) {
      policiesByProvider.set(contract.providerKey, {
        providerKey: contract.providerKey,
        providerLabel: contract.providerLabel,
        historyPolicy: getProviderHistoryPolicy(contract.providerKey),
      });
    }
  }

  for (const report of reports) {
    policiesByProvider.set(report.providerKey, {
      providerKey: report.providerKey,
      providerLabel: report.providerLabel,
      historyPolicy: report.historyPolicy,
    });
  }

  const providerOrder: ProviderSyncEvidenceView["providerKey"][] = ["search_ad", "datalab", "smartstore", "shop"];

  return providerOrder
    .map((provider) => policiesByProvider.get(provider))
    .filter((policy): policy is Pick<ProviderSyncEvidenceView, "providerKey" | "providerLabel" | "historyPolicy"> =>
      Boolean(policy),
    );
}
