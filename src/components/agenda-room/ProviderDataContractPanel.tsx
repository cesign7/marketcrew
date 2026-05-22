import { Database, FileSearch, Link as LinkIcon, ShieldCheck } from "lucide-react";
import type { ProviderDataContractDatasetView, ProviderDataContractView } from "@/features/agenda-room/types";

type ProviderDataContractPanelProps = {
  contracts: ProviderDataContractView[];
};

export function ProviderDataContractPanel({ contracts }: ProviderDataContractPanelProps) {
  if (contracts.length === 0) {
    return null;
  }

  return (
    <section className="data-contract-section" aria-labelledby="data-contract-title">
      <div className="section-heading compact">
        <div>
          <span className="eyebrow">데이터 명세</span>
          <h2 id="data-contract-title">불러오는 데이터와 저장하는 데이터</h2>
          <p>각 연동이 실제로 읽는 칼럼, 화면에 보여줄 샘플, MarketCrew에 남기는 저장 칼럼을 분리해서 확인합니다.</p>
        </div>
      </div>

      <div className="data-contract-link-panel" aria-label="채널별 데이터 명세 바로가기">
        {contracts.map((contract) => (
          <article className="data-contract-link-card" key={`${contract.providerKey}-${contract.channelKey}`}>
            <div>
              <span>{contract.brandLabel ?? "광고"}</span>
              <strong>{contract.providerLabel}</strong>
            </div>
            <nav aria-label={`${contract.providerLabel} 데이터 명세`}>
              <a href={`#${contract.incoming.id}`}>
                <FileSearch size={15} aria-hidden="true" />
                불러오는 데이터
              </a>
              {contract.incoming.rawSampleRows && contract.incoming.rawSampleRows.length > 0 ? (
                <a href={`#${contract.incoming.id}-raw`}>
                  <FileSearch size={15} aria-hidden="true" />
                  로우데이터 예시
                </a>
              ) : null}
              <a href={`#${contract.stored.id}`}>
                <Database size={15} aria-hidden="true" />
                저장하는 데이터
              </a>
            </nav>
          </article>
        ))}
      </div>

      <div className="data-contract-provider-list">
        {contracts.map((contract) => (
          <article className="data-contract-provider" key={`${contract.providerKey}-${contract.channelKey}-detail`}>
            <header>
              <div>
                <span>{contract.channelLabel}</span>
                <h3>{contract.providerLabel}</h3>
              </div>
              <a className="data-contract-source-link" href={`#${contract.incoming.id}`}>
                <LinkIcon size={15} aria-hidden="true" />
                명세 보기
              </a>
            </header>
            <div className="data-contract-grid">
              <DatasetContractCard dataset={contract.incoming} tone="incoming" />
              <DatasetContractCard dataset={contract.stored} tone="stored" />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function DatasetContractCard({
  dataset,
  tone,
}: {
  dataset: ProviderDataContractDatasetView;
  tone: "incoming" | "stored";
}) {
  return (
    <section className={`data-contract-card ${tone}`} id={dataset.id} aria-labelledby={`${dataset.id}-title`}>
      <header>
        <span className="data-contract-icon">
          {tone === "incoming" ? <FileSearch size={18} aria-hidden="true" /> : <Database size={18} aria-hidden="true" />}
        </span>
        <div>
          <h4 id={`${dataset.id}-title`}>{dataset.title}</h4>
          <p>{dataset.description}</p>
        </div>
      </header>

      <div className="data-contract-safety-note">
        <ShieldCheck size={15} aria-hidden="true" />
        <span>{dataset.safetyNote}</span>
      </div>

      <div className="data-contract-table-wrap" aria-label={`${dataset.title} 칼럼 설명`}>
        <table className="data-contract-table">
          <thead>
            <tr>
              <th scope="col">칼럼</th>
              <th scope="col">설명</th>
              <th scope="col">샘플</th>
            </tr>
          </thead>
          <tbody>
            {dataset.columns.map((column) => (
              <tr key={`${dataset.id}-${column.key}`}>
                <td>
                  <code>{column.key}</code>
                  <span>{column.label}</span>
                </td>
                <td>{column.description}</td>
                <td>{column.sample}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {dataset.rawSampleRows && dataset.rawSampleRows.length > 0 ? (
        <div className="data-raw-sample-list" id={`${dataset.id}-raw`} aria-label={`${dataset.title} 로우데이터 항목 예시`}>
          <strong>로우데이터 항목 예시</strong>
          <p>API 응답에 들어올 수 있는 원천 항목 예시입니다. 아래 항목은 확인용이며 원문 그대로 저장하지 않습니다.</p>
          {dataset.rawSampleRows.map((row) => (
            <article className="data-raw-sample-card" key={row.id}>
              <header>
                <strong>{row.title}</strong>
                <span>저장 안 함</span>
              </header>
              <p>{row.description}</p>
              <div className="data-raw-field-grid">
                {row.values.map((item) => (
                  <span key={`${row.id}-${item.key}`}>
                    <small>{item.label}</small>
                    <code>{item.key}</code>
                    {item.value}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      ) : null}

      <div className="data-sample-list" aria-label={`${dataset.title} 샘플 데이터`}>
        <strong>샘플 데이터</strong>
        {dataset.sampleRows.map((row) => (
          <div className="data-sample-row" key={row.id}>
            {row.values.map((item) => (
              <span key={`${row.id}-${item.key}`}>
                <small>{item.label}</small>
                {item.value}
              </span>
            ))}
          </div>
        ))}
      </div>
    </section>
  );
}
