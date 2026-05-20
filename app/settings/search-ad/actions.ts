"use server";

import { revalidatePath } from "next/cache";
import { syncNaverSearchAdPerformance } from "@/lib/integrations/naver-search-ad/performance";
import { syncNaverSearchAdPersisted } from "@/lib/integrations/naver-search-ad/sync";

export async function syncSearchAdAction() {
  await syncNaverSearchAdPersisted();

  revalidatePath("/settings/search-ad");
  revalidatePath("/operations");
  revalidatePath("/keywords");
}

export async function syncSearchAdDryRunAction() {
  await syncSearchAdAction();
}

export async function syncSearchAdPerformanceAction() {
  await syncNaverSearchAdPerformance();

  revalidatePath("/settings/search-ad");
  revalidatePath("/operations");
  revalidatePath("/keywords");
}
