import Link from "next/link";
import { AlertTriangle, Check, FileSearch, ShieldCheck } from "lucide-react";
import type { AgendaCardView } from "@/features/agenda-room/types";

const statusIcon = {
  "승인 대기": Check,
  "근거 보강": FileSearch,
  "실패 확인": AlertTriangle,
  "성과 관찰": ShieldCheck,
} satisfies Record<AgendaCardView["status"], typeof Check>;

type AgendaCardProps = {
  agenda: AgendaCardView;
};

export function AgendaCard({ agenda }: AgendaCardProps) {
  const Icon = statusIcon[agenda.status];

  return (
    <article className="agenda-card">
      <header className="agenda-card-header">
        <div>
          <span className={`status-pill status-${agenda.status.replaceAll(" ", "-")}`}>
            <Icon size={14} aria-hidden="true" />
            {agenda.status}
          </span>
          <h3>
            <Link href={`/approvals/${agenda.id}`}>{agenda.title}</Link>
          </h3>
        </div>
        <div className="agenda-meta">
          <strong>{agenda.owner}</strong>
          <span>{agenda.createdAt}</span>
        </div>
      </header>
      <dl className="agenda-details">
        <div>
          <dt>출처</dt>
          <dd>{agenda.source}</dd>
        </div>
        <div>
          <dt>시그널</dt>
          <dd>{agenda.signal}</dd>
        </div>
        <div>
          <dt>승인 시 반영</dt>
          <dd>{agenda.decision}</dd>
        </div>
        <div>
          <dt>범위</dt>
          <dd>{agenda.applyScope}</dd>
        </div>
      </dl>
      <footer className="agenda-footer">
        <span>{agenda.expectedImpact}</span>
        <span>근거 {agenda.evidenceCount}개</span>
      </footer>
    </article>
  );
}
