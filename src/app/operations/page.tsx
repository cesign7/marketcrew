import Link from "next/link";
import { ClipboardList, ShieldCheck, UsersRound } from "lucide-react";
import { AgendaCard } from "@/components/agenda-room/AgendaCard";
import { CharacterRail } from "@/components/agenda-room/CharacterRail";
import { InboxBucketBar } from "@/components/agenda-room/InboxBucketBar";
import { AppShell } from "@/components/layout/AppShell";
import { loadAgendaRoomViewModel } from "@/features/agenda-room/loadAgendaRoomViewModel";

export const dynamic = "force-dynamic";

export default function OperationsPage() {
  const viewModel = loadAgendaRoomViewModel();

  return (
    <AppShell
      active="operations"
      actions={
        <>
          <Link className="secondary-button" href="/characters">
            <UsersRound size={16} aria-hidden="true" />
            캐릭터 보기
          </Link>
          <Link className="primary-button" href="/approvals">
            <ShieldCheck size={16} aria-hidden="true" />
            결재 검토
          </Link>
        </>
      }
      description="대표가 매일 처음 보는 화면입니다. 결재 대기, 긴급 신호, 모아 요약만 먼저 확인합니다."
      eyebrow="마켓크루 업무실"
      generatedAt={viewModel.generatedAt}
      title="오늘 업무실"
    >
      <section className="summary-strip" aria-label="오늘 업무 요약">
        <article>
          <span>승인 대기</span>
          <strong>{viewModel.summary.waitingApproval}</strong>
        </article>
        <article>
          <span>추가 근거 대기</span>
          <strong>{viewModel.summary.waitingEvidence}</strong>
        </article>
        <article>
          <span>즉시 반영 후보</span>
          <strong>{viewModel.summary.readyToApply}</strong>
        </article>
        <article>
          <span>실패 실행</span>
          <strong>{viewModel.summary.failedExecutions}</strong>
        </article>
      </section>

      <InboxBucketBar buckets={viewModel.inboxBuckets} />

      <div className="daily-brief-grid">
        <section className="moa-brief-panel" aria-labelledby="moa-brief-title">
          <span className="eyebrow">모아 종합</span>
          <h2 id="moa-brief-title">{viewModel.moaReport.title}</h2>
          <p>{viewModel.moaReport.summary}</p>
          <div className="brief-action-row">
            <Link className="secondary-button" href="/characters">
              <UsersRound size={16} aria-hidden="true" />
              직원별 보기
            </Link>
            <Link className="secondary-button" href="/follow-ups">
              <ClipboardList size={16} aria-hidden="true" />
              후속 업무
            </Link>
          </div>
        </section>

        <section className="agenda-section" aria-labelledby="agenda-section-title">
          <div className="section-heading">
            <div>
              <span className="eyebrow">하위 담당자 보고</span>
              <h2 id="agenda-section-title">오늘 결재할 안건</h2>
              <p>{viewModel.moaReport.summary}</p>
            </div>
            <div className="segmented-control" aria-label="안건 상태 필터">
              <button type="button" aria-pressed="true">
                전체
              </button>
              <button type="button">승인</button>
              <button type="button">보강</button>
              <button type="button">실패</button>
            </div>
          </div>
          <div className="agenda-list">
            {viewModel.agendaCards.slice(0, 5).map((agenda) => (
              <AgendaCard agenda={agenda} key={agenda.id} />
            ))}
          </div>
        </section>
      </div>

      <CharacterRail characters={viewModel.characters} />
    </AppShell>
  );
}
