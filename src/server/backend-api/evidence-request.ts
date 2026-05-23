import { NextResponse } from "next/server";
import { clearAgendaRoomViewModelCache } from "@/features/agenda-room/loadAgendaRoomViewModel";
import type { EvidenceRequestStatus } from "@/lib/domain";
import { ensureHypothesisEvidenceQueue, EvidenceRequestReviewError, reviewEvidenceRequest } from "@/lib/application/evidence-request-review";
import { createBackendWorkflowRepository } from "./repository";

type EvidenceRequestPatchBody = {
  status?: unknown;
  verificationNote?: unknown;
  verifiedEvidenceIds?: unknown;
};

export async function handleEvidenceRequestPatch(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const body = await parseBody(request);
  if (!isEvidenceRequestStatus(body.status)) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "근거 요청 상태 값이 올바르지 않습니다.",
        },
      },
      { status: 400 },
    );
  }

  const repository = createBackendWorkflowRepository({ seedSample: true });
  ensureHypothesisEvidenceQueue(repository);

  try {
    const result = reviewEvidenceRequest({
      repository,
      evidenceRequestId: id,
      status: body.status,
      verificationNote: typeof body.verificationNote === "string" ? body.verificationNote : undefined,
      verifiedEvidenceIds: parseVerifiedEvidenceIds(body.verifiedEvidenceIds),
    });
    await clearAgendaRoomViewModelCache();

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof EvidenceRequestReviewError && error.code === "NOT_FOUND") {
      return NextResponse.json(
        {
          error: {
            code: "NOT_FOUND",
            message: error.message,
          },
        },
        { status: 404 },
      );
    }

    throw error;
  }
}

async function parseBody(request: Request): Promise<EvidenceRequestPatchBody> {
  try {
    return (await request.json()) as EvidenceRequestPatchBody;
  } catch {
    return {};
  }
}

function isEvidenceRequestStatus(value: unknown): value is EvidenceRequestStatus {
  return value === "REQUESTED" || value === "COLLECTING" || value === "VERIFIED" || value === "INSUFFICIENT";
}

function parseVerifiedEvidenceIds(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  return value.filter((item): item is string => typeof item === "string");
}
