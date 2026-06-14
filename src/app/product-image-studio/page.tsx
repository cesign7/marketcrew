import { headers } from "next/headers";
import { ProductImageStudioHome } from "@/components/product-image-studio/ProductImageStudioHome";
import { ProductImageStudioShell } from "@/components/product-image-studio/ProductImageStudioShell";
import { getProductImageStudioFileStorageMode } from "@/features/product-image-studio/server/assetUploadApi";
import {
  createProductImageStudioArchivePageRequestOptions,
  loadProductImageStudioProjectArchivePageData,
  loadProductImageStudioResultArchivePageData,
} from "@/features/product-image-studio/server/archivePageData";
import { loadProductImageStudioProviderSettingsState } from "@/features/product-image-studio/server/providerSettingsState";
import { getProductImageStudioRepositoryStorageMode } from "@/features/product-image-studio/server/projectApi";

export const dynamic = "force-dynamic";

export default async function ProductImageStudioPage() {
  const providerSettingsState = await loadProductImageStudioProviderSettingsState();
  const archiveRequestOptions = createProductImageStudioArchivePageRequestOptions(await headers());
  const [projects, results] = await Promise.all([
    loadProductImageStudioProjectArchivePageData(archiveRequestOptions),
    loadProductImageStudioResultArchivePageData(archiveRequestOptions),
  ]);

  return (
    <ProductImageStudioShell
      activePath="/product-image-studio"
      description="자주 쓰는 작업과 최근 디자인을 한곳에서 확인합니다."
      title="홈"
    >
      <section className="page-stack">
        <ProductImageStudioHome
          fileStorageMode={getProductImageStudioFileStorageMode()}
          metadataStorageMode={getProductImageStudioRepositoryStorageMode()}
          projects={projects}
          providerStatus={providerSettingsState.status}
          results={results}
        />
      </section>
    </ProductImageStudioShell>
  );
}
