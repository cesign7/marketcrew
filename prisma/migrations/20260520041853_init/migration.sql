-- CreateEnum
CREATE TYPE "StoreType" AS ENUM ('NAVER_ADS', 'NAVER_SMARTSTORE', 'YOUNGCART');

-- CreateEnum
CREATE TYPE "BrandKey" AS ENUM ('COFFEEPRINT', 'STICKERSEE');

-- CreateEnum
CREATE TYPE "StoreStatus" AS ENUM ('ACTIVE', 'PAUSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "MarketingAccountProvider" AS ENUM ('NAVER_SEARCH_AD');

-- CreateEnum
CREATE TYPE "MappingStatus" AS ENUM ('CANDIDATE', 'CONFIRMED', 'REJECTED');

-- CreateEnum
CREATE TYPE "KeywordRuleType" AS ENUM ('BRAND_DEFENSE', 'TOP_1_DEFENSE', 'TOP_2_TO_3_OPTIMIZE', 'SEASONAL_TOP_TEST', 'PROFIT_BASED_BID', 'LOW_BID_KEEP', 'NEGATIVE_CANDIDATE', 'PAUSE_CANDIDATE', 'DISCOVERY_TEST');

-- CreateEnum
CREATE TYPE "TargetPositionType" AS ENUM ('TOP_1', 'TOP_1_TO_2', 'TOP_2_TO_3', 'LOW_BID', 'EXCLUDE', 'PAUSE', 'TEST');

-- CreateEnum
CREATE TYPE "RuleStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AgentKey" AS ENUM ('GENERAL_MANAGER', 'POSITION_DEFENDER', 'BID_OPTIMIZER', 'KEYWORD_STRATEGIST', 'PRODUCT_STRATEGIST', 'TITLE_SEO', 'AD_COPYWRITER', 'MARGIN_ANALYST');

-- CreateEnum
CREATE TYPE "ActionType" AS ENUM ('BID_ADJUSTMENT', 'KEYWORD_RULE_CHANGE', 'NEGATIVE_KEYWORD', 'AD_COPY_CHANGE', 'PRODUCT_TITLE_CHANGE', 'REPORT_ONLY');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "ProposalStatus" AS ENUM ('AUTO_EXECUTED', 'NEEDS_APPROVAL', 'APPROVED', 'REJECTED', 'HELD', 'FAILED');

-- CreateEnum
CREATE TYPE "ExecutionProvider" AS ENUM ('NAVER_SEARCH_AD', 'NAVER_COMMERCE', 'YOUNGCART', 'INTERNAL');

-- CreateEnum
CREATE TYPE "ExecutionStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED');

-- CreateTable
CREATE TABLE "Store" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "StoreType" NOT NULL,
    "brandKey" "BrandKey" NOT NULL,
    "status" "StoreStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Store_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketingAccount" (
    "id" TEXT NOT NULL,
    "provider" "MarketingAccountProvider" NOT NULL,
    "customerId" TEXT NOT NULL,
    "alias" TEXT NOT NULL,
    "status" "StoreStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketingAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductMaster" (
    "id" TEXT NOT NULL,
    "brandKey" "BrandKey" NOT NULL,
    "canonicalName" TEXT NOT NULL,
    "productGroup" TEXT NOT NULL,
    "seasonTags" JSONB,
    "status" "StoreStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductMaster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoreProduct" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "externalProductId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "optionName" TEXT,
    "category" TEXT,
    "salePrice" INTEGER,
    "status" "StoreStatus" NOT NULL DEFAULT 'ACTIVE',
    "rawJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductMapping" (
    "id" TEXT NOT NULL,
    "productMasterId" TEXT NOT NULL,
    "storeProductId" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "mappingStatus" "MappingStatus" NOT NULL DEFAULT 'CANDIDATE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CostFormula" (
    "id" TEXT NOT NULL,
    "productMasterId" TEXT NOT NULL,
    "formulaType" TEXT NOT NULL,
    "quantityRange" JSONB,
    "optionRules" JSONB,
    "printMethodRules" JSONB,
    "packagingCost" INTEGER NOT NULL DEFAULT 0,
    "shippingSupportCost" INTEGER NOT NULL DEFAULT 0,
    "paymentFeeRule" JSONB,
    "platformFeeRule" JSONB,
    "targetMarginRate" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CostFormula_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdCampaignSnapshot" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "campaignName" TEXT NOT NULL,
    "brandKey" "BrandKey",
    "rawJson" JSONB,
    "collectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdCampaignSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdKeywordSnapshot" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "adgroupId" TEXT NOT NULL,
    "keywordId" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "bidAmount" INTEGER,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "cost" INTEGER NOT NULL DEFAULT 0,
    "ctr" DOUBLE PRECISION,
    "avgCpc" DOUBLE PRECISION,
    "conversions" DOUBLE PRECISION,
    "conversionSales" INTEGER,
    "avgRank" DOUBLE PRECISION,
    "collectedDate" TIMESTAMP(3) NOT NULL,
    "rawJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdKeywordSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KeywordRule" (
    "id" TEXT NOT NULL,
    "keywordId" TEXT,
    "keyword" TEXT NOT NULL,
    "brandKey" "BrandKey" NOT NULL,
    "ruleType" "KeywordRuleType" NOT NULL,
    "targetPositionType" "TargetPositionType" NOT NULL,
    "maxCpc" INTEGER,
    "minMarginRate" DOUBLE PRECISION,
    "autoBidAdjustmentLimit" DOUBLE PRECISION NOT NULL DEFAULT 0.05,
    "dailyAdjustmentLimit" INTEGER NOT NULL DEFAULT 2,
    "monthlyBudgetLimit" INTEGER,
    "status" "RuleStatus" NOT NULL DEFAULT 'DRAFT',
    "reason" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KeywordRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActionProposal" (
    "id" TEXT NOT NULL,
    "agentKey" "AgentKey" NOT NULL,
    "actionType" "ActionType" NOT NULL,
    "riskLevel" "RiskLevel" NOT NULL,
    "title" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "expectedImpact" TEXT NOT NULL,
    "beforeJson" JSONB,
    "afterJson" JSONB,
    "status" "ProposalStatus" NOT NULL DEFAULT 'NEEDS_APPROVAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActionProposal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActionExecution" (
    "id" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "executionType" "ActionType" NOT NULL,
    "provider" "ExecutionProvider" NOT NULL,
    "requestJson" JSONB NOT NULL,
    "responseJson" JSONB,
    "status" "ExecutionStatus" NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "executedAt" TIMESTAMP(3),
    "rollbackJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActionExecution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutomationRule" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "maxBidChangeRate" DOUBLE PRECISION NOT NULL DEFAULT 0.05,
    "maxDailyChangesPerKeyword" INTEGER NOT NULL DEFAULT 2,
    "maxCpc" INTEGER,
    "monthlyBudgetLimit" INTEGER,
    "requiresApprovalAboveRisk" "RiskLevel" NOT NULL DEFAULT 'LOW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AutomationRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentReport" (
    "id" TEXT NOT NULL,
    "agentKey" "AgentKey" NOT NULL,
    "reportType" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "detailJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AgentReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Store_brandKey_type_idx" ON "Store"("brandKey", "type");

-- CreateIndex
CREATE UNIQUE INDEX "MarketingAccount_provider_customerId_key" ON "MarketingAccount"("provider", "customerId");

-- CreateIndex
CREATE INDEX "ProductMaster_brandKey_productGroup_idx" ON "ProductMaster"("brandKey", "productGroup");

-- CreateIndex
CREATE INDEX "StoreProduct_storeId_status_idx" ON "StoreProduct"("storeId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "StoreProduct_storeId_externalProductId_key" ON "StoreProduct"("storeId", "externalProductId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductMapping_productMasterId_storeProductId_key" ON "ProductMapping"("productMasterId", "storeProductId");

-- CreateIndex
CREATE INDEX "CostFormula_productMasterId_idx" ON "CostFormula"("productMasterId");

-- CreateIndex
CREATE INDEX "AdCampaignSnapshot_accountId_campaignId_collectedAt_idx" ON "AdCampaignSnapshot"("accountId", "campaignId", "collectedAt");

-- CreateIndex
CREATE INDEX "AdKeywordSnapshot_keyword_collectedDate_idx" ON "AdKeywordSnapshot"("keyword", "collectedDate");

-- CreateIndex
CREATE INDEX "AdKeywordSnapshot_campaignId_adgroupId_idx" ON "AdKeywordSnapshot"("campaignId", "adgroupId");

-- CreateIndex
CREATE UNIQUE INDEX "AdKeywordSnapshot_accountId_keywordId_collectedDate_key" ON "AdKeywordSnapshot"("accountId", "keywordId", "collectedDate");

-- CreateIndex
CREATE INDEX "KeywordRule_brandKey_ruleType_status_idx" ON "KeywordRule"("brandKey", "ruleType", "status");

-- CreateIndex
CREATE INDEX "KeywordRule_keyword_idx" ON "KeywordRule"("keyword");

-- CreateIndex
CREATE INDEX "ActionProposal_status_riskLevel_createdAt_idx" ON "ActionProposal"("status", "riskLevel", "createdAt");

-- CreateIndex
CREATE INDEX "ActionProposal_agentKey_idx" ON "ActionProposal"("agentKey");

-- CreateIndex
CREATE INDEX "ActionExecution_proposalId_status_idx" ON "ActionExecution"("proposalId", "status");

-- CreateIndex
CREATE INDEX "AgentReport_agentKey_createdAt_idx" ON "AgentReport"("agentKey", "createdAt");

-- AddForeignKey
ALTER TABLE "StoreProduct" ADD CONSTRAINT "StoreProduct_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductMapping" ADD CONSTRAINT "ProductMapping_productMasterId_fkey" FOREIGN KEY ("productMasterId") REFERENCES "ProductMaster"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductMapping" ADD CONSTRAINT "ProductMapping_storeProductId_fkey" FOREIGN KEY ("storeProductId") REFERENCES "StoreProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CostFormula" ADD CONSTRAINT "CostFormula_productMasterId_fkey" FOREIGN KEY ("productMasterId") REFERENCES "ProductMaster"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdCampaignSnapshot" ADD CONSTRAINT "AdCampaignSnapshot_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "MarketingAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdKeywordSnapshot" ADD CONSTRAINT "AdKeywordSnapshot_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "MarketingAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActionExecution" ADD CONSTRAINT "ActionExecution_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "ActionProposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;
