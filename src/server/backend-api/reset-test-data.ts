import { NextResponse } from "next/server";
import { clearAgendaRoomViewModelCache } from "@/features/agenda-room/loadAgendaRoomViewModel";
import {
  buildWorkflowResetPreview,
  isValidWorkflowResetConfirmation,
  WORKFLOW_RESET_CONFIRMATION,
  WORKFLOW_RESET_PRESERVED_COLLECTIONS,
  WORKFLOW_RESETTABLE_COLLECTIONS,
} from "@/lib/application/workflow-reset-policy";
import { readWorkflowRepositoryState } from "@/lib/application/workflow-state";
import { resetPostgresWorkflowCollections } from "@/lib/persistence/postgres-repository";
import { getWorkflowDatabaseUrl, getWorkflowRepositoryMode } from "@/lib/persistence/workflow-store";
import { createBackendWorkflowRepository } from "./repository";

export function handleGetResetTestData() {
  const repository = createBackendWorkflowRepository();
  const state = readWorkflowRepositoryState(repository);
  const preview = buildWorkflowResetPreview(state);

  return NextResponse.json({
    ok: true,
    status: "PREVIEW",
    mode: getWorkflowRepositoryMode(),
    message: "운영 전 테스트 데이터 초기화 미리보기입니다. 설정값은 보존합니다.",
    preview,
  });
}

export async function handlePostResetTestData(request: Request) {
  const body = await readJsonBody(request);
  if (!isValidWorkflowResetConfirmation(body.confirmation)) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "CONFIRMATION_REQUIRED",
          message: "초기화하려면 정확한 확인 문구가 필요합니다.",
          requiredConfirmation: WORKFLOW_RESET_CONFIRMATION,
        },
      },
      { status: 400 },
    );
  }

  const repositoryMode = getWorkflowRepositoryMode();
  if (repositoryMode !== "db") {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "DB_MODE_REQUIRED",
          message: "테스트 데이터 초기화는 Railway/Postgres 운영 저장소에서만 실행합니다.",
        },
      },
      { status: 409 },
    );
  }

  const databaseUrl = getWorkflowDatabaseUrl();
  if (!databaseUrl) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "DATABASE_URL_REQUIRED",
          message: "MARKETCREW_DATABASE_URL 또는 DATABASE_URL이 필요합니다.",
        },
      },
      { status: 500 },
    );
  }

  const beforePreview = buildWorkflowResetPreview(readWorkflowRepositoryState(createBackendWorkflowRepository()));
  const result = resetPostgresWorkflowCollections({
    databaseUrl,
    collections: WORKFLOW_RESETTABLE_COLLECTIONS,
    dryRun: false,
  });
  await clearAgendaRoomViewModelCache({ remoteWorkflowState: false });

  return NextResponse.json({
    ok: true,
    status: "RESET",
    message: "테스트 데이터 초기화가 완료되었습니다. 인사과/AI 예산 설정은 보존했습니다.",
    preservedCollections: WORKFLOW_RESET_PRESERVED_COLLECTIONS,
    resettableCollections: WORKFLOW_RESETTABLE_COLLECTIONS,
    beforePreview,
    result,
  });
}

async function readJsonBody(request: Request): Promise<{ confirmation?: unknown }> {
  try {
    const parsed = await request.json();
    return parsed && typeof parsed === "object" ? (parsed as { confirmation?: unknown }) : {};
  } catch {
    return {};
  }
}
