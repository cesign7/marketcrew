import { BrainCircuit } from "lucide-react";
import type { FollowUpQueueViewModel } from "@/features/follow-ups/types";

type OwnerLearningPanelProps = {
  signals: FollowUpQueueViewModel["ownerLearningSignals"];
};

export function OwnerLearningPanel({ signals }: OwnerLearningPanelProps) {
  return (
    <section className="owner-learning-section" aria-labelledby="owner-learning-title">
      <div className="section-heading compact">
        <div>
          <span className="eyebrow">대표 결정 학습</span>
          <h2 id="owner-learning-title">대표 결정이 다음 추천에 남기는 기준</h2>
          <p>대표의 결정, 메모, 차단 사유, 성과 보류 상태를 다음 안건 추천 기준으로 요약합니다.</p>
        </div>
      </div>

      <div className="owner-learning-grid">
        {signals.map((signal) => (
          <article className={`owner-learning-card learning-${signal.tone}`} key={signal.id}>
            <header>
              <span className="owner-learning-icon">
                <BrainCircuit size={17} aria-hidden="true" />
              </span>
              <div>
                <strong>{signal.label}</strong>
                <span>{signal.value}</span>
              </div>
            </header>
            <p>{signal.detail}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
