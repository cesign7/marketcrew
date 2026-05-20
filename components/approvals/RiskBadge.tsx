import type { RiskLevel } from "@/lib/domain/approvals";

const riskStyles: Record<RiskLevel, string> = {
  LOW: "bg-[#e6f7ef] text-[#14764d]",
  MEDIUM: "bg-[#fff3d6] text-[#8a5b00]",
  HIGH: "bg-[#ffe9e0] text-[#b34526]",
};

const riskLabels: Record<RiskLevel, string> = {
  LOW: "저위험",
  MEDIUM: "중위험",
  HIGH: "고위험",
};

export function RiskBadge({ riskLevel }: { riskLevel: RiskLevel }) {
  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-black ${riskStyles[riskLevel]}`}
    >
      {riskLabels[riskLevel]}
    </span>
  );
}
