import { NextResponse } from "next/server";
import { clearAgendaRoomViewModelCache } from "@/features/agenda-room/loadAgendaRoomViewModel";

export async function POST() {
  await clearAgendaRoomViewModelCache();

  return NextResponse.json({
    ok: true,
    cleared: ["agendaRoomViewModel", "backendWorkflowState"],
  });
}
