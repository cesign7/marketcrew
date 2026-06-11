import { NextResponse } from "next/server";
import { createProductImageStudioZipArchive } from "@/features/product-image-studio/server/downloads";
import { getProductImageStudioProjectRepository } from "@/features/product-image-studio/server/projectApi";

type ProductImageStudioDownloadRouteContext = {
  readonly params: Promise<{ readonly id: string }>;
};

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: ProductImageStudioDownloadRouteContext) {
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

  const archive = createProductImageStudioZipArchive(project, results);
  return new Response(toArrayBuffer(archive.bytes), {
    headers: {
      "content-disposition": `attachment; filename="${archive.fileName}"`,
      "content-type": "application/zip",
    },
    status: 200,
  });
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
