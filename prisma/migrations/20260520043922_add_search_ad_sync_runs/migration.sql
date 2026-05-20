-- CreateTable
CREATE TABLE "IntegrationSyncRun" (
    "id" TEXT NOT NULL,
    "provider" "ExecutionProvider" NOT NULL,
    "accountId" TEXT,
    "status" "ExecutionStatus" NOT NULL DEFAULT 'PENDING',
    "campaignsCount" INTEGER NOT NULL DEFAULT 0,
    "adgroupsCount" INTEGER NOT NULL DEFAULT 0,
    "keywordsCount" INTEGER NOT NULL DEFAULT 0,
    "snapshotsCount" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "rawJson" JSONB,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "IntegrationSyncRun_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IntegrationSyncRun_provider_status_startedAt_idx" ON "IntegrationSyncRun"("provider", "status", "startedAt");

-- CreateIndex
CREATE INDEX "IntegrationSyncRun_accountId_startedAt_idx" ON "IntegrationSyncRun"("accountId", "startedAt");

-- AddForeignKey
ALTER TABLE "IntegrationSyncRun" ADD CONSTRAINT "IntegrationSyncRun_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "MarketingAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
