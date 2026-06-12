import type { ProductImageStudioGenerationState } from "@/features/product-image-studio/domain/generationWorkflow";

export function getProductImageStudioGenerationBlockedMessage(
  reason: ProductImageStudioGenerationState["blockedReason"],
): string {
  switch (reason) {
    case "credential_missing":
      return "이미지 생성 차단됨: provider 키가 설정되지 않았습니다.";
    case "generation_disabled":
      return "이미지 생성 차단됨: 생성 게이트가 닫혀 있습니다.";
    case "provider_not_configured":
      return "이미지 생성 차단됨: 이미지 provider가 설정되지 않았습니다.";
    case undefined:
      return "이미지 생성 차단됨: 생성 상태를 확인해 주세요.";
  }
}
