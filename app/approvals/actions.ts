"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db/prisma";
import {
  getProposalStatusForDecision,
  isProposalDecision,
} from "@/lib/domain/proposal-decisions";

export async function decideProposalAction(formData: FormData) {
  const proposalId = formData.get("proposalId");
  const decision = formData.get("decision");

  if (typeof proposalId !== "string" || !isProposalDecision(decision)) {
    throw new Error("Invalid approval decision.");
  }

  const status = getProposalStatusForDecision(decision);
  const proposal = await prisma.actionProposal.update({
    where: { id: proposalId },
    data: { status },
  });

  if (status === "APPROVED") {
    await prisma.actionExecution.create({
      data: {
        proposalId,
        executionType: proposal.actionType,
        provider: "INTERNAL",
        requestJson: {
          decision,
          note: "승인 기록만 저장하고 실제 외부 API 실행은 아직 막아둡니다.",
        },
        status: "PENDING",
      },
    });
  }

  revalidatePath("/approvals");
  revalidatePath("/operations");
}
