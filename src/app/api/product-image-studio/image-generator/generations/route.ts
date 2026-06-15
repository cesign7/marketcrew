import { proxyProductImageStudioRequestToBackend } from "@/features/product-image-studio/server/backendProxy";
import { handleProductImageStudioImageGeneratorGeneration } from "@/features/product-image-studio/server/imageGeneratorRunner";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(request: Request): Promise<Response> {
  const proxied = await proxyProductImageStudioRequestToBackend(request);
  if (proxied) {
    return proxied;
  }

  return handleProductImageStudioImageGeneratorGeneration(request);
}
