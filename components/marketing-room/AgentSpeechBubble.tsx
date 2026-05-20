import type { AgentReport } from "@/lib/domain/agents";

const moodStyles: Record<AgentReport["mood"], string> = {
  calm: "border-[#b7e3db] bg-[#effbf8]",
  excited: "border-[#f7c872] bg-[#fff3d6]",
  worried: "border-[#f2b4a2] bg-[#fff0eb]",
  focused: "border-[#9cc7ff] bg-[#eef6ff]",
};

export function AgentSpeechBubble({ report }: { report: AgentReport }) {
  return (
    <div
      className={`relative rounded-3xl border p-4 text-sm font-semibold leading-6 text-[#24313b] shadow-sm ${moodStyles[report.mood]}`}
    >
      <span className="absolute -left-2 top-8 size-4 rotate-45 border-b border-l border-inherit bg-inherit" />
      {report.summary}
    </div>
  );
}
