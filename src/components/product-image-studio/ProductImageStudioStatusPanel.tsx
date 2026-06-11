import type { ProductImageStudioProviderStatus } from "@/features/product-image-studio/server/providerConfig";
import styles from "./ProductImageStudioStatusPanel.module.css";

type ProductImageStudioStatusPanelProps = {
  readonly status: ProductImageStudioProviderStatus;
  readonly storageMode: ProductImageStudioStorageMode;
};

type ProductImageStudioStorageMode = "local";

type StatusCard = {
  readonly label: string;
  readonly summary: string;
  readonly tone: "blocked" | "ready" | "neutral";
  readonly value: string;
};

export function ProductImageStudioStatusPanel({ status, storageMode }: ProductImageStudioStatusPanelProps) {
  const cards = [
    toGenerationCard(status),
    toProviderCard(status),
    toStorageCard(storageMode),
    {
      label: "내보내기",
      summary: "생성 결과가 준비되면 개별 이미지와 ZIP 파일을 내려받을 수 있습니다.",
      tone: "ready",
      value: "개별/ZIP 다운로드 가능",
    },
  ] as const satisfies readonly StatusCard[];

  return (
    <section className={styles.panel} aria-label="상품 이미지 스튜디오 상태">
      <div className={styles.heading}>
        <h2>스튜디오 상태</h2>
        <p>생성 가능 여부와 저장 방식을 안전하게 확인합니다.</p>
      </div>
      <div className={styles.grid}>
        {cards.map((card) => (
          <article className={styles.card} data-tone={card.tone} key={card.label}>
            <span>{card.label}</span>
            <strong>{card.value}</strong>
            <p>{card.summary}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function toGenerationCard(status: ProductImageStudioProviderStatus): StatusCard {
  if (status.generation.status === "enabled") {
    return {
      label: "이미지 생성",
      summary: "실제 이미지 생성 요청을 보낼 준비가 되어 있습니다.",
      tone: "ready",
      value: "이미지 생성 가능",
    };
  }

  return {
    label: "이미지 생성",
    summary: getBlockedSummary(status.generation.reason),
    tone: "blocked",
    value: "이미지 생성 차단됨",
  };
}

function toProviderCard(status: ProductImageStudioProviderStatus): StatusCard {
  if (status.generation.status === "enabled") {
    return {
      label: "생성 연결",
      summary: "필요한 서버 설정이 준비되어 있습니다. 세부 값은 화면에 표시하지 않습니다.",
      tone: "ready",
      value: "생성 연결 준비됨",
    };
  }

  const value = status.provider.configured && status.provider.modelConfigured ? "생성 연결 확인 필요" : "생성 연결 설정 필요";
  return {
    label: "생성 연결",
    summary: "서버 설정 상태만 표시하며 키와 모델 값은 숨깁니다.",
    tone: "neutral",
    value,
  };
}

function toStorageCard(storageMode: ProductImageStudioStorageMode): StatusCard {
  switch (storageMode) {
    case "local":
      return {
        label: "파일 저장소",
        summary: "개발 환경에서는 업로드 파일을 로컬 저장소에 보관합니다.",
        tone: "neutral",
        value: "로컬 개발 저장소",
      };
  }
}

function getBlockedSummary(reason: Extract<ProductImageStudioProviderStatus["generation"], { readonly status: "blocked" }>["reason"]): string {
  switch (reason) {
    case "generation_disabled":
      return "생성 게이트 닫힘. 승인 전까지 실제 provider 호출은 차단됩니다.";
    case "provider_not_configured":
      return "생성 연결 설정 필요. 화면에는 설정값을 표시하지 않습니다.";
    case "credential_missing":
      return "서버 credential 확인 필요. 비밀값은 화면에 표시하지 않습니다.";
  }
}
