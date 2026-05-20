"use server";

import { revalidatePath } from "next/cache";
import { syncNaverSearchAdDryRun } from "@/lib/integrations/naver-search-ad/sync";

export async function syncSearchAdDryRunAction() {
  await syncNaverSearchAdDryRun();

  revalidatePath("/settings/search-ad");
  revalidatePath("/operations");
  revalidatePath("/keywords");
}
