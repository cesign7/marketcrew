import { headers } from "next/headers";
import { ProductImageStudioResultArchive } from "@/components/product-image-studio/ProductImageStudioArchive";
import { ProductImageStudioShell } from "@/components/product-image-studio/ProductImageStudioShell";
import {
  createProductImageStudioArchivePageRequestOptions,
  loadProductImageStudioResultArchivePageData,
} from "@/features/product-image-studio/server/archivePageData";

export const dynamic = "force-dynamic";

export default async function ProductImageStudioResultsPage() {
  const requestOptions = createProductImageStudioArchivePageRequestOptions(await headers());
  const results = await loadProductImageStudioResultArchivePageData(requestOptions);

  return (
    <ProductImageStudioShell
      activePath="/product-image-studio/results"
      description="최근 생성 결과와 변환 파일을 한곳에서 확인합니다."
      title="결과 보관함"
    >
      <section className="page-stack">
        <ProductImageStudioResultArchive results={results} />
      </section>
    </ProductImageStudioShell>
  );
}
