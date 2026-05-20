"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";

const automationRuleSchema = z.object({
  id: z.string().min(1),
  enabled: z.boolean(),
  maxBidChangeRate: z.coerce.number().min(0).max(1),
  maxDailyChangesPerKeyword: z.coerce.number().int().min(0).max(20),
  maxCpc: z.coerce.number().int().min(0).nullable(),
  monthlyBudgetLimit: z.coerce.number().int().min(0).nullable(),
});

export async function updateAutomationRuleAction(formData: FormData) {
  const parsed = automationRuleSchema.parse({
    id: formData.get("id"),
    enabled: formData.get("enabled") === "on",
    maxBidChangeRate: formData.get("maxBidChangeRate"),
    maxDailyChangesPerKeyword: formData.get("maxDailyChangesPerKeyword"),
    maxCpc: nullableNumberInput(formData.get("maxCpc")),
    monthlyBudgetLimit: nullableNumberInput(formData.get("monthlyBudgetLimit")),
  });

  await prisma.automationRule.update({
    where: { id: parsed.id },
    data: {
      enabled: parsed.enabled,
      maxBidChangeRate: parsed.maxBidChangeRate,
      maxDailyChangesPerKeyword: parsed.maxDailyChangesPerKeyword,
      maxCpc: parsed.maxCpc,
      monthlyBudgetLimit: parsed.monthlyBudgetLimit,
    },
  });

  revalidatePath("/settings/automation-rules");
  revalidatePath("/operations");
}

function nullableNumberInput(value: FormDataEntryValue | null) {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}
