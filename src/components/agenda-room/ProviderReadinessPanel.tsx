import { AlertTriangle, CheckCircle2, Lock, ServerCog } from "lucide-react";
import type { ProviderReadinessView } from "@/features/agenda-room/types";

type ProviderReadinessPanelProps = {
  providers: ProviderReadinessView[];
};

export function ProviderReadinessPanel({ providers }: ProviderReadinessPanelProps) {
  return (
    <section className="provider-readiness-section" aria-labelledby="provider-readiness-title">
      <div className="section-heading compact">
        <div>
          <span className="eyebrow">연동 준비상태</span>
          <h2 id="provider-readiness-title">읽기 가능 채널과 쓰기 잠금</h2>
          <p>설정이 없어도 업무실은 샘플/캐시 근거로 동작하고, 외부 변경은 잠금이 열리기 전까지 차단됩니다.</p>
        </div>
      </div>
      <div className="provider-readiness-grid">
        {providers.map((provider) => (
          <article className={`provider-card provider-${provider.tone}`} key={provider.id}>
            <header>
              <span className="provider-icon">
                <ProviderIcon tone={provider.tone} />
              </span>
              <div>
                <strong>{provider.label}</strong>
                <span>{provider.statusLabel}</span>
              </div>
            </header>
            <div className="provider-state-row">
              <span>{provider.canReadLabel}</span>
              <span>{provider.canWriteLabel}</span>
            </div>
            <p>{provider.readScope}</p>
            <p>{provider.writeScope}</p>
            {provider.missingEnvKeys.length > 0 ? (
              <div className="missing-env-list" aria-label={`${provider.label} 누락 환경변수`}>
                {provider.missingEnvKeys.map((key) => (
                  <code key={key}>{key}</code>
                ))}
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}

function ProviderIcon({ tone }: { tone: ProviderReadinessView["tone"] }) {
  if (tone === "ready") {
    return <CheckCircle2 size={18} aria-hidden="true" />;
  }

  if (tone === "warning") {
    return <Lock size={18} aria-hidden="true" />;
  }

  if (tone === "blocked") {
    return <AlertTriangle size={18} aria-hidden="true" />;
  }

  return <ServerCog size={18} aria-hidden="true" />;
}
