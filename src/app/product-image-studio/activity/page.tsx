import { headers } from "next/headers";
import { ProductImageStudioActivityWorkspacePage } from "@/components/product-image-studio/ProductImageStudioWorkspaceSupportPages";
import {
  createProductImageStudioArchivePageRequestOptions,
  loadProductImageStudioResultArchivePageData,
} from "@/features/product-image-studio/server/archivePageData";

export const dynamic = "force-dynamic";

export default async function ProductImageStudioActivityPage() {
  const requestOptions = createProductImageStudioArchivePageRequestOptions(await headers());
  const results = await loadProductImageStudioResultArchivePageData(requestOptions);

  return <ProductImageStudioActivityWorkspacePage results={results} />;
}
