import { Ban, CheckCircle2, Clock3 } from "lucide-react";
import type { ExecutionResultView, OutcomeCheckpointView } from "@/features/agenda-room/types";

const executionIcon = {
  대기: Clock3,
  실행됨: CheckCircle2,
  차단됨: Ban,
} satisfies Record<ExecutionResultView["state"], typeof Clock3>;

type ExecutionPanelProps = {
  results: ExecutionResultView[];
  checkpoints: OutcomeCheckpointView[];
};

export function ExecutionPanel({ results, checkpoints }: ExecutionPanelProps) {
  return (
    <section className="execution-grid" aria-label="반영과 성과 추적">
      <div className="execution-column">
        <div className="section-heading compact">
          <div>
            <span className="eyebrow">승인하면 바로 반영될 작업</span>
            <h2>실행 대기열</h2>
          </div>
        </div>
        <div className="timeline-list">
          {results.map((result) => {
            const Icon = executionIcon[result.state];
            return (
              <article className={`timeline-item state-${result.state}`} key={result.id}>
                <Icon size={18} aria-hidden="true" />
                <div>
                  <strong>{result.title}</strong>
                  <p>{result.note}</p>
                </div>
                <span>{result.state}</span>
              </article>
            );
          })}
        </div>
      </div>
      <div className="execution-column">
        <div className="section-heading compact">
          <div>
            <span className="eyebrow">성과 추적</span>
            <h2>결재 후 판단 기준</h2>
          </div>
        </div>
        <div className="checkpoint-list">
          {checkpoints.map((checkpoint) => (
            <article className="checkpoint-item" key={checkpoint.id}>
              <strong>{checkpoint.title}</strong>
              <span>{checkpoint.status}</span>
              <p>{checkpoint.metric}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
