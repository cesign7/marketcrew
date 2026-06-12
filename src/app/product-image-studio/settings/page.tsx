import { ProductImageStudioProviderSettingsForm } from "@/components/product-image-studio/ProductImageStudioProviderSettingsForm";
import { ProductImageStudioShell } from "@/components/product-image-studio/ProductImageStudioShell";
import { ProductImageStudioStatusPanel } from "@/components/product-image-studio/ProductImageStudioStatusPanel";
import { getProductImageStudioFileStorageMode } from "@/features/product-image-studio/server/assetUploadApi";
import { loadProductImageStudioProviderSettingsState } from "@/features/product-image-studio/server/providerSettingsState";
import { getProductImageStudioRepositoryStorageMode } from "@/features/product-image-studio/server/projectApi";

export const dynamic = "force-dynamic";

export default async function ProductImageStudioSettingsPage() {
  const providerSettingsState = await loadProductImageStudioProviderSettingsState();

  return (
    <ProductImageStudioShell
      activePath="/product-image-studio/settings"
      description="AI provider 키와 실제 생성 호출 여부를 관리합니다."
      title="이미지 설정"
    >
      <section className="page-stack">
        <ProductImageStudioStatusPanel
          fileStorageMode={getProductImageStudioFileStorageMode()}
          metadataStorageMode={getProductImageStudioRepositoryStorageMode()}
          status={providerSettingsState.status}
        />
        <ProductImageStudioProviderSettingsForm
          initialSettings={providerSettingsState.settings}
          initialStorageMode={providerSettingsState.storageMode}
        />
      </section>
    </ProductImageStudioShell>
  );
}
