-- CreateTable
CREATE TABLE "AdAdgroupSnapshot" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "adgroupId" TEXT NOT NULL,
    "adgroupName" TEXT NOT NULL,
    "brandKey" "BrandKey",
    "rawJson" JSONB,
    "collectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdAdgroupSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdAdgroupSnapshot_accountId_campaignId_adgroupId_collectedA_idx" ON "AdAdgroupSnapshot"("accountId", "campaignId", "adgroupId", "collectedAt");

-- CreateIndex
CREATE INDEX "AdAdgroupSnapshot_campaignId_adgroupId_idx" ON "AdAdgroupSnapshot"("campaignId", "adgroupId");

-- AddForeignKey
ALTER TABLE "AdAdgroupSnapshot" ADD CONSTRAINT "AdAdgroupSnapshot_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "MarketingAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
