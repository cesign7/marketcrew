import { Database, FileSearch, Link as LinkIcon, ShieldCheck } from "lucide-react";
import type { ProviderDataContractDatasetView, ProviderDataContractView } from "@/features/agenda-room/types";

type ProviderDataContractPanelProps = {
  contracts: ProviderDataContractView[];
};

export function ProviderDataContractPanel({ contracts }: ProviderDataContractPanelProps) {
  if (contracts.length === 0) {
    return null;
  }

  const contractsWithSourceFields = contracts.filter((contract) => contract.incoming.sourceFieldGroups?.length);

  return (
    <section className="data-contract-section" aria-labelledby="data-contract-title">
      <div className="section-heading compact">
        <div>
          <span className="eyebrow">데이터 명세</span>
          <h2 id="data-contract-title">불러오는 데이터와 저장하는 데이터</h2>
          <p>원문 필드 점검표를 먼저 확인하고, 그중 운영 화면에서 읽는 칼럼과 MarketCrew에 남기는 저장 칼럼을 분리해서 확인합니다.</p>
        </div>
      </div>

      <SourceFieldOverview contracts={contractsWithSourceFields} />

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

function SourceFieldOverview({ contracts }: { contracts: ProviderDataContractView[] }) {
  if (contracts.length === 0) {
    return null;
  }

  return (
    <section
      className="data-source-field-overview"
      aria-labelledby="data-source-field-overview-title"
      id="data-source-field-overview"
    >
      <header>
        <div>
          <span className="eyebrow">원문 필드 점검</span>
          <h3 id="data-source-field-overview-title">원문 필드 점검표</h3>
          <p>공식 API 응답과 브리지 계약에서 확인해야 할 원문 필드 후보입니다. 그룹을 클릭하면 펼쳐지고, 값 샘플은 노출하지 않고 처리 기준만 표시합니다.</p>
        </div>
      </header>

      <div className="data-source-provider-grid">
        {contracts.map((contract) => (
          <article className="data-source-provider-card" key={`${contract.providerKey}-${contract.channelKey}-source-fields`}>
            <header>
              <span>{contract.brandLabel ?? contract.channelLabel}</span>
              <strong>{contract.providerLabel}</strong>
            </header>
            <div className="data-source-field-list" aria-label={`${contract.providerLabel} 원문 필드 점검표`}>
              {contract.incoming.sourceFieldGroups?.map((group) => (
                <SourceFieldGroupCard group={group} key={group.id} />
              ))}
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

function SourceFieldGroupCard({
  group,
}: {
  group: NonNullable<ProviderDataContractDatasetView["sourceFieldGroups"]>[number];
}) {
  return (
    <details className="data-source-field-card">
      <summary>
        <strong>{group.title}</strong>
        <span>{group.fields.length.toLocaleString("ko-KR")}개 필드</span>
      </summary>
      <p>{group.description}</p>
      <div className="data-source-field-grid">
        {group.fields.map((item) => (
          <span key={`${group.id}-${item.key}`}>
            <small>{item.label}</small>
            <code>{item.key}</code>
            <em>{item.handling}</em>
          </span>
        ))}
      </div>
    </details>
  );
}
