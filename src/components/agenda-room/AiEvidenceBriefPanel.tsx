import { AlertTriangle, BrainCircuit, CheckCircle2, FileCheck2, ShieldAlert } from "lucide-react";
import type { AiEvidenceBriefView } from "@/features/agenda-room/types";

type AiEvidenceBriefPanelProps = {
  briefs: AiEvidenceBriefView[];
};

export function AiEvidenceBriefPanel({ briefs }: AiEvidenceBriefPanelProps) {
  return (
    <section className="ai-evidence-section" aria-labelledby="ai-evidence-title">
      <div className="section-heading compact">
        <div>
          <span className="eyebrow">AI 판독 기준</span>
          <h2 id="ai-evidence-title">AI 판독용 요약 근거</h2>
          <p>AI 모델이 원천 행을 직접 읽지 않고 판단해도 되는 범위와 반드시 막아야 할 판단을 근거별로 표시합니다.</p>
        </div>
      </div>

      {briefs.length > 0 ? (
        <div className="ai-evidence-grid">
          {briefs.map((brief) => (
            <article className={`ai-evidence-card evidence-${brief.tone}`} key={brief.id}>
              <header>
                <span className="ai-evidence-icon">
                  <EvidenceIcon tone={brief.tone} />
                </span>
                <div>
                  <span>{brief.channelLabel}</span>
                  <h3>{brief.title}</h3>
                </div>
                <strong>{brief.decisionLabel}</strong>
              </header>

              <p>{brief.summary}</p>

              <div className="ai-evidence-policy">
                <FileCheck2 size={15} aria-hidden="true" />
                <span>{brief.rawDataPolicyLabel}</span>
              </div>

              <div className="ai-evidence-lists">
                <div aria-label={`${brief.title} 가능한 판단`}>
                  <span>가능한 판단</span>
                  {brief.allowedUseCases.map((item) => (
                    <em key={`${brief.id}-allow-${item}`}>{item}</em>
                  ))}
                </div>
                <div aria-label={`${brief.title} 막아야 할 판단`}>
                  <span>막아야 할 판단</span>
                  {brief.blockedUseCases.map((item) => (
                    <em key={`${brief.id}-block-${item}`}>{item}</em>
                  ))}
                </div>
              </div>

              <footer>
                <span>{brief.checkedAt}</span>
                <span>근거 {brief.evidenceIds.length.toLocaleString("ko-KR")}개</span>
                <span>수집 {brief.sourceReportIds.length.toLocaleString("ko-KR")}건</span>
              </footer>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-panel">
          <BrainCircuit size={18} aria-hidden="true" />
          <p>AI가 읽을 수 있는 요약 근거가 아직 없습니다. 읽기 전용 수집을 먼저 실행해야 합니다.</p>
        </div>
      )}
    </section>
  );
}

function EvidenceIcon({ tone }: { tone: AiEvidenceBriefView["tone"] }) {
  if (tone === "ready") {
    return <CheckCircle2 size={18} aria-hidden="true" />;
  }

  if (tone === "blocked") {
    return <ShieldAlert size={18} aria-hidden="true" />;
  }

  return <AlertTriangle size={18} aria-hidden="true" />;
}
