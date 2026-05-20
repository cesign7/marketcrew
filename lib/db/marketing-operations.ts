import { prisma } from "@/lib/db/prisma";
import {
  actionProposalFromRecord,
  agentReportFromRecord,
  automationRuleFromRecord,
  keywordRuleFromRecord,
} from "@/lib/db/mappers";

export async function getActionProposals() {
  const proposals = await prisma.actionProposal.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  return proposals.map(actionProposalFromRecord);
}

export async function getAgentReports() {
  const reports = await prisma.agentReport.findMany({
    orderBy: { createdAt: "desc" },
    take: 6,
  });

  return reports.map(agentReportFromRecord);
}

export async function getKeywordRules() {
  const rules = await prisma.keywordRule.findMany({
    orderBy: [{ brandKey: "asc" }, { keyword: "asc" }],
  });
  const keywords = [...new Set(rules.map((rule) => rule.keyword))];
  const snapshots = await prisma.adKeywordSnapshot.findMany({
    where: {
      keyword: {
        in: keywords,
      },
    },
    orderBy: { collectedDate: "desc" },
  });
  const latestSnapshots = new Map<
    string,
    {
      avgCpc: number | null;
      avgRank: number | null;
    }
  >();

  for (const snapshot of snapshots) {
    if (!latestSnapshots.has(snapshot.keyword)) {
      latestSnapshots.set(snapshot.keyword, {
        avgCpc: snapshot.avgCpc,
        avgRank: snapshot.avgRank,
      });
    }
  }

  return rules.map((rule) =>
    keywordRuleFromRecord(rule, latestSnapshots.get(rule.keyword)),
  );
}

export async function getPrimaryAutomationRule() {
  const rule = await prisma.automationRule.findFirst({
    orderBy: { createdAt: "asc" },
  });

  return rule ? automationRuleFromRecord(rule) : null;
}
