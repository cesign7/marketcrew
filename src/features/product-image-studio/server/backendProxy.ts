import { proxyRequestToBackend } from "@/lib/backend/proxy";

const PRODUCT_IMAGE_STUDIO_BACKEND_PROXY_TIMEOUT_MS = 125_000;

export function proxyProductImageStudioRequestToBackend(request: Request) {
  return proxyRequestToBackend(request, undefined, {
    failClosed: true,
    timeoutMs: PRODUCT_IMAGE_STUDIO_BACKEND_PROXY_TIMEOUT_MS,
  });
}
