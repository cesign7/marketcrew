-- CreateTable
CREATE TABLE "AdKeywordDailyPerformance" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "adgroupId" TEXT NOT NULL,
    "keywordId" TEXT NOT NULL,
    "keyword" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "cost" INTEGER NOT NULL DEFAULT 0,
    "ctr" DOUBLE PRECISION,
    "avgCpc" DOUBLE PRECISION,
    "conversions" DOUBLE PRECISION,
    "conversionRate" DOUBLE PRECISION,
    "conversionSales" INTEGER,
    "roas" DOUBLE PRECISION,
    "costPerConversion" DOUBLE PRECISION,
    "avgRank" DOUBLE PRECISION,
    "rawJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdKeywordDailyPerformance_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AdKeywordDailyPerformance_accountId_keywordId_date_key" ON "AdKeywordDailyPerformance"("accountId", "keywordId", "date");

-- CreateIndex
CREATE INDEX "AdKeywordDailyPerformance_date_idx" ON "AdKeywordDailyPerformance"("date");

-- CreateIndex
CREATE INDEX "AdKeywordDailyPerformance_keyword_date_idx" ON "AdKeywordDailyPerformance"("keyword", "date");

-- CreateIndex
CREATE INDEX "AdKeywordDailyPerformance_campaignId_adgroupId_idx" ON "AdKeywordDailyPerformance"("campaignId", "adgroupId");

-- AddForeignKey
ALTER TABLE "AdKeywordDailyPerformance" ADD CONSTRAINT "AdKeywordDailyPerformance_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "MarketingAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
