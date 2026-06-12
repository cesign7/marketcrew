import { NextResponse } from "next/server";
import { getDefaultProductImageStudioFileStore } from "@/features/product-image-studio/server/assetUploadApi";
import { proxyProductImageStudioRequestToBackend } from "@/features/product-image-studio/server/backendProxy";
import {
  ProductImageStudioDownloadError,
  createProductImageStudioZipArchiveFromStore,
} from "@/features/product-image-studio/server/downloads";
import { getProductImageStudioProjectRepository } from "@/features/product-image-studio/server/projectApi";

type ProductImageStudioDownloadRouteContext = {
  readonly params: Promise<{ readonly id: string }>;
};

export const dynamic = "force-dynamic";

export async function GET(request: Request, context: ProductImageStudioDownloadRouteContext) {
  const proxied = await proxyProductImageStudioRequestToBackend(request);
  if (proxied) {
    return proxied;
  }

  const { id } = await context.params;
  const projectId = normalizeRouteParam(id);
  const repository = getProductImageStudioProjectRepository();
  const project = await repository.getProject(projectId);
  if (!project) {
    return NextResponse.json({ error: { code: "PROJECT_NOT_FOUND", message: "프로젝트를 찾지 못했습니다." }, ok: false }, { status: 404 });
  }

  const results = await repository.listResults(project.id);
  if (results.length === 0) {
    return NextResponse.json({ error: { code: "RESULTS_NOT_READY", message: "다운로드할 생성 이미지가 없습니다." }, ok: false }, { status: 404 });
  }

  const archiveResult = await createZipArchive(project, results);
  if (!archiveResult.ok) {
    return NextResponse.json({ error: archiveResult.error, ok: false }, { status: 404 });
  }
  return new Response(toArrayBuffer(archiveResult.archive.bytes), {
    headers: {
      "content-disposition": `attachment; filename="${archiveResult.archive.fileName}"`,
      "content-type": "application/zip",
    },
    status: 200,
  });
}

async function createZipArchive(
  project: NonNullable<Awaited<ReturnType<ReturnType<typeof getProductImageStudioProjectRepository>["getProject"]>>>,
  results: Awaited<ReturnType<ReturnType<typeof getProductImageStudioProjectRepository>["listResults"]>>,
): Promise<
  | { readonly archive: Awaited<ReturnType<typeof createProductImageStudioZipArchiveFromStore>>; readonly ok: true }
  | { readonly error: { readonly code: string; readonly message: string }; readonly ok: false }
> {
  try {
    return {
      archive: await createProductImageStudioZipArchiveFromStore(project, results, getDefaultProductImageStudioFileStore()),
      ok: true,
    };
  } catch (error) {
    if (error instanceof ProductImageStudioDownloadError) {
      return { error: { code: error.code, message: error.message }, ok: false };
    }
    throw error;
  }
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buffer).set(bytes);
  return buffer;
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
