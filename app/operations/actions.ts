"use server";

import { revalidatePath } from "next/cache";
import { runKeywordDiagnostics } from "@/lib/db/keyword-diagnostics";
import { runLlmAgentShadowReport } from "@/lib/db/llm-agent-runner";

export async function runKeywordDiagnosticsAction() {
  await runKeywordDiagnostics();

  revalidatePath("/operations");
  revalidatePath("/approvals");
  revalidatePath("/keywords");
}

export async function runLlmAgentShadowAction() {
  await runLlmAgentShadowReport();

  revalidatePath("/operations");
  revalidatePath("/approvals");
}
