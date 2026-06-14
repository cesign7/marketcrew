import { headers } from "next/headers";
import { ProductImageStudioProjectArchive } from "@/components/product-image-studio/ProductImageStudioArchive";
import { ProductImageStudioShell } from "@/components/product-image-studio/ProductImageStudioShell";
import {
  createProductImageStudioArchivePageRequestOptions,
  loadProductImageStudioProjectArchivePageData,
} from "@/features/product-image-studio/server/archivePageData";

export const dynamic = "force-dynamic";

export default async function ProductImageStudioDesignsPage() {
  const requestOptions = createProductImageStudioArchivePageRequestOptions(await headers());
  const projects = await loadProductImageStudioProjectArchivePageData(requestOptions);

  return (
    <ProductImageStudioShell
      activePath="/product-image-studio/designs"
      description="저장한 디자인과 생성 결과 수를 확인합니다."
      title="디자인"
    >
      <section className="page-stack">
        <ProductImageStudioProjectArchive projects={projects} />
      </section>
    </ProductImageStudioShell>
  );
}
