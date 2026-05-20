import type { RiskLevel } from "@/lib/domain/approvals";

export interface AutomationRule {
  id: string;
  name: string;
  enabled: boolean;
  maxBidChangeRate: number;
  maxDailyChangesPerKeyword: number;
  maxCpc: number | null;
  monthlyBudgetLimit: number | null;
  requiresApprovalAboveRisk: RiskLevel;
}
