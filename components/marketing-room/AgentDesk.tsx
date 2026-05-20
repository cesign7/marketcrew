import type { AgentReport } from "@/lib/domain/agents";
import { AgentSpeechBubble } from "@/components/marketing-room/AgentSpeechBubble";

const statusLabels: Record<AgentReport["status"], string> = {
  IDLE: "대기",
  WORKING: "작업중",
  DONE: "완료",
  NEEDS_ATTENTION: "확인 필요",
};

const statusStyles: Record<AgentReport["status"], string> = {
  IDLE: "bg-[#edf1f4] text-[#687481]",
  WORKING: "bg-[#fff3d6] text-[#8a5b00]",
  DONE: "bg-[#e6f7ef] text-[#14764d]",
  NEEDS_ATTENTION: "bg-[#ffe9e0] text-[#b34526]",
};

export function AgentDesk({ report }: { report: AgentReport }) {
  return (
    <article className="grid min-h-[210px] grid-cols-[70px_1fr] gap-4 rounded-[28px] border border-[#eadfc8] bg-white p-4 shadow-[0_18px_50px_rgba(78,62,38,0.08)]">
      <div className="flex flex-col items-center gap-3">
        <div className="relative grid size-16 place-items-center rounded-[22px] bg-[#ffd7a8] shadow-inner">
          <div className="grid size-12 place-items-center rounded-full bg-[#fff8ec] text-2xl font-black text-[#de6a4b]">
            {report.characterName.slice(0, 1)}
          </div>
          <span className="absolute -bottom-2 h-3 w-12 rounded-full bg-[#c58d59]" />
        </div>
        <span
          className={`rounded-full px-3 py-1 text-[11px] font-black ${statusStyles[report.status]}`}
        >
          {statusLabels[report.status]}
        </span>
      </div>
      <div>
        <div className="mb-3">
          <h2 className="text-base font-black">{report.roleName}</h2>
          <p className="text-xs font-bold text-[#7b8791]">
            {report.characterName}의 업무 보고
          </p>
        </div>
        <AgentSpeechBubble report={report} />
      </div>
    </article>
  );
}
