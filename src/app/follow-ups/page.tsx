import Link from "next/link";
import { ArrowLeft, ClipboardList, ShieldCheck } from "lucide-react";
import { FollowUpQueueBoard } from "@/components/follow-ups/FollowUpQueueBoard";
import { OwnerLearningPanel } from "@/components/follow-ups/OwnerLearningPanel";
import { buildFollowUpQueueViewModel } from "@/features/follow-ups/buildFollowUpQueueViewModel";
import { createLocalWorkflowRepository, seedSampleWorkflowIfEmpty } from "@/lib/persistence/workflow-store";

export const dynamic = "force-dynamic";

export default function FollowUpsPage() {
  const repository = createLocalWorkflowRepository();
  seedSampleWorkflowIfEmpty(repository);
  const viewModel = buildFollowUpQueueViewModel({ repository });

  return (
    <main className="operations-shell followups-shell">
      <header className="topbar">
        <div>
          <span className="eyebrow">후속 업무 큐</span>
          <h1>대표 결정 이후 내려간 일</h1>
          <p>승인, 보류, 근거 요청, 외부 반영 차단 결과를 담당 캐릭터의 내부 업무와 다음 추천 기준으로 이어 봅니다.</p>
        </div>
        <div className="topbar-actions">
          <span>생성 시각 {viewModel.generatedAt}</span>
          <Link className="secondary-button" href="/operations">
            <ArrowLeft size={16} aria-hidden="true" />
            업무실
          </Link>
          <Link className="primary-button" href="/operations#owner-decision-submit">
            <ShieldCheck size={16} aria-hidden="true" />
            결재 확인
          </Link>
        </div>
      </header>

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
    </main>
  );
}
