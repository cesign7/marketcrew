import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { ProductImageStudioProjectDetailArchive } from "@/components/product-image-studio/ProductImageStudioArchive";
import { ProductImageStudioShell } from "@/components/product-image-studio/ProductImageStudioShell";
import {
  createProductImageStudioArchivePageRequestOptions,
  loadProductImageStudioProjectDetailArchivePageData,
} from "@/features/product-image-studio/server/archivePageData";

type ProductImageStudioDesignDetailPageProps = {
  readonly params: Promise<{ readonly id: string }>;
};

export const dynamic = "force-dynamic";

export default async function ProductImageStudioDesignDetailPage({
  params,
}: ProductImageStudioDesignDetailPageProps) {
  const { id } = await params;
  const projectId = normalizeRouteParam(id);
  const requestOptions = createProductImageStudioArchivePageRequestOptions(await headers());
  const detail = await loadProductImageStudioProjectDetailArchivePageData(projectId, requestOptions);

  if (!detail) {
    notFound();
  }

  return (
    <ProductImageStudioShell
      activePath={`/product-image-studio/designs/${detail.project.id}`}
      description="한 디자인의 생성 이미지를 출력 타입별로 확인합니다."
      title={detail.project.name}
    >
      <section className="page-stack">
        <ProductImageStudioProjectDetailArchive project={detail.project} results={detail.results} />
      </section>
    </ProductImageStudioShell>
  );
}

function normalizeRouteParam(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch (error) {
    if (error instanceof URIError) {
      return value;
    }
    throw error;
  }
}
