import { headers } from "next/headers";
import { ProductImageStudioProjectArchive } from "@/components/product-image-studio/ProductImageStudioArchive";
import { ProductImageStudioShell } from "@/components/product-image-studio/ProductImageStudioShell";
import {
  createProductImageStudioArchivePageRequestOptions,
  loadProductImageStudioProjectArchivePageData,
} from "@/features/product-image-studio/server/archivePageData";

export const dynamic = "force-dynamic";

export default async function ProductImageStudioProjectsPage() {
  const requestOptions = createProductImageStudioArchivePageRequestOptions(await headers());
  const projects = await loadProductImageStudioProjectArchivePageData(requestOptions);

  return (
    <ProductImageStudioShell
      activePath="/product-image-studio/projects"
      description="생성한 인쇄물 프로젝트와 결과 수를 보관합니다."
      title="프로젝트"
    >
      <section className="page-stack">
        <ProductImageStudioProjectArchive projects={projects} />
      </section>
    </ProductImageStudioShell>
  );
}
