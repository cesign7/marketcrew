import { ProductImageStudioShell } from "@/components/product-image-studio/ProductImageStudioShell";
import { ProductImageStudioStatusPanel } from "@/components/product-image-studio/ProductImageStudioStatusPanel";
import { ProductImageStudioWizard } from "@/components/product-image-studio/ProductImageStudioWizard";
import { getProductImageStudioFileStorageMode } from "@/features/product-image-studio/server/assetUploadApi";
import { loadProductImageStudioProviderSettingsState } from "@/features/product-image-studio/server/providerSettingsState";
import { getProductImageStudioRepositoryStorageMode } from "@/features/product-image-studio/server/projectApi";

export const dynamic = "force-dynamic";

export default async function ProductImageStudioProductStagingPage() {
  const providerSettingsState = await loadProductImageStudioProviderSettingsState();

  return (
    <ProductImageStudioShell
      activePath="/product-image-studio/ai-tools/product-staging"
      description="업로드한 디자인과 실제 규격을 바탕으로 상품 설정샷을 만듭니다."
      title="상품 설정샷 생성"
    >
      <section className="page-stack">
        <ProductImageStudioStatusPanel
          fileStorageMode={getProductImageStudioFileStorageMode()}
          metadataStorageMode={getProductImageStudioRepositoryStorageMode()}
          status={providerSettingsState.status}
        />
        <ProductImageStudioWizard
          initialProviderSettings={providerSettingsState.settings}
          providerStatus={providerSettingsState.status}
        />
      </section>
    </ProductImageStudioShell>
  );
}
