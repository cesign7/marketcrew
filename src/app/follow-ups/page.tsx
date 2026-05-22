import Link from "next/link";
import { ClipboardList, ShieldCheck } from "lucide-react";
import { FollowUpQueueBoard } from "@/components/follow-ups/FollowUpQueueBoard";
import { OwnerLearningPanel } from "@/components/follow-ups/OwnerLearningPanel";
import { AppShell } from "@/components/layout/AppShell";
import { loadWorkflowReadRepository } from "@/features/agenda-room/loadAgendaRoomViewModel";
import { buildFollowUpQueueViewModel } from "@/features/follow-ups/buildFollowUpQueueViewModel";

export const dynamic = "force-dynamic";

export default async function FollowUpsPage() {
  const repository = await loadWorkflowReadRepository({ seedSample: true });
  const viewModel = buildFollowUpQueueViewModel({ repository });

  return (
    <AppShell
      active="approvals"
      actions={
        <Link className="primary-button" href="/approvals">
          <ShieldCheck size={16} aria-hidden="true" />
          결재 확인
        </Link>
      }
      description="승인, 보류, 근거 요청, 외부 반영 차단 결과를 담당 캐릭터의 내부 업무와 다음 추천 기준으로 이어 봅니다."
      eyebrow="후속 업무 큐"
      generatedAt={viewModel.generatedAt}
      title="대표 결정 이후 내려간 일"
    >
      <section className="summary-strip" aria-label="후속 업무 요약">
        <article>
          <span>열린 후속 업무</span>
          <strong>{viewModel.summary.openTasks}</strong>
        </article>
        <article>
          <span>완료된 후속 업무</span>
          <strong>{viewModel.summary.doneTasks}</strong>
        </article>
        <article>
          <span>연결된 결재안</span>
          <strong>{viewModel.summary.sourceApprovals}</strong>
        </article>
        <article>
          <span>학습 신호</span>
          <strong>{viewModel.summary.learningSignals}</strong>
        </article>
      </section>

      <div className="followup-hero-band">
        <ClipboardList size={22} aria-hidden="true" />
        <div>
          <strong>후속 업무는 자동 실행이 아니라 내부 책임 추적입니다.</strong>
          <p>외부 반영은 닫힌 상태를 유지하고, 대표 결정의 다음 조치만 담당 캐릭터에게 남깁니다.</p>
        </div>
      </div>

      <OwnerLearningPanel signals={viewModel.ownerLearningSignals} />
      <FollowUpQueueBoard queues={viewModel.characterQueues} />
    </AppShell>
  );
}
