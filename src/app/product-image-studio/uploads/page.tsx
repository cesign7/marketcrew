import { headers } from "next/headers";
import { ProductImageStudioUploadsWorkspacePage } from "@/components/product-image-studio/ProductImageStudioUploadLibrary";
import {
  createProductImageStudioArchivePageRequestOptions,
} from "@/features/product-image-studio/server/archivePageData";
import { loadProductImageStudioUploadArchivePageData } from "@/features/product-image-studio/server/uploadArchivePageData";

export const dynamic = "force-dynamic";

export default async function ProductImageStudioUploadsPage() {
  const requestOptions = createProductImageStudioArchivePageRequestOptions(await headers());
  const uploads = await loadProductImageStudioUploadArchivePageData(requestOptions);
  return <ProductImageStudioUploadsWorkspacePage uploads={uploads} />;
}
