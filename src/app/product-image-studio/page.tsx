import { ProductImageStudioShell } from "@/components/product-image-studio/ProductImageStudioShell";
import { ProductImageStudioStatusPanel } from "@/components/product-image-studio/ProductImageStudioStatusPanel";
import { ProductImageStudioWizard } from "@/components/product-image-studio/ProductImageStudioWizard";
import { getProductImageStudioFileStorageMode } from "@/features/product-image-studio/server/assetUploadApi";
import { getProductImageStudioProviderStatus } from "@/features/product-image-studio/server/providerConfig";
import { getProductImageStudioRepositoryStorageMode } from "@/features/product-image-studio/server/projectApi";

export const dynamic = "force-dynamic";

export default function ProductImageStudioPage() {
  return (
    <ProductImageStudioShell
      activePath="/product-image-studio"
      description="카드, 봉투, 봉합스티커 세트를 상품 사진으로 준비합니다."
      title="상품 이미지 스튜디오"
    >
      <section className="page-stack">
        <ProductImageStudioStatusPanel
          fileStorageMode={getProductImageStudioFileStorageMode()}
          metadataStorageMode={getProductImageStudioRepositoryStorageMode()}
          status={getProductImageStudioProviderStatus()}
        />
        <ProductImageStudioWizard />
      </section>
    </ProductImageStudioShell>
  );
}
