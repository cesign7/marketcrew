import type { AgentKey, AgentReport } from "@/lib/domain/agents";
import type {
  ActionType,
  ProposalStatus,
  RiskLevel,
} from "@/lib/domain/approvals";
import type { PerformanceQualityResult } from "@/lib/domain/performance-quality";

export interface KeywordDiagnosticMetric {
  keywordId: string;
  keyword: string;
  campaignId: string;
  adgroupId: string;
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  conversionSales: number;
  avgRank: number;
  avgCpc: number;
}

export interface DiagnosticReportInput {
  agentKey: AgentKey;
  summary: string;
  status: AgentReport["status"];
  mood: AgentReport["mood"];
  relatedProposalTitles: string[];
}

export interface DiagnosticProposalInput {
  agentKey: AgentKey;
  actionType: ActionType;
  riskLevel: RiskLevel;
  title: string;
  reason: string;
  expectedImpact: string;
  beforeJson: {
    label: string;
    keywordId: string;
    avgRank?: number;
    cost?: number;
    conversions?: number;
  };
  afterJson: {
    label: string;
    ruleType?: string;
    targetPositionType?: string;
  };
  status: ProposalStatus;
}

export interface KeywordDiagnosticsInput {
  quality: PerformanceQualityResult;
  keywords: KeywordDiagnosticMetric[];
}

export function analyzeKeywordDiagnostics({
  quality,
  keywords,
}: KeywordDiagnosticsInput) {
  if (!quality.canDiagnose || quality.status !== "READY") {
    return {
      reports: [
        report(
          "GENERAL_MANAGER",
          `${quality.title}: ${quality.detail} 다음 작업은 "${quality.nextAction}"입니다.`,
          "NEEDS_ATTENTION",
          "focused",
        ),
        report(
          "KEYWORD_STRATEGIST",
          "성과 데이터가 충분하지 않아 키워드 제안 생성을 멈췄습니다. 잘못된 자동 제안을 만들지 않겠습니다.",
          "NEEDS_ATTENTION",
          "worried",
        ),
      ],
      proposals: [],
    };
  }

  const proposals = [
    ...brandDefenseProposals(keywords),
    ...efficientRankProposals(keywords),
    ...negativeKeywordProposals(keywords),
  ].slice(0, 8);

  const proposalTitles = proposals.map((proposal) => proposal.title);
  const reports: DiagnosticReportInput[] = [
    report(
      "GENERAL_MANAGER",
      `AI 진단 완료: ${keywords.length.toLocaleString()}개 키워드를 점검했고 ${proposals.length.toLocaleString()}개 승인 후보를 만들었습니다.`,
      proposals.length > 0 ? "NEEDS_ATTENTION" : "DONE",
      "focused",
      proposalTitles,
    ),
    report(
      "POSITION_DEFENDER",
      `브랜드/핵심 키워드 1위 방어 후보 ${proposals.filter((proposal) => proposal.agentKey === "POSITION_DEFENDER").length.toLocaleString()}개를 확인했습니다.`,
      "DONE",
      "focused",
      proposalTitles,
    ),
    report(
      "BID_OPTIMIZER",
      `2~3위 유지가 효율적인 후보 ${proposals.filter((proposal) => proposal.agentKey === "BID_OPTIMIZER").length.toLocaleString()}개를 확인했습니다.`,
      "DONE",
      "calm",
      proposalTitles,
    ),
    report(
      "KEYWORD_STRATEGIST",
      `제외 키워드 후보 ${proposals.filter((proposal) => proposal.actionType === "NEGATIVE_KEYWORD").length.toLocaleString()}개를 확인했습니다.`,
      proposals.some((proposal) => proposal.actionType === "NEGATIVE_KEYWORD")
        ? "NEEDS_ATTENTION"
        : "DONE",
      "excited",
      proposalTitles,
    ),
  ];

  return { reports, proposals };
}

function brandDefenseProposals(
  keywords: KeywordDiagnosticMetric[],
): DiagnosticProposalInput[] {
  return keywords
    .filter((item) => isBrandKeyword(item.keyword) && item.avgRank > 1.3)
    .map((item) => ({
      agentKey: "POSITION_DEFENDER",
      actionType: "KEYWORD_RULE_CHANGE",
      riskLevel: "MEDIUM",
      title: `'${item.keyword}' 1위 방어 후보`,
      reason: `브랜드 키워드인데 평균 순위가 ${item.avgRank.toFixed(1)}위라 1위 방어 룰 후보로 올립니다.`,
      expectedImpact: "브랜드 검색 유입을 경쟁사보다 먼저 확보할 가능성이 높아집니다.",
      beforeJson: {
        label: `${item.avgRank.toFixed(1)}위`,
        keywordId: item.keywordId,
        avgRank: item.avgRank,
      },
      afterJson: {
        label: "1위 방어",
        ruleType: "TOP_1_DEFENSE",
        targetPositionType: "TOP_1",
      },
      status: "NEEDS_APPROVAL",
    }));
}

function efficientRankProposals(
  keywords: KeywordDiagnosticMetric[],
): DiagnosticProposalInput[] {
  return keywords
    .filter(
      (item) =>
        !isBrandKeyword(item.keyword) &&
        item.avgRank >= 1.8 &&
        item.avgRank <= 3.5 &&
        item.conversions > 0 &&
        roas(item) >= 250,
    )
    .map((item) => ({
      agentKey: "BID_OPTIMIZER",
      actionType: "KEYWORD_RULE_CHANGE",
      riskLevel: "LOW",
      title: `'${item.keyword}' 2~3위 유지 후보`,
      reason: `평균 ${item.avgRank.toFixed(1)}위에서 전환 ${item.conversions.toLocaleString()}건과 ROAS ${Math.round(roas(item)).toLocaleString()}%가 확인됐습니다.`,
      expectedImpact: "무리한 1위 경쟁 없이 효율 구간을 유지하는 룰 후보입니다.",
      beforeJson: {
        label: `${item.avgRank.toFixed(1)}위 / ROAS ${Math.round(roas(item))}%`,
        keywordId: item.keywordId,
        avgRank: item.avgRank,
      },
      afterJson: {
        label: "2~3위 유지",
        ruleType: "TOP_2_TO_3_OPTIMIZE",
        targetPositionType: "TOP_2_TO_3",
      },
      status: "NEEDS_APPROVAL",
    }));
}

function negativeKeywordProposals(
  keywords: KeywordDiagnosticMetric[],
): DiagnosticProposalInput[] {
  return keywords
    .filter((item) => item.clicks >= 20 && item.conversions === 0 && item.cost >= 10_000)
    .map((item) => ({
      agentKey: "KEYWORD_STRATEGIST",
      actionType: "NEGATIVE_KEYWORD",
      riskLevel: "MEDIUM",
      title: `'${item.keyword}' 제외 키워드 후보`,
      reason: `클릭 ${item.clicks.toLocaleString()}회, 광고비 ${item.cost.toLocaleString()}원인데 전환이 없습니다.`,
      expectedImpact: "불필요한 클릭 비용을 줄일 수 있습니다.",
      beforeJson: {
        label: `비용 ${item.cost.toLocaleString()}원 / 전환 0건`,
        keywordId: item.keywordId,
        cost: item.cost,
        conversions: item.conversions,
      },
      afterJson: {
        label: "제외 후보",
        ruleType: "NEGATIVE_CANDIDATE",
        targetPositionType: "EXCLUDE",
      },
      status: "NEEDS_APPROVAL",
    }));
}

function report(
  agentKey: AgentKey,
  summary: string,
  status: AgentReport["status"],
  mood: AgentReport["mood"],
  relatedProposalTitles: string[] = [],
): DiagnosticReportInput {
  return {
    agentKey,
    summary,
    status,
    mood,
    relatedProposalTitles,
  };
}

function isBrandKeyword(keyword: string) {
  const normalized = keyword.toLowerCase();
  return (
    normalized.includes("커피프린트") ||
    normalized.includes("coffeeprint") ||
    normalized.includes("스티커씨") ||
    normalized.includes("stickersee")
  );
}

function roas(item: KeywordDiagnosticMetric) {
  if (item.cost <= 0) {
    return 0;
  }

  return (item.conversionSales / item.cost) * 100;
}
