import { CheckCircle2, ClipboardCheck, SearchCheck, ShieldAlert } from "lucide-react";
import type { EvidenceRequestQueueView } from "@/features/agenda-room/types";
import { EvidenceRequestReviewActions } from "./EvidenceRequestReviewActions";

type EvidenceRequestQueuePanelProps = {
  queue: EvidenceRequestQueueView;
};

export function EvidenceRequestQueuePanel({ queue }: EvidenceRequestQueuePanelProps) {
  return (
    <section className="evidence-request-section" aria-labelledby="evidence-request-title">
      <div className="section-heading compact">
        <div>
          <span className="eyebrow">자유 탐색 가드</span>
          <h2 id="evidence-request-title">{queue.title}</h2>
          <p>{queue.guardrailLabel}</p>
        </div>
        <strong className="queue-summary-label">{queue.summaryLabel}</strong>
      </div>

      {queue.items.length > 0 ? (
        <div className="evidence-request-grid">
          {queue.items.map((item) => (
            <article className={`evidence-request-card request-${item.tone}`} key={item.id}>
              <header>
                <span className="evidence-request-icon">
                  <EvidenceRequestIcon tone={item.tone} />
                </span>
                <div>
                  <span>{item.ownerName} 제안 · {item.verifierName} 확인</span>
                  <h3>{item.title}</h3>
                </div>
                <strong>{item.statusLabel}</strong>
              </header>

              <p>{item.hypothesis}</p>

              <div className="evidence-request-meta">
                <span>{item.promotionLabel}</span>
                <span>{item.comparisonWindow}</span>
                {item.evidenceLabels.map((label) => (
                  <span key={`${item.id}-${label}`}>{label}</span>
                ))}
              </div>

              <div className="evidence-request-fields">
                <strong>확인할 근거</strong>
                <div>
                  {item.requestedFields.map((field) => (
                    <span key={`${item.id}-${field}`}>{field}</span>
                  ))}
                </div>
              </div>

              <footer>{item.reason}</footer>
              <EvidenceRequestReviewActions requestId={item.id} requestStatus={item.requestStatus} />
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-panel">
          <ClipboardCheck size={18} aria-hidden="true" />
          <p>검증 대기 중인 자유 탐색 가설이 없습니다.</p>
        </div>
      )}
    </section>
  );
}

function EvidenceRequestIcon({ tone }: { tone: EvidenceRequestQueueView["items"][number]["tone"] }) {
  if (tone === "ready") {
    return <CheckCircle2 size={18} aria-hidden="true" />;
  }

  if (tone === "blocked") {
    return <ShieldAlert size={18} aria-hidden="true" />;
  }

  return <SearchCheck size={18} aria-hidden="true" />;
}
