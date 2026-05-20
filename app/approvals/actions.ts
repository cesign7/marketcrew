"use server";

import { revalidatePath } from "next/cache";
import type { Prisma } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/db/prisma";
import { materializeApprovedKeywordRule } from "@/lib/db/proposal-rule-materialization";
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
    const materialization = await materializeApprovedKeywordRule(proposal);
    const executionStatus = getInternalExecutionStatus(materialization);

    await prisma.actionExecution.create({
      data: {
        proposalId,
        executionType: proposal.actionType,
        provider: "INTERNAL",
        requestJson: {
          decision,
          externalApiBlocked: true,
          note: "승인 결과를 내부 워크플로에만 반영하고 실제 외부 API 실행은 아직 막아둡니다.",
        },
        responseJson: toInputJson(materialization),
        status: executionStatus,
        errorMessage:
          executionStatus === "FAILED"
            ? getMaterializationFailureMessage(materialization)
            : undefined,
        executedAt: executionStatus === "PENDING" ? undefined : new Date(),
      },
    });
  }

  revalidatePath("/approvals");
  revalidatePath("/operations");
  revalidatePath("/keywords");
}

function getInternalExecutionStatus(
  materialization: Awaited<ReturnType<typeof materializeApprovedKeywordRule>>,
) {
  if (materialization.materialized) {
    return "SUCCEEDED";
  }

  return materialization.reason === "UNSUPPORTED_ACTION" ? "PENDING" : "FAILED";
}

function getMaterializationFailureMessage(
  materialization: Awaited<ReturnType<typeof materializeApprovedKeywordRule>>,
) {
  if (materialization.materialized) {
    return undefined;
  }

  return `KeywordRule materialization failed: ${materialization.reason}`;
}

function toInputJson(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value ?? {})) as Prisma.InputJsonValue;
}
