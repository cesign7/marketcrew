import { NextResponse } from "next/server";
import { clearAgendaRoomViewModelCache } from "@/features/agenda-room/loadAgendaRoomViewModel";
import type { FollowUpInternalTask } from "@/lib/domain";
import { createBackendWorkflowRepository } from "./repository";

type FollowUpPatchBody = {
  status?: unknown;
};

export async function handleFollowUpPatch(request: Request, context: { params: Promise<{ id: string }> }) {
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

  const repository = createBackendWorkflowRepository({ seedSample: true });
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
