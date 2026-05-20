import { ApprovalQueue } from "@/components/approvals/ApprovalQueue";
import { AppShell } from "@/components/layout/AppShell";
import { mockActionProposals } from "@/lib/mock/marketingOperationsMock";

export default function ApprovalsPage() {
  return (
    <AppShell>
      <div className="mb-5">
        <h2 className="text-2xl font-black tracking-tight">승인실</h2>
        <p className="mt-2 text-sm font-semibold text-[#69727c]">
          자동 실행 범위를 벗어난 작업은 여기에서 승인하거나 보류합니다.
        </p>
      </div>
      <ApprovalQueue proposals={mockActionProposals} />
    </AppShell>
  );
}
