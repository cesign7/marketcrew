import { NextResponse } from "next/server";
import { clearAgendaRoomViewModelCache } from "@/features/agenda-room/loadAgendaRoomViewModel";
import { proxyRequestToBackend } from "@/lib/backend/proxy";
import type { FollowUpInternalTask } from "@/lib/domain";
import { createLocalWorkflowRepository, seedSampleWorkflowIfEmpty } from "@/lib/persistence/workflow-store";

type FollowUpRouteContext = {
  params: Promise<{ id: string }>;
};

type FollowUpPatchBody = {
  status?: unknown;
};

export async function PATCH(request: Request, context: FollowUpRouteContext) {
  const proxied = await proxyRequestToBackend(request, undefined, { failClosed: true });
  if (proxied) {
    clearAgendaRoomViewModelCache();
    return proxied;
  }

  const { id } = await context.params;
  const body = await parseBody(request);
  if (!isFollowUpStatus(body.status)) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "후속 업무 상태 값이 올바르지 않습니다.",
        },
      },
      { status: 400 },
    );
  }

  const repository = createLocalWorkflowRepository();
  seedSampleWorkflowIfEmpty(repository);
  const task = repository.listFollowUpInternalTasks().find((item) => item.id === id);
  if (!task) {
    return NextResponse.json(
      {
        error: {
          code: "NOT_FOUND",
          message: "후속 업무를 찾을 수 없습니다.",
        },
      },
      { status: 404 },
    );
  }

  const updatedTask: FollowUpInternalTask = {
    ...task,
    status: body.status,
  };
  repository.saveFollowUpInternalTasks([updatedTask]);
  clearAgendaRoomViewModelCache();

  return NextResponse.json({ task: updatedTask });
}

async function parseBody(request: Request): Promise<FollowUpPatchBody> {
  try {
    return (await request.json()) as FollowUpPatchBody;
  } catch {
    return {};
  }
}

function isFollowUpStatus(value: unknown): value is FollowUpInternalTask["status"] {
  return value === "OPEN" || value === "DONE";
}
