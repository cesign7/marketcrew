"use server";

import { revalidatePath } from "next/cache";
import { runKeywordDiagnostics } from "@/lib/db/keyword-diagnostics";

export async function runKeywordDiagnosticsAction() {
  await runKeywordDiagnostics();

  revalidatePath("/operations");
  revalidatePath("/approvals");
  revalidatePath("/keywords");
}
