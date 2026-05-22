import Link from "next/link";
import { AlertTriangle, ClipboardList, UserRoundCheck } from "lucide-react";
import type { FollowUpQueueViewModel } from "@/features/follow-ups/types";
import { FollowUpTaskStatusButton } from "./FollowUpTaskStatusButton";

type FollowUpQueueBoardProps = {
  queues: FollowUpQueueViewModel["characterQueues"];
};

export function FollowUpQueueBoard({ queues }: FollowUpQueueBoardProps) {
  return (
    <section className="followup-board-section" aria-labelledby="followup-board-title">
      <div className="section-heading compact">
        <div>
          <span className="eyebrow">캐릭터별 내부 업무</span>
          <h2 id="followup-board-title">대표 결정 이후 내려간 후속 업무 큐</h2>
          <p>결재 결과가 사라지지 않고 담당 캐릭터의 다음 일로 남는지 확인합니다.</p>
        </div>
      </div>

      <div className="followup-board">
        {queues.map((queue) => (
          <article className="followup-column" key={queue.character}>
            <header>
              <div className="avatar">{queue.name.slice(0, 1)}</div>
              <div>
                <strong>{queue.name}</strong>
                <p>{queue.role}</p>
              </div>
              <span>{queue.priorityLabel}</span>
            </header>

            {queue.tasks.length > 0 ? (
              <div className="followup-task-list">
                {queue.tasks.map((task) => (
                  <article className={`followup-task followup-${task.tone}`} key={task.id}>
                    <div className="followup-task-header">
                      <span className="status-pill">
                        <ClipboardList size={14} aria-hidden="true" />
                        {task.statusLabel}
                      </span>
                      <span>{task.createdAt}</span>
                    </div>
                    <h3>{task.title}</h3>
                    <div className="followup-task-meta">
                      <Link href={task.sourceApprovalHref}>{task.sourceApprovalTitle}</Link>
                      <span>{task.sourceApprovalStatusLabel}</span>
                      <span>{task.latestDecisionLabel}</span>
                      <span>{task.latestOutcomeLabel}</span>
                    </div>
                    {task.latestDecisionMemo ? <p className="followup-memo">대표 메모: {task.latestDecisionMemo}</p> : null}
                    {task.blockerLabels.length > 0 ? (
                      <div className="followup-blockers" aria-label={`${task.id} 차단 사유`}>
                        {task.blockerLabels.map((blocker) => (
                          <span key={`${task.id}-${blocker}`}>
                            <AlertTriangle size={13} aria-hidden="true" />
                            {blocker}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    <div className="followup-learning">
                      <UserRoundCheck size={16} aria-hidden="true" />
                      <div>
                        <strong>{task.nextActionLabel}</strong>
                        <p>{task.learningNote}</p>
                      </div>
                    </div>
                    <FollowUpTaskStatusButton status={task.status} taskId={task.id} />
                  </article>
                ))}
              </div>
            ) : (
              <p className="followup-empty">현재 담당 후속 업무가 없습니다.</p>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
