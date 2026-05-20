import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../app/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is required to seed the database.");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function main() {
  await resetDatabase();

  const [coffeeprintYoungcart, stickerseeSmartStore] = await Promise.all([
    prisma.store.create({
      data: {
        name: "커피프린트 영카트",
        type: "YOUNGCART",
        brandKey: "COFFEEPRINT",
      },
    }),
    prisma.store.create({
      data: {
        name: "스티커씨 스마트스토어",
        type: "NAVER_SMARTSTORE",
        brandKey: "STICKERSEE",
      },
    }),
    prisma.store.create({
      data: {
        name: "커피프린트 스마트스토어",
        type: "NAVER_SMARTSTORE",
        brandKey: "COFFEEPRINT",
        status: "PAUSED",
      },
    }),
  ]);

  const searchAdAccount = await prisma.marketingAccount.create({
    data: {
      provider: "NAVER_SEARCH_AD",
      customerId: "shared-naver-search-ad",
      alias: "커피프린트/스티커씨 통합 검색광고 계정",
    },
  });

  await prisma.adCampaignSnapshot.createMany({
    data: [
      {
        accountId: searchAdAccount.id,
        campaignId: "camp-mvp-001",
        campaignName: "커피프린트 검색광고",
        brandKey: "COFFEEPRINT",
        collectedAt: new Date("2026-05-20T00:00:00.000Z"),
        rawJson: { source: "seed" },
      },
      {
        accountId: searchAdAccount.id,
        campaignId: "camp-mvp-002",
        campaignName: "스티커씨 검색광고",
        brandKey: "STICKERSEE",
        collectedAt: new Date("2026-05-20T00:00:00.000Z"),
        rawJson: { source: "seed" },
      },
    ],
  });

  await prisma.adAdgroupSnapshot.createMany({
    data: [
      {
        accountId: searchAdAccount.id,
        campaignId: "camp-mvp-001",
        adgroupId: "adgroup-mvp-001",
        adgroupName: "커피프린트 핵심 키워드",
        brandKey: "COFFEEPRINT",
        collectedAt: new Date("2026-05-20T00:00:00.000Z"),
        rawJson: { source: "seed" },
      },
      {
        accountId: searchAdAccount.id,
        campaignId: "camp-mvp-002",
        adgroupId: "adgroup-mvp-002",
        adgroupName: "스티커씨 핵심 키워드",
        brandKey: "STICKERSEE",
        collectedAt: new Date("2026-05-20T00:00:00.000Z"),
        rawJson: { source: "seed" },
      },
    ],
  });

  await prisma.productMaster.createMany({
    data: [
      {
        brandKey: "COFFEEPRINT",
        canonicalName: "기업 초대장",
        productGroup: "INVITATION",
        seasonTags: ["연중", "행사", "법인"],
      },
      {
        brandKey: "COFFEEPRINT",
        canonicalName: "추석 감사카드",
        productGroup: "SEASONAL_CARD",
        seasonTags: ["추석", "명절", "선물"],
      },
      {
        brandKey: "STICKERSEE",
        canonicalName: "맞춤 스티커",
        productGroup: "CUSTOM_STICKER",
        seasonTags: ["연중", "어린이집", "답례품"],
      },
    ],
  });

  await prisma.storeProduct.createMany({
    data: [
      {
        storeId: coffeeprintYoungcart.id,
        externalProductId: "yc-invitation-corp",
        productName: "기업 초대장 제작",
        category: "초대장",
        salePrice: 180000,
      },
      {
        storeId: coffeeprintYoungcart.id,
        externalProductId: "yc-chuseok-card",
        productName: "추석 감사카드 제작",
        category: "시즌카드",
        salePrice: 220000,
      },
      {
        storeId: stickerseeSmartStore.id,
        externalProductId: "ss-custom-sticker",
        productName: "스티커씨 맞춤 스티커",
        category: "스티커",
        salePrice: 15000,
      },
    ],
  });

  await prisma.automationRule.create({
    data: {
      name: "저위험 입찰 조정",
      enabled: true,
      maxBidChangeRate: 0.05,
      maxDailyChangesPerKeyword: 2,
      maxCpc: 850,
      monthlyBudgetLimit: 1_000_000,
      requiresApprovalAboveRisk: "LOW",
    },
  });

  await prisma.actionProposal.createMany({
    data: [
      {
        agentKey: "POSITION_DEFENDER",
        actionType: "KEYWORD_RULE_CHANGE",
        riskLevel: "MEDIUM",
        title: "'기업 초대장' 목표 순위를 2~3위 유지로 변경",
        reason:
          "최근 90일 기준 1위 구간보다 2~3위 구간의 광고비 대비 효율이 더 높습니다.",
        expectedImpact: "광고비를 줄이면서 공헌이익률을 개선할 가능성이 있습니다.",
        beforeJson: { label: "1위 방어" },
        afterJson: { label: "2~3위 유지" },
        status: "NEEDS_APPROVAL",
        createdAt: new Date("2026-05-20T00:20:00.000Z"),
      },
      {
        agentKey: "BID_OPTIMIZER",
        actionType: "BID_ADJUSTMENT",
        riskLevel: "LOW",
        title: "'무료 초대장 양식' 입찰가 5% 하향",
        reason: "클릭은 발생하지만 구매 의도와 전환 기여가 낮습니다.",
        expectedImpact: "불필요한 클릭 비용을 줄입니다.",
        beforeJson: { label: "420원" },
        afterJson: { label: "399원" },
        status: "AUTO_EXECUTED",
        createdAt: new Date("2026-05-20T00:25:00.000Z"),
      },
      {
        agentKey: "AD_COPYWRITER",
        actionType: "AD_COPY_CHANGE",
        riskLevel: "MEDIUM",
        title: "커피프린트 연하장 광고문안 A/B 테스트",
        reason: "연하장 시즌 진입 전 법인 고객 문안을 분리할 필요가 있습니다.",
        expectedImpact: "CTR과 전환율 개선 가능성을 검증합니다.",
        beforeJson: { label: "기존 문안" },
        afterJson: { label: "법인 연하장 제작 강조 문안" },
        status: "NEEDS_APPROVAL",
        createdAt: new Date("2026-05-20T00:35:00.000Z"),
      },
      {
        agentKey: "MARGIN_ANALYST",
        actionType: "BID_ADJUSTMENT",
        riskLevel: "HIGH",
        title: "추석 감사카드 키워드 입찰 상향 보류",
        reason: "원가 계산식 연결 전에는 자동 상향 기준을 확정할 수 없습니다.",
        expectedImpact: "마진이 낮은 키워드에 광고비가 과투입되는 위험을 줄입니다.",
        beforeJson: { label: "입찰 상향 후보" },
        afterJson: { label: "마진 계산 후 재검토" },
        status: "HELD",
        createdAt: new Date("2026-05-20T00:40:00.000Z"),
      },
    ],
  });

  await prisma.keywordRule.createMany({
    data: [
      {
        brandKey: "COFFEEPRINT",
        keyword: "커피프린트",
        ruleType: "BRAND_DEFENSE",
        targetPositionType: "TOP_1",
        maxCpc: 600,
        reason: "브랜드 검색어는 경쟁 유입 방어가 중요합니다.",
        confidence: 0.91,
        status: "ACTIVE",
      },
      {
        brandKey: "COFFEEPRINT",
        keyword: "기업 초대장",
        ruleType: "TOP_2_TO_3_OPTIMIZE",
        targetPositionType: "TOP_2_TO_3",
        maxCpc: 850,
        reason: "1위 구간보다 2~3위 구간의 효율이 더 좋습니다.",
        confidence: 0.76,
        status: "ACTIVE",
      },
      {
        brandKey: "STICKERSEE",
        keyword: "스티커씨",
        ruleType: "TOP_1_DEFENSE",
        targetPositionType: "TOP_1",
        maxCpc: 550,
        reason: "브랜드와 직접 연결되는 검색어입니다.",
        confidence: 0.88,
        status: "ACTIVE",
      },
      {
        brandKey: "COFFEEPRINT",
        keyword: "추석 감사카드",
        ruleType: "SEASONAL_TOP_TEST",
        targetPositionType: "TEST",
        maxCpc: 980,
        reason: "추석 날짜가 매년 바뀌므로 D-day 기준 시즌 테스트가 필요합니다.",
        confidence: 0.69,
        status: "DRAFT",
      },
      {
        brandKey: "COFFEEPRINT",
        keyword: "무료 초대장 양식",
        ruleType: "NEGATIVE_CANDIDATE",
        targetPositionType: "EXCLUDE",
        maxCpc: 0,
        reason: "구매 의도가 낮아 광고비 낭비 가능성이 큽니다.",
        confidence: 0.73,
        status: "DRAFT",
      },
    ],
  });

  await prisma.adKeywordSnapshot.createMany({
    data: [
      keywordSnapshot(searchAdAccount.id, "kw-coffeeprint", "커피프린트", 210, 1.1),
      keywordSnapshot(searchAdAccount.id, "kw-corp-invite", "기업 초대장", 720, 2.4),
      keywordSnapshot(searchAdAccount.id, "kw-stickersee", "스티커씨", 180, 1.3),
      keywordSnapshot(searchAdAccount.id, "kw-chuseok-card", "추석 감사카드", 690, 3.1),
      keywordSnapshot(searchAdAccount.id, "kw-free-template", "무료 초대장 양식", 420, 2.7),
    ],
  });

  await prisma.adKeywordDailyPerformance.createMany({
    data: [
      keywordPerformance(searchAdAccount.id, "kw-coffeeprint", "커피프린트", 210, 1.1),
      keywordPerformance(searchAdAccount.id, "kw-corp-invite", "기업 초대장", 720, 2.4),
      keywordPerformance(searchAdAccount.id, "kw-stickersee", "스티커씨", 180, 1.3),
      keywordPerformance(searchAdAccount.id, "kw-chuseok-card", "추석 감사카드", 690, 3.1),
      keywordPerformance(searchAdAccount.id, "kw-free-template", "무료 초대장 양식", 420, 2.7),
    ],
  });

  await prisma.agentReport.createMany({
    data: [
      {
        agentKey: "POSITION_DEFENDER",
        reportType: "DAILY_STATUS",
        summary:
          "'기업 초대장'은 1위보다 2~3위권에서 공헌이익이 더 좋아 보입니다.",
        detailJson: {
          characterName: "루키",
          roleName: "순위 방어 AI",
          status: "NEEDS_ATTENTION",
          mood: "focused",
          relatedProposalIds: [],
        },
        createdAt: new Date("2026-05-20T00:00:00.000Z"),
      },
      {
        agentKey: "BID_OPTIMIZER",
        reportType: "DAILY_STATUS",
        summary: "저위험 키워드 3개는 5% 이내 하향 조정 후보입니다.",
        detailJson: {
          characterName: "비디",
          roleName: "입찰 최적화 AI",
          status: "DONE",
          mood: "calm",
          relatedProposalIds: [],
        },
        createdAt: new Date("2026-05-20T00:10:00.000Z"),
      },
      {
        agentKey: "MARGIN_ANALYST",
        reportType: "DAILY_STATUS",
        summary:
          "추석 카드 일부 키워드는 광고 후 마진율 계산 전까지 자동 상향을 보류해야 합니다.",
        detailJson: {
          characterName: "마루",
          roleName: "마진 분석 AI",
          status: "NEEDS_ATTENTION",
          mood: "worried",
          relatedProposalIds: [],
        },
        createdAt: new Date("2026-05-20T00:15:00.000Z"),
      },
    ],
  });
}

async function resetDatabase() {
  await prisma.actionExecution.deleteMany();
  await prisma.actionProposal.deleteMany();
  await prisma.agentReport.deleteMany();
  await prisma.keywordRule.deleteMany();
  await prisma.adKeywordDailyPerformance.deleteMany();
  await prisma.adKeywordSnapshot.deleteMany();
  await prisma.adAdgroupSnapshot.deleteMany();
  await prisma.adCampaignSnapshot.deleteMany();
  await prisma.automationRule.deleteMany();
  await prisma.integrationSyncRun.deleteMany();
  await prisma.marketingAccount.deleteMany();
  await prisma.costFormula.deleteMany();
  await prisma.productMapping.deleteMany();
  await prisma.storeProduct.deleteMany();
  await prisma.productMaster.deleteMany();
  await prisma.store.deleteMany();
}

function keywordSnapshot(
  accountId: string,
  keywordId: string,
  keyword: string,
  avgCpc: number,
  avgRank: number,
) {
  return {
    accountId,
    campaignId: "camp-mvp-001",
    adgroupId: "adgroup-mvp-001",
    keywordId,
    keyword,
    bidAmount: Math.round(avgCpc * 1.1),
    impressions: 1000,
    clicks: 80,
    cost: avgCpc * 80,
    ctr: 0.08,
    avgCpc,
    conversions: 4,
    conversionSales: 300000,
    avgRank,
    collectedDate: new Date("2026-05-20T00:00:00.000Z"),
    rawJson: {
      source: "seed",
      note: "네이버 검색광고 dry-run 연결 전 초기 화면 검증용 데이터",
    },
  };
}

function keywordPerformance(
  accountId: string,
  keywordId: string,
  keyword: string,
  avgCpc: number,
  avgRank: number,
) {
  return {
    accountId,
    campaignId: "camp-mvp-001",
    adgroupId: "adgroup-mvp-001",
    keywordId,
    keyword,
    date: new Date("2026-05-19T00:00:00.000Z"),
    impressions: 1000,
    clicks: 80,
    cost: avgCpc * 80,
    ctr: 0.08,
    avgCpc,
    conversions: 4,
    conversionRate: 0.05,
    conversionSales: 300000,
    roas: 300000 / (avgCpc * 80),
    costPerConversion: (avgCpc * 80) / 4,
    avgRank,
    rawJson: {
      source: "seed",
      note: "검색광고 성과 저장 화면 검증용 데이터",
    },
  };
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
