import { describe, expect, it } from "vitest";
import { buildAgendaRoomViewModel } from "../../src/features/agenda-room/buildAgendaRoomViewModel";
import { normalizeAgendaRoomViewModelCompatibility } from "../../src/features/agenda-room/loadAgendaRoomViewModel";
import type { AgentRun, AgentRunWorkflowLink, ProviderSyncReport } from "../../src/lib/domain";
import { createMemoryMarketingWorkflowRepository } from "../../src/lib/persistence/memory-repository";

describe("buildAgendaRoomViewModel", () => {
  it("결재함 버킷과 결재 미리보기를 샘플 workflow 결과에서 만든다", () => {
    const viewModel = buildAgendaRoomViewModel({ env: {} });

    expect(viewModel.moaReport.summary).toContain("대표 결재 대기 1건");
    expect(viewModel.inboxBuckets.map((bucket) => [bucket.id, bucket.count])).toEqual([
      ["TODAY_APPROVAL", 1],
      ["SEASONAL_KEYWORD_REVIEW", 2],
      ["TRACKING_OUTCOME", 3],
      ["WAITING_EVIDENCE", 2],
      ["AUTO_HOLD", 0],
      ["FAILED_EXECUTION", 1],
    ]);
    expect(viewModel.summary.waitingEvidence).toBe(2);
    expect(viewModel.evidenceRequestQueue.title).toBe("근거 요청 큐");
    expect(viewModel.evidenceRequestQueue.guardrailLabel).toContain("검증 전 결재 승격 차단");
    expect(viewModel.evidenceRequestQueue.items.map((item) => item.title)).toContain(
      "부처님오신날 선물카드 모바일 저녁 광고 가설",
    );
    expect(
      viewModel.evidenceRequestQueue.items.find((item) => item.id === "evidence-request-gro-mobile-evening-gift-card")
        ?.statusLabel,
    ).toBe("데이 확인 대기");
    expect(
      viewModel.evidenceRequestQueue.items.find((item) => item.id === "evidence-request-pro-stickersee-season-bundle")
        ?.promotionLabel,
    ).toBe("승격 가능");

    const readyPreview = viewModel.approvalPreviews.find((preview) => preview.statusLabel === "대표 승인 대기");
    expect(readyPreview).toBeDefined();
    expect(readyPreview?.beforeItems).toContain("키워드 없음");
    expect(readyPreview?.afterItems).toContain("일예산 30,000원");
    expect(readyPreview?.rollbackPlan).toContain("되돌립니다");
    expect(readyPreview?.secondaryActions).toContain("초안 확정");
    expect(readyPreview?.secondaryActions).not.toContain("초안만 승인");
    expect(readyPreview?.disabledReason).toBeUndefined();
    expect(readyPreview?.provenance.summaryLabel).toContain("근거 4개");
    expect(readyPreview?.provenance.evidenceLabels).toEqual(expect.arrayContaining([expect.stringContaining("키워드 수요")]));
    expect(readyPreview?.provenance.safetyLabels).toContain("원천 행 제외");

    const blockedPreview = viewModel.approvalPreviews.find((preview) => preview.statusLabel === "추가 근거 요청");
    expect(blockedPreview?.disabledReason).toContain("추가 근거 보강");

    expect(viewModel.ownerDecisionFlows[0]?.preflightStatusLabel).toBe("실행 전 점검 통과");
    expect(viewModel.ownerDecisionFlows[0]?.executionStateLabel).toBe("수동 처리 필요");
    expect(viewModel.ownerDecisionFlows[0]?.followUpTasks[0]).toContain("모아");
    expect(viewModel.providerReadiness.map((provider) => provider.id)).toEqual([
      "search_ad",
      "datalab",
      "smartstore",
      "shop",
      "llm",
    ]);
    expect(viewModel.providerDataContracts.map((contract) => contract.providerKey)).toEqual([
      "search_ad",
      "datalab",
      "smartstore",
      "shop",
    ]);
    expect(viewModel.providerDataContracts.find((contract) => contract.providerKey === "shop")?.stored.columns[0]?.key).toBe(
      "ShopAggregateSnapshot.brandKey",
    );
    expect(viewModel.providerEvidenceExpansionPlans.map((plan) => plan.title)).toEqual([
      "광고그룹 실제 설정",
      "기기·시간대·요일 성과",
      "스마트스토어 순매출과 클레임",
      "데이터랩 세그먼트",
      "스티커씨 스마트스토어 데이터솔루션",
      "커피프린트 스마트스토어 추가 준비",
    ]);
    expect(viewModel.providerReadiness.find((provider) => provider.id === "search_ad")?.canWriteLabel).toBe("쓰기 차단");
    expect(viewModel.plannerPreview.rawRowsLabel).toBe("원천 행 제외");
    expect(viewModel.plannerPreview.selectedAgendaIds[0]).toBe("approval-agenda-season-plan-buddha-gift-card");
    expect(viewModel.plannerPreview.audit.providerLabel).toBe("연동 규칙 기반");
    expect(viewModel.plannerPreview.audit.modelLabel).toBe("모델 규칙 기반 대체");
    expect(viewModel.plannerPreview.audit.billingLabel).toBe("과금 없음");
    expect(viewModel.plannerPreview.audit.sourceCountLabels).toContain("후보 2건");
    expect(viewModel.llmCostGovernance.statusLabel).toBe("실제 호출 차단");
    expect(viewModel.llmCostGovernance.gateChecks.find((check) => check.id === "rate-policy")?.tone).toBe("blocked");
    expect(viewModel.aiPilotInsight.statusLabel).toBe("저장된 판단 없음");
    expect(viewModel.aiPilotInsight.inputPolicyLabels).toContain("원천 행 제외");
  });

  it("저장된 실제 LLM 파일럿 판단을 운영 화면용 요약으로 보여준다", () => {
    const repository = createMemoryMarketingWorkflowRepository();
    repository.saveAgentRuns([buildGeminiPlannerAgentRun()]);
    repository.saveAgentRunWorkflowLinks([buildGeminiPlannerLink()]);

    const viewModel = buildAgendaRoomViewModel({ repository, env: {} });

    expect(viewModel.aiPilotInsight.statusLabel).toBe("저장된 판단");
    expect(viewModel.aiPilotInsight.tone).toBe("ready");
    expect(viewModel.aiPilotInsight.summary).toContain("실제 수집 근거로 부처님오신날 선물카드 안건");
    expect(viewModel.aiPilotInsight.modelLabel).toBe("연동 Gemini · 모델 gemini-3.5-flash");
    expect(viewModel.aiPilotInsight.tokenCostLabel).toContain("총 900토큰");
    expect(viewModel.aiPilotInsight.tokenCostLabel).toContain("약 18원");
    expect(viewModel.aiPilotInsight.evidenceLabel).toBe("근거 4개 · 추천 안건 1건");
    expect(viewModel.aiPilotInsight.recommendedApprovalLabels).toContain("부처님오신날 선물카드 키워드 테스트 승인안");
    expect(viewModel.aiPilotInsight.evidenceCategoryLabels).toEqual([
      "쇼핑검색광고 성과 1개",
      "검색광고 성과 1개",
      "키워드 수요 1개",
      "스마트스토어 집계 1개",
    ]);
    expect(viewModel.aiPilotInsight.inputPolicyLabels).toEqual(
      expect.arrayContaining(["집계 요약과 근거 ID만 사용", "고객 식별정보 제외", "외부 반영 없음"]),
    );
  });

  it("저장된 LLM 추천 안건 ID가 현재 화면 후보와 달라도 원문 ID를 노출하지 않는다", () => {
    const repository = createMemoryMarketingWorkflowRepository();
    repository.saveAgentRuns([buildGeminiPlannerAgentRun()]);
    repository.saveAgentRunWorkflowLinks([
      {
        ...buildGeminiPlannerLink(),
        id: "agent-link-gemini-channel-balance-current",
        objectId: "approval-agenda-provider-channel-balance-stickersee-coffeeprint-2026-05-23",
      },
    ]);

    const viewModel = buildAgendaRoomViewModel({ repository, env: {} });

    expect(viewModel.aiPilotInsight.recommendedApprovalLabels).toContain("추천 안건 연결 기록 없음");
    expect(viewModel.aiPilotInsight.recommendedApprovalLabels).not.toContain("브랜드별 개별 검토 안건");
    expect(viewModel.aiPilotInsight.recommendedApprovalLabels).not.toContain(
      "approval-agenda-provider-channel-balance-stickersee-coffeeprint-2026-05-23",
    );
    expect(viewModel.aiPilotInsight.recommendedApprovalLabels).not.toContain("스마트스토어/자체몰 매출 균형 점검 안건");
  });

  it("사용 중단된 교차 브랜드 AI 판단은 최신 실행이어도 운영 화면에서 제외한다", () => {
    const repository = createMemoryMarketingWorkflowRepository();
    repository.saveAgentRuns([buildGeminiPlannerAgentRun(), buildDeprecatedCrossBrandGeminiPlannerAgentRun()]);
    repository.saveAgentRunWorkflowLinks([
      buildGeminiPlannerLink(),
      {
        ...buildGeminiPlannerLink(),
        id: "agent-link-gemini-deprecated-channel-balance",
        agentRunId: "planner-audit-planner-result-gemini-deprecated-channel-balance",
        objectId: "approval-agenda-provider-channel-balance-stickersee-coffeeprint-2026-05-23",
      },
    ]);

    const viewModel = buildAgendaRoomViewModel({ repository, env: {} });

    expect(viewModel.aiPilotInsight.statusLabel).toBe("저장된 판단");
    expect(viewModel.aiPilotInsight.summary).toContain("실제 수집 근거로 부처님오신날 선물카드 안건");
    expect(viewModel.aiPilotInsight.summary).not.toContain("스마트스토어/자체몰");
    expect(viewModel.aiPilotInsight.recommendedApprovalLabels).toContain("부처님오신날 선물카드 키워드 테스트 승인안");
    expect(viewModel.aiPilotInsight.recommendedApprovalLabels).not.toContain("브랜드별 개별 검토 안건");
  });

  it("읽기 전용 연동 집계를 담당 캐릭터 안건으로 함께 보여준다", () => {
    const repository = createMemoryMarketingWorkflowRepository();
    const reports = buildProviderAggregateReports();
    repository.saveProviderSyncReports(reports);
    repository.saveSignals(reports.flatMap((report) => (report.generatedSignal ? [report.generatedSignal] : [])));

    const viewModel = buildAgendaRoomViewModel({ repository, env: {} });

    expect(viewModel.moaReport.summary).toContain("실제 읽기 전용 연동 집계");
    expect(viewModel.summary.waitingApproval).toBe(3);
    expect(viewModel.agendaCards.map((card) => card.title)).toEqual(
      expect.arrayContaining([
        "스마트스토어 상위 상품 키워드 확장 안건",
        "영카트 재구매 고객군 CRM 초안 안건",
      ]),
    );
    expect(viewModel.agendaCards.map((card) => card.title)).not.toContain("스마트스토어/자체몰 매출 균형 점검 안건");
    expect(viewModel.agendaCards.find((card) => card.owner === "프로")?.source).toContain("연동 수집");
    expect(viewModel.characters.find((character) => character.id === "moa")).toMatchObject({
      availabilityLabel: "활성",
      workloadFormulaLabel: expect.stringContaining("기본"),
    });
    expect(viewModel.characters.find((character) => character.id === "gro")?.availabilityLabel).toBe("활성");
    expect(viewModel.characters.find((character) => character.id === "day")?.availabilityLabel).toBe("활성");
    expect(viewModel.characters.find((character) => character.id === "pro")).toMatchObject({
      availabilityLabel: "준비중",
      workload: 0,
      queueCount: 0,
    });
    expect(viewModel.characters.find((character) => character.id === "ripi")).toMatchObject({
      availabilityLabel: "준비중",
      workload: 0,
      queueCount: 0,
    });
    expect(viewModel.characters.find((character) => character.id === "maru")).toMatchObject({
      availabilityLabel: "준비중",
      workload: 0,
      queueCount: 0,
    });
    expect(viewModel.providerSyncEvidence.map((report) => report.providerLabel)).toEqual([
      "네이버 키워드광고",
      "스마트스토어(스티커씨)",
      "쇼핑몰(커피프린트)",
    ]);
    expect(viewModel.providerSyncEvidence.find((report) => report.providerKey === "search_ad")?.notes).toContain(
      "실제 호출은 대표가 제공한 서버 환경 설정으로만 수행하며 외부 반영 잠금과 무관합니다.",
    );
    const smartstoreEvidence = viewModel.providerSyncEvidence.find((report) => report.providerKey === "smartstore");
    expect(smartstoreEvidence?.brandLabel).toBe("스티커씨");
    expect(smartstoreEvidence?.historyPolicy.apiLimitLabel).toContain("24시간");
    expect(smartstoreEvidence?.historyPolicy.requestWindowLabel).toContain("상품주문번호");
    expect(smartstoreEvidence?.historyPolicy.baseScheduleLabel).toContain("07:10");
    expect(smartstoreEvidence?.historyPolicy.dedupeKeyLabel).toContain("최신 집계");
    expect(smartstoreEvidence?.historyPolicy.seasonalityLabel).toContain("전년도 명절");
    expect(smartstoreEvidence?.snapshotLabels).toContain(
      "스티커씨 주문 100건",
    );
    expect(viewModel.providerSyncEvidence.find((report) => report.providerKey === "search_ad")?.historyPolicy.intensiveScheduleLabel).toContain("15:05");
    expect(viewModel.providerSyncEvidence.find((report) => report.providerKey === "shop")?.brandLabel).toBe("커피프린트");
    expect(viewModel.productGrowthOpportunities.map((opportunity) => opportunity.kindLabel)).toEqual([
      "키워드 확장",
      "마케팅 제안",
      "상품 발굴",
    ]);
    expect(viewModel.productGrowthOpportunities[0]?.productImageUrl).toBe(
      "https://cdn.example.test/products/birthday-sticker.jpg",
    );
    expect(viewModel.productGrowthOpportunities[0]?.productImageAlt).toBe("생일축하스티커 상품 이미지");
    expect(viewModel.aiEvidenceBriefs.map((brief) => [brief.providerKey, brief.decisionLabel])).toEqual([
      ["search_ad", "판단 가능"],
      ["smartstore", "판단 가능"],
      ["shop", "판단 가능"],
    ]);
    expect(viewModel.aiEvidenceBriefs.find((brief) => brief.providerKey === "search_ad")?.blockedUseCases).toContain(
      "광고비/입찰가 즉시 변경",
    );
    expect(viewModel.productGrowthOpportunities[0]?.keywords).toContain("추석 선물카드");
    const smartstorePreview = viewModel.approvalPreviews.find((preview) => preview.title === "스마트스토어 상위 상품 키워드 확장 안건");
    expect(smartstorePreview?.provenance.providerEvidenceLabels[0]).toContain("스마트스토어");
    expect(smartstorePreview?.provenance.agentRunLabels[0]).toContain("모아 계획");
    expect(viewModel.plannerPreview.audit.sourceCountLabels).toContain("후보 4건");
    expect(viewModel.ownerDecisionFlows).toHaveLength(2);
    expect(viewModel.ownerDecisionFlows[0]?.outcomeEvidenceLabels).toContain("키워드광고 월검색 최대 16,000회");
    expect(viewModel.ownerDecisionFlows[1]?.outcomeSummary).toContain("내부 초안 실행");
    expect(viewModel.ownerDecisionFlows[1]?.outcomeEvidenceLabels).toContain("스마트스토어 매출 600,120원");
  });

  it("검색광고 성과 진단을 키워드별 업무카드로 쪼개고 첫 승인 위임 기준을 보여준다", () => {
    const repository = createMemoryMarketingWorkflowRepository();
    repository.saveProviderSyncReports([buildSearchAdPerformanceReportForWorkDesk()]);

    const viewModel = buildAgendaRoomViewModel({ repository, env: {} });

    expect(viewModel.workDeskCards.map((card) => card.keywordLabel)).toEqual(
      expect.arrayContaining(["생일 답례품", "생일축하스티커", "스승의날 카드"]),
    );
    const noOrderCard = viewModel.workDeskCards.find((card) => card.keywordLabel === "생일 답례품");
    expect(noOrderCard).toMatchObject({
      ownerId: "gro",
      brandLabel: "스티커씨",
      domainLabel: "검색광고",
      statusLabel: "대표 첫 승인 필요",
      recommendedActionLabel: "입찰 하향 또는 일시중지 검토",
      delegation: {
        state: "OWNER_FIRST_APPROVAL_REQUIRED",
        label: "대표 첫 승인 필요",
      },
    });
    expect(noOrderCard?.metricLabels).toEqual(
      expect.arrayContaining(["최근 7일 클릭 64회", "비용 38,400원", "주문 0건"]),
    );
    expect(noOrderCard?.reasonLabel).toContain("즉시 중지 전 유지 예외");
    const gro = viewModel.characters.find((character) => character.id === "gro");
    expect(gro?.workload).toBeGreaterThan(0);
    expect(gro?.workloadFormulaLabel).toContain("카드");

    const deviceGapCard = viewModel.workDeskCards.find(
      (card) => card.keywordLabel === "생일축하스티커" && card.reasonLabel.includes("키워드 전체 중지"),
    );
    expect(deviceGapCard?.recommendedActionLabel).toContain("성과 낮은 기기만 하향");
    expect(deviceGapCard?.reasonLabel).toContain("키워드 전체 중지");

    const shoppingCard = viewModel.workDeskCards.find((card) => card.keywordLabel === "스승의날 카드");
    expect(shoppingCard).toMatchObject({
      domainLabel: "쇼핑검색광고",
      recommendedActionLabel: "입찰 하향 또는 상품 노출 점검",
    });
    expect(shoppingCard?.metricLabels).toContain("직접 전환율 0%");

    const keywordDashboard = viewModel.keywordPerformanceDashboard;
    expect(keywordDashboard.title).toBe("키워드 성과 대시보드");
    expect(keywordDashboard.minimumCriteriaLabels[0]).toContain("클릭 10회");
    expect(keywordDashboard.brandTabs?.map((tab) => tab.label)).toEqual(["전체", "커피프린트", "스티커씨"]);
    expect(keywordDashboard.brandViews?.coffeeprint.summaryLabel).toContain("커피프린트 검색광고 키워드 목록 1개");
    expect(keywordDashboard.brandViews?.stickersee.summaryLabel).toContain("스티커씨 검색광고 키워드 목록 2개");
    expect(keywordDashboard.brandViews?.coffeeprint.topConversionKeywords).toHaveLength(0);
    expect(keywordDashboard.inventorySummaryCards?.map((card) => card.label)).toEqual(["전체 키워드", "켜진 키워드", "성과 확인", "성과 대기"]);
    expect(keywordDashboard.topConversionKeywords[0]?.keyword).toBe("생일축하스티커");
    expect(keywordDashboard.lowConversionKeywords.map((row) => row.keyword)).toContain("생일 답례품");
    expect(keywordDashboard.wasteKeywords[0]?.keyword).toBe("생일 답례품");
    expect(keywordDashboard.deviceSegments.map((row) => row.segmentLabel)).toEqual(
      expect.arrayContaining(["기기 모바일", "기기 PC"]),
    );
    expect(keywordDashboard.timeSegments.map((row) => row.segmentLabel)).toContain("시간 09-23");
    expect(keywordDashboard.shoppingSearchTerms[0]).toMatchObject({
      searchKeyword: "스승의날 카드",
      productName: "스티커씨 선물카드",
      productImageUrl: "https://cdn.example.test/products/gift-card-shopping.jpg",
      productImageSourceLabel: "상품그룹 이미지",
      landingFitLabel: "랜딩 적합도 점검",
    });
    expect(keywordDashboard.recommendationKeywords.map((candidate) => candidate.keyword)).toContain("부처님오신날 선물카드");
  });

  it("추천 키워드 근거는 누적 수집 이력이 반복되어도 키워드와 추이 단위로 접는다", () => {
    const repository = createMemoryMarketingWorkflowRepository();
    const reports = buildProviderAggregateReports();
    const searchAdReport = reports.find((report) => report.provider === "search_ad")!;
    const repeatedSearchAdReport: ProviderSyncReport = {
      ...searchAdReport,
      id: "provider-sync-search-ad-2026-05-22-repeat",
      checkedAt: "2026-05-22T04:00:00.000Z",
      keywordDemandSnapshots: searchAdReport.keywordDemandSnapshots?.map((snapshot) => ({
        ...snapshot,
        id: `repeat-${snapshot.id}`,
        collectedAt: "2026-05-22T04:00:00.000Z",
      })),
      searchTrendSnapshots: [
        {
          id: "trend-datalab-buddha-gift-card-repeat",
          keywordGroupName: "부처님오신날 선물카드",
          provider: "naver_datalab",
          timeUnit: "date",
          startDate: "2026-04-22",
          endDate: "2026-05-22",
          ratios: [
            { period: "2026-05-20", ratio: 20 },
            { period: "2026-05-21", ratio: 35 },
          ],
          collectedAt: "2026-05-22T04:00:00.000Z",
          note: "relative_ratio_not_absolute_volume",
        },
      ],
    };
    const zeroTrendReport: ProviderSyncReport = {
      ...repeatedSearchAdReport,
      id: "provider-sync-search-ad-2026-05-22-zero-trend",
      checkedAt: "2026-05-22T05:00:00.000Z",
      searchTrendSnapshots: repeatedSearchAdReport.searchTrendSnapshots?.map((snapshot) => ({
        ...snapshot,
        id: "trend-datalab-buddha-gift-card-zero",
        ratios: [{ period: "2026-05-22", ratio: 0 }],
        collectedAt: "2026-05-22T05:00:00.000Z",
      })),
    };
    repository.saveProviderSyncReports([...reports, repeatedSearchAdReport, zeroTrendReport]);

    const viewModel = buildAgendaRoomViewModel({ repository, env: {} });
    const evidence = viewModel.keywordPerformanceDashboard.recommendationEvidence;

    expect(evidence.filter((item) => item.sourceLabel === "네이버 키워드 수요" && item.title === "추석 선물카드")).toHaveLength(1);
    expect(evidence.filter((item) => item.sourceLabel === "네이버 키워드 수요" && item.title === "부처님오신날 선물카드")).toHaveLength(1);
    expect(evidence.filter((item) => item.sourceLabel === "데이터랩 추이" && item.title === "부처님오신날 선물카드")).toHaveLength(0);
    expect(viewModel.keywordPerformanceDashboard.recommendationKeywords.filter((item) => item.keyword === "부처님오신날 선물카드")).toHaveLength(1);
    expect(viewModel.keywordPerformanceDashboard.recommendationKeywords.map((candidate) => candidate.keyword)).toEqual(
      expect.arrayContaining(["생일축하스티커"]),
    );
    const commerceEvidence = evidence.find((item) => item.title === "스티커씨 실제 주문 상품명");
    expect(commerceEvidence?.summary).toContain("후보를 주문 상품명에서 추출했습니다");
    expect(commerceEvidence?.summary).not.toContain("Thank you");
    expect(commerceEvidence?.sourceDetailLabel).toContain("원천 상품명:");
    const buddhaSeasonEvidence = evidence.find((item) => item.sourceLabel === "음력 시즌 윈도우" && item.title === "부처님오신날");
    expect(buddhaSeasonEvidence?.summary.match(/부처님오신날 선물카드/g)).toHaveLength(1);
  });

  it("같은 근거의 연동 수집 이력은 결재 미리보기에서 최신 1건과 누적 횟수로 접는다", () => {
    const repository = createMemoryMarketingWorkflowRepository();
    const reports = buildProviderAggregateReports();
    const smartstoreReport = reports.find((report) => report.provider === "smartstore")!;
    const shopReport = reports.find((report) => report.provider === "shop")!;
    const repeatedReports: ProviderSyncReport[] = [
      ...reports,
      {
        ...smartstoreReport,
        id: "provider-sync-smartstore-2026-05-22T02:30:00.000Z",
        checkedAt: "2026-05-22T02:30:00.000Z",
        commerceAggregateSnapshot: smartstoreReport.commerceAggregateSnapshot
          ? {
              ...smartstoreReport.commerceAggregateSnapshot,
              grossSales: 602620,
              collectedAt: "2026-05-22T02:30:00.000Z",
            }
          : undefined,
      },
      {
        ...shopReport,
        id: "provider-sync-shop-2026-05-22T02:30:00.000Z",
        checkedAt: "2026-05-22T02:30:00.000Z",
        shopAggregateSnapshot: shopReport.shopAggregateSnapshot
          ? {
              ...shopReport.shopAggregateSnapshot,
              collectedAt: "2026-05-22T02:30:00.000Z",
            }
          : undefined,
      },
    ];
    repository.saveProviderSyncReports(repeatedReports);
    repository.saveSignals(repeatedReports.flatMap((report) => (report.generatedSignal ? [report.generatedSignal] : [])));

    const viewModel = buildAgendaRoomViewModel({ repository, env: {} });

    const smartstorePreview = viewModel.approvalPreviews.find(
      (preview) => preview.title === "스마트스토어 상위 상품 키워드 확장 안건",
    );
    expect(smartstorePreview?.provenance.summaryLabel).toContain("연동 수집 1개 (누적 2회)");
    expect(smartstorePreview?.provenance.providerEvidenceLabels).toEqual([
      "스마트스토어(스티커씨) · 최신 동기화 완료 · 스티커씨 주문 100건, 스티커씨 매출 602,620원 · 누적 2회",
    ]);

    const shopPreview = viewModel.approvalPreviews.find((preview) => preview.title === "영카트 재구매 고객군 CRM 초안 안건");
    expect(shopPreview?.provenance.providerEvidenceLabels).toEqual([
      "쇼핑몰(커피프린트) · 최신 동기화 완료 · 커피프린트 주문 28건, 커피프린트 재구매 4명 · 누적 2회",
    ]);
  });

  it("이전 백엔드 view model에는 근거 요청 큐 기본값을 보강한다", () => {
    const currentViewModel = buildAgendaRoomViewModel({ env: {} });
    const staleBackendViewModel = {
      ...currentViewModel,
      summary: {
        ...currentViewModel.summary,
        waitingEvidence: currentViewModel.summary.waitingEvidence - currentViewModel.evidenceRequestQueue.openRequestCount,
      },
      inboxBuckets: currentViewModel.inboxBuckets.map((bucket) =>
        bucket.id === "WAITING_EVIDENCE"
          ? {
              ...bucket,
              count: bucket.count - currentViewModel.evidenceRequestQueue.openRequestCount,
            }
          : bucket,
      ),
      evidenceRequestQueue: undefined,
      aiPilotInsight: undefined,
    } as unknown as typeof currentViewModel;

    const normalizedViewModel = normalizeAgendaRoomViewModelCompatibility(staleBackendViewModel);

    expect(normalizedViewModel.evidenceRequestQueue.title).toBe("근거 요청 큐");
    expect(normalizedViewModel.aiPilotInsight.title).toBe("AI 파일럿 판단");
    expect(normalizedViewModel.summary.waitingEvidence).toBe(currentViewModel.summary.waitingEvidence);
    expect(normalizedViewModel.inboxBuckets.find((bucket) => bucket.id === "WAITING_EVIDENCE")?.count).toBe(2);
  });

  it("이전 백엔드 view model의 상품 후보에는 이미지 기본값을 보강한다", () => {
    const repository = createMemoryMarketingWorkflowRepository();
    repository.saveProviderSyncReports(buildProviderAggregateReports());
    const currentViewModel = buildAgendaRoomViewModel({ repository, env: {} });
    const staleBackendViewModel = {
      ...currentViewModel,
      productGrowthOpportunities: currentViewModel.productGrowthOpportunities.map(
        ({ productImageAlt: _productImageAlt, productImageUrl: _productImageUrl, ...opportunity }) => opportunity,
      ),
    } as unknown as typeof currentViewModel;

    const normalizedViewModel = normalizeAgendaRoomViewModelCompatibility(staleBackendViewModel);

    expect(normalizedViewModel.productGrowthOpportunities[0]?.productImageUrl).toMatch(/^data:image\/svg\+xml/);
    expect(normalizedViewModel.productGrowthOpportunities[0]?.productImageAlt).toContain("상품 이미지");
  });
});

function buildProviderAggregateReports(): ProviderSyncReport[] {
  return [
    {
      id: "provider-sync-search-ad-2026-05-22",
      provider: "search_ad",
      label: "네이버 키워드광고 read-only sync",
      status: "SYNCED",
      readOnly: true,
      networkAttempted: true,
      writeAttempted: false,
      endpoint: "https://api.searchad.naver.com/keywordstool",
      sourceUrl: "http://naver.github.io/searchad-apidoc/",
      missingEnvKeys: [],
      evidenceNotes: [
        "read-only keyword tool 응답 2건을 KeywordDemandSnapshot으로 정규화했습니다.",
        "실제 호출은 대표가 제공한 server env로만 수행하며 write gate와 무관합니다.",
      ],
      checkedAt: "2026-05-22T02:00:00.000Z",
      httpStatus: 200,
      keywordDemandSnapshots: [
        {
          id: "kw-demand-search-ad-추석선물카드-2026-05-22",
          keyword: "추석 선물카드",
          provider: "naver_keyword_tool",
          monthlyPcSearches: 6000,
          monthlyMobileSearches: 10000,
          competitionIndex: "MEDIUM",
          cachedUntil: "2026-05-23T02:00:00.000Z",
          collectedAt: "2026-05-22T02:00:00.000Z",
          rateLimitState: "OK",
        },
        {
          id: "kw-demand-search-ad-부처님오신날선물카드-2026-05-22",
          keyword: "부처님오신날 선물카드",
          provider: "naver_keyword_tool",
          monthlyPcSearches: 5000,
          monthlyMobileSearches: 8000,
          competitionIndex: "LOW",
          cachedUntil: "2026-05-23T02:00:00.000Z",
          collectedAt: "2026-05-22T02:00:00.000Z",
          rateLimitState: "OK",
        },
      ],
    },
    {
      id: "provider-sync-smartstore-2026-05-22",
      provider: "smartstore",
      label: "네이버 커머스/스마트스토어 read-only sync",
      status: "SYNCED",
      readOnly: true,
      networkAttempted: true,
      writeAttempted: false,
      endpoint: "https://api.commerce.naver.com/order",
      sourceUrl: "https://apicenter.commerce.naver.com/docs/commerce-api/current/%EC%A3%BC%EB%AC%B8-%EC%A1%B0%ED%9A%8C",
      missingEnvKeys: [],
      evidenceNotes: ["aggregate-only"],
      checkedAt: "2026-05-22T02:00:00.000Z",
      httpStatus: 200,
      commerceAggregateSnapshot: {
        id: "commerce-aggregate-STICKERSEE-2026-05-22",
        provider: "naver_commerce",
        brandKey: "STICKERSEE",
        windowDays: 30,
        paidOrderCount: 100,
        grossSales: 600120,
        topProductName: "생일축하스티커",
        topProductImageUrl: "https://cdn.example.test/products/birthday-sticker.jpg",
        dataSolutionAvailable: false,
        collectedAt: "2026-05-22T02:00:00.000Z",
        dataScope: "aggregate_only",
      },
      generatedSignal: {
        id: "signal-commerce-aggregate-stickersee-2026-05-22",
        source: "smartstore",
        signalType: "weekly_trend",
        entityType: "product",
        entityId: "STICKERSEE",
        title: "스마트스토어 주문 집계 동기화",
        currentValue: 600120,
        periodStart: "2026-04-22",
        periodEnd: "2026-05-22",
        evidenceRowIds: ["commerce-aggregate-STICKERSEE-2026-05-22"],
        createdAt: "2026-05-22T02:00:00.000Z",
      },
    },
    {
      id: "provider-sync-shop-2026-05-22",
      provider: "shop",
      label: "자체 쇼핑몰/영카트 read-only sync",
      status: "SYNCED",
      readOnly: true,
      networkAttempted: true,
      writeAttempted: false,
      endpoint: "https://shop.example.test/bridge?action=aggregate",
      sourceUrl: "integrations/youngcart-bridge/README.md",
      missingEnvKeys: [],
      evidenceNotes: ["aggregate-only"],
      checkedAt: "2026-05-22T02:00:00.000Z",
      httpStatus: 200,
      shopAggregateSnapshot: {
        id: "shop-aggregate-youngcart-2026-05-22",
        provider: "youngcart_bridge",
        brandKey: "COFFEEPRINT",
        windowDays: 30,
        orderCount: 28,
        repeatCustomerCount: 4,
        grossSales: 4081900,
        averageOrderValue: 145782,
        collectedAt: "2026-05-22T02:00:00.000Z",
        dataScope: "aggregate_only",
      },
      generatedSignal: {
        id: "signal-shop-aggregate-coffeeprint-2026-05-22",
        source: "shop",
        signalType: "weekly_trend",
        entityType: "customer_segment",
        entityId: "COFFEEPRINT",
        title: "영카트 주문/재구매 집계 동기화",
        currentValue: 4,
        baselineValue: 28,
        periodStart: "2026-04-22",
        periodEnd: "2026-05-22",
        evidenceRowIds: ["shop-aggregate-youngcart-2026-05-22"],
        createdAt: "2026-05-22T02:00:00.000Z",
      },
    },
  ];
}

function buildSearchAdPerformanceReportForWorkDesk(): ProviderSyncReport {
  return {
    id: "provider-sync-search-ad-performance-workdesk-2026-05-23",
    provider: "search_ad",
    label: "네이버 키워드광고 성과 읽기 전용 수집",
    status: "SYNCED",
    readOnly: true,
    networkAttempted: true,
    writeAttempted: false,
    endpoint: "https://api.searchad.naver.com/stats",
    sourceUrl: "http://naver.github.io/searchad-apidoc/",
    missingEnvKeys: [],
    evidenceNotes: ["키워드/기기/시간대 성과 집계만 저장했습니다."],
    checkedAt: "2026-05-23T08:00:00.000Z",
    httpStatus: 200,
    searchAdKeywordInventorySnapshots: [
      {
        id: "inventory-stickersee-birthday",
        provider: "naver_search_ad",
        brandKey: "STICKERSEE",
        campaignId: "cmp-stickersee",
        campaignName: "스티커씨 검색광고",
        campaignStatus: "ELIGIBLE",
        campaignType: "WEB_SITE",
        adGroupId: "grp-stickersee-main",
        adGroupName: "대표 상품",
        adGroupStatus: "ELIGIBLE",
        adGroupType: "WEB_SITE",
        keywordId: "nkw-stickersee-birthday",
        keyword: "생일축하스티커",
        keywordStatus: "ELIGIBLE",
        effectiveStatus: "ON",
        trackingVerified: true,
        collectedAt: "2026-05-23T08:00:00.000Z",
        dataScope: "inventory_only",
      },
      {
        id: "inventory-stickersee-off",
        provider: "naver_search_ad",
        brandKey: "STICKERSEE",
        campaignId: "cmp-stickersee",
        campaignName: "스티커씨 검색광고",
        campaignStatus: "ELIGIBLE",
        campaignType: "WEB_SITE",
        adGroupId: "grp-stickersee-main",
        adGroupName: "대표 상품",
        adGroupStatus: "ELIGIBLE",
        adGroupType: "WEB_SITE",
        keywordId: "nkw-stickersee-off",
        keyword: "답례 스티커",
        keywordStatus: "PAUSED",
        effectiveStatus: "OFF",
        trackingVerified: true,
        collectedAt: "2026-05-23T08:00:00.000Z",
        dataScope: "inventory_only",
      },
      {
        id: "inventory-coffeeprint-thanks",
        provider: "naver_search_ad",
        brandKey: "COFFEEPRINT",
        campaignId: "cmp-coffeeprint",
        campaignName: "커피프린트 파워링크",
        campaignStatus: "ELIGIBLE",
        campaignType: "WEB_SITE",
        adGroupId: "grp-coffeeprint-thanks",
        adGroupName: "감사장",
        adGroupStatus: "ELIGIBLE",
        adGroupType: "WEB_SITE",
        keywordId: "nkw-coffeeprint-thanks",
        keyword: "기업 감사장",
        keywordStatus: "ELIGIBLE",
        effectiveStatus: "ON",
        trackingVerified: true,
        collectedAt: "2026-05-23T08:00:00.000Z",
        dataScope: "inventory_only",
      },
    ],
    searchAdPerformanceSnapshots: [
      {
        id: "ad-perf-workdesk-no-order",
        provider: "naver_search_ad",
        brandKey: "STICKERSEE",
        campaignName: "스티커씨 검색광고",
        adGroupName: "대표 상품",
        keyword: "생일 답례품",
        device: "ALL",
        timeSlot: "09-23",
        windowDays: 7,
        impressions: 2400,
        clicks: 64,
        cost: 38400,
        conversions: 0,
        revenue: 0,
        targetCpa: 12000,
        targetRoas: 2.5,
        trackingVerified: true,
        collectedAt: "2026-05-23T08:00:00.000Z",
        dataScope: "aggregate_only",
      },
      {
        id: "ad-perf-workdesk-mobile",
        provider: "naver_search_ad",
        brandKey: "STICKERSEE",
        campaignName: "스티커씨 검색광고",
        adGroupName: "대표 상품",
        keyword: "생일축하스티커",
        device: "MOBILE",
        timeSlot: "18-23",
        windowDays: 7,
        impressions: 1800,
        clicks: 120,
        cost: 72000,
        conversions: 2,
        revenue: 60000,
        targetCpa: 12000,
        targetRoas: 2.5,
        trackingVerified: true,
        collectedAt: "2026-05-23T08:00:00.000Z",
        dataScope: "aggregate_only",
      },
      {
        id: "ad-perf-workdesk-pc",
        provider: "naver_search_ad",
        brandKey: "STICKERSEE",
        campaignName: "스티커씨 검색광고",
        adGroupName: "대표 상품",
        keyword: "생일축하스티커",
        device: "PC",
        timeSlot: "09-17",
        windowDays: 7,
        impressions: 1200,
        clicks: 80,
        cost: 40000,
        conversions: 8,
        revenue: 240000,
        targetCpa: 12000,
        targetRoas: 2.5,
        trackingVerified: true,
        collectedAt: "2026-05-23T08:00:00.000Z",
        dataScope: "aggregate_only",
      },
    ],
    shoppingSearchAdPerformanceSnapshots: [
      {
        id: "shopping-search-perf-workdesk-no-order",
        provider: "naver_search_ad",
        brandKey: "STICKERSEE",
        campaignName: "스티커씨 쇼핑검색광고",
        adGroupName: "대표 상품형",
        adGroupId: "grp-shopping-a001",
        searchKeyword: "스승의날 카드",
        productGroupName: "스티커씨 선물카드",
        productImageUrl: "https://cdn.example.test/products/gift-card-shopping.jpg",
        mallName: "스티커씨",
        registeredProductType: "GENERAL",
        windowDays: 30,
        clicks: 42,
        directConversionRate: 0,
        cost: 18900,
        collectedAt: "2026-05-23T08:00:00.000Z",
        dataScope: "aggregate_only",
      },
    ],
  };
}

function buildGeminiPlannerAgentRun(): AgentRun {
  return {
    id: "planner-audit-planner-result-gemini-2026-05-23T030743902Z",
    runnerKey: "moa_planner",
    runType: "moa_planner",
    mode: "llm",
    provider: "gemini",
    model: "gemini-3.5-flash",
    status: "SUCCEEDED",
    inputSummary: "결재 후보 3건과 연동 근거 메모 8개를 요약 입력으로 사용했습니다.",
    outputSummary: "실제 수집 근거로 부처님오신날 선물카드 안건을 우선 검토합니다.",
    rawRowsIncluded: false,
    tokenUsage: {
      inputTokens: 800,
      outputTokens: 100,
      totalTokens: 900,
      estimated: true,
      estimatedCostKrw: 18,
      basis: "Gemini usageMetadata와 저장된 환율 기준 실제 호출 비용 추정",
    },
    evidenceIds: [
      "shopping-search-ad-performance-stickersee-grp-a001-어린이날-2026-05-23",
      "search-ad-performance-stickersee-nkw-a001-mobile-2026-05-23",
      "kw-demand-buddha-gift-card",
      "commerce-aggregate-STICKERSEE-2026-05-22",
    ],
    startedAt: "2026-05-23T03:07:43.902Z",
    finishedAt: "2026-05-23T03:07:44.100Z",
  };
}

function buildGeminiPlannerLink(): AgentRunWorkflowLink {
  return {
    id: "agent-link-gemini-approval-buddha-gift-card",
    agentRunId: "planner-audit-planner-result-gemini-2026-05-23T030743902Z",
    objectType: "approval_request",
    objectId: "approval-agenda-season-plan-buddha-gift-card",
    relation: "generated",
    createdAt: "2026-05-23T03:07:44.100Z",
  };
}

function buildDeprecatedCrossBrandGeminiPlannerAgentRun(): AgentRun {
  return {
    ...buildGeminiPlannerAgentRun(),
    id: "planner-audit-planner-result-gemini-deprecated-channel-balance",
    outputSummary: "스마트스토어와 자체몰의 매출 균형을 통합 검토합니다.",
    evidenceIds: ["commerce-aggregate-STICKERSEE-2026-05-22", "shop-aggregate-youngcart-2026-05-22"],
    startedAt: "2026-05-23T03:08:43.902Z",
    finishedAt: "2026-05-23T03:08:44.100Z",
  };
}
