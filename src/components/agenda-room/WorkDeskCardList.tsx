import Link from "next/link";
import { ArrowRight, ClipboardCheck, FileSearch, ShieldCheck } from "lucide-react";
import type { WorkDeskCardView } from "@/features/agenda-room/types";

type WorkDeskCardListProps = {
  cards: WorkDeskCardView[];
  eyebrow?: string;
  title: string;
  description?: string;
  emptyMessage?: string;
  limit?: number;
};

export function WorkDeskCardList({
  cards,
  eyebrow = "업무카드",
  title,
  description,
  emptyMessage = "현재 표시할 업무카드가 없습니다.",
  limit,
}: WorkDeskCardListProps) {
  const visibleCards = typeof limit === "number" ? cards.slice(0, limit) : cards;

  return (
    <section className="work-desk-card-section" aria-labelledby="work-desk-card-title">
      <div className="section-heading compact">
        <div>
          <span className="eyebrow">{eyebrow}</span>
          <h2 id="work-desk-card-title">{title}</h2>
          {description ? <p>{description}</p> : null}
        </div>
        <span className="work-desk-count">{cards.length.toLocaleString("ko-KR")}건</span>
      </div>

      {visibleCards.length > 0 ? (
        <div className="work-desk-card-grid">
          {visibleCards.map((card) => (
            <WorkDeskCard card={card} key={card.id} />
          ))}
        </div>
      ) : (
        <p className="work-desk-empty">{emptyMessage}</p>
      )}
    </section>
  );
}

function WorkDeskCard({ card }: { card: WorkDeskCardView }) {
  return (
    <article className="work-desk-card">
      <header>
        <div className="work-desk-badges">
          <span>{card.brandLabel}</span>
          <span>{card.domainLabel}</span>
          <span>{card.ownerName}</span>
        </div>
        <span className={`work-desk-priority priority-${card.priorityLabel}`}>{card.priorityLabel}</span>
      </header>

      <div className="work-desk-main">
        <span className="work-desk-keyword">{card.keywordLabel}</span>
        <h3>{card.title}</h3>
        <p>{card.diagnosisLabel}</p>
      </div>

      <div className="work-desk-metrics" aria-label={`${card.keywordLabel} 성과`}>
        {card.metricLabels.map((metric) => (
          <span key={`${card.id}-metric-${metric}`}>{metric}</span>
        ))}
      </div>

      <div className="work-desk-context" aria-label={`${card.keywordLabel} 광고 위치`}>
        {card.contextLabels.map((context) => (
          <span key={`${card.id}-context-${context}`}>{context}</span>
        ))}
      </div>

      <section className="work-desk-action" aria-label={`${card.keywordLabel} 제안 조치`}>
        <strong>{card.recommendedActionLabel}</strong>
        <p>{card.reasonLabel}</p>
      </section>

      <section className="work-desk-delegation" aria-label={`${card.keywordLabel} 처리 경로`}>
        <span>
          <ShieldCheck size={14} aria-hidden="true" />
          {card.delegation.label}
        </span>
        <p>{card.delegation.summary}</p>
        <small>{card.delegation.ruleHint}</small>
      </section>

      <footer>
        <span>
          <FileSearch size={14} aria-hidden="true" />
          근거 {card.evidenceLabels.length.toLocaleString("ko-KR")}개
        </span>
        <span>
          <ClipboardCheck size={14} aria-hidden="true" />
          {card.routeLabel}
        </span>
        {card.detailHref ? (
          <Link href={card.detailHref}>
            상세
            <ArrowRight size={14} aria-hidden="true" />
          </Link>
        ) : null}
      </footer>
    </article>
  );
}
