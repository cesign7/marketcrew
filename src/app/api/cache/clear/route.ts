import { NextResponse } from "next/server";
import { clearLocalAgendaRoomViewModelCache } from "@/features/agenda-room/loadAgendaRoomViewModel";

export async function POST() {
  clearLocalAgendaRoomViewModelCache();

  return NextResponse.json({
    ok: true,
    cleared: ["agendaRoomViewModel", "backendWorkflowState"],
  });
}
