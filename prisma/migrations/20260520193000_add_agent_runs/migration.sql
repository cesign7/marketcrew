-- CreateTable
CREATE TABLE "AgentRun" (
    "id" TEXT NOT NULL,
    "agentKey" "AgentKey" NOT NULL,
    "runType" TEXT NOT NULL,
    "trigger" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "promptVersion" TEXT NOT NULL,
    "status" "ExecutionStatus" NOT NULL DEFAULT 'PENDING',
    "inputHash" TEXT NOT NULL,
    "inputJson" JSONB NOT NULL,
    "outputJson" JSONB,
    "parsedJson" JSONB,
    "validationJson" JSONB,
    "tokenUsageJson" JSONB,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "AgentRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgentMemory" (
    "id" TEXT NOT NULL,
    "agentKey" "AgentKey" NOT NULL,
    "memoryType" TEXT NOT NULL,
    "subjectKey" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "sourceRunId" TEXT,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0.7,
    "status" "RuleStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgentMemory_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "ActionProposal"
ADD COLUMN "agentRunId" TEXT,
ADD COLUMN "confidence" DOUBLE PRECISION,
ADD COLUMN "evidenceJson" JSONB,
ADD COLUMN "safetyJson" JSONB;

-- CreateIndex
CREATE INDEX "AgentRun_agentKey_startedAt_idx" ON "AgentRun"("agentKey", "startedAt");

-- CreateIndex
CREATE INDEX "AgentRun_runType_status_startedAt_idx" ON "AgentRun"("runType", "status", "startedAt");

-- CreateIndex
CREATE INDEX "AgentMemory_agentKey_memoryType_status_idx" ON "AgentMemory"("agentKey", "memoryType", "status");

-- CreateIndex
CREATE INDEX "AgentMemory_subjectKey_idx" ON "AgentMemory"("subjectKey");

-- CreateIndex
CREATE INDEX "AgentMemory_sourceRunId_idx" ON "AgentMemory"("sourceRunId");

-- CreateIndex
CREATE INDEX "ActionProposal_agentRunId_idx" ON "ActionProposal"("agentRunId");

-- AddForeignKey
ALTER TABLE "ActionProposal" ADD CONSTRAINT "ActionProposal_agentRunId_fkey" FOREIGN KEY ("agentRunId") REFERENCES "AgentRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgentMemory" ADD CONSTRAINT "AgentMemory_sourceRunId_fkey" FOREIGN KEY ("sourceRunId") REFERENCES "AgentRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;
