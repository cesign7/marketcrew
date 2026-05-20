import type { RiskLevel } from "@/lib/domain/approvals";

export interface AutomationRule {
  id: string;
  name: string;
  enabled: boolean;
  maxBidChangeRate: number;
  maxDailyChangesPerKeyword: number;
  maxCpc: number;
  monthlyBudgetLimit: number;
  requiresApprovalAboveRisk: RiskLevel;
}
