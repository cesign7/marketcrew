import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { PATCH } from "../../src/app/api/evidence-requests/[id]/route";
import { createFileMarketingWorkflowRepository } from "../../src/lib/persistence/file-repository";

let previousStorePath: string | undefined;
let temporaryDirectory: string | undefined;
let storePath: string;

beforeEach(() => {
  previousStorePath = process.env.MARKETCREW_WORKFLOW_STORE_PATH;
  temporaryDirectory = mkdtempSync(join(tmpdir(), "marketcrew2-evidence-request-route-"));
  storePath = join(temporaryDirectory, "workflow-store.json");
  process.env.MARKETCREW_WORKFLOW_STORE_PATH = storePath;
});

afterEach(() => {
  if (previousStorePath === undefined) {
    delete process.env.MARKETCREW_WORKFLOW_STORE_PATH;
  } else {
    process.env.MARKETCREW_WORKFLOW_STORE_PATH = previousStorePath;
  }

  if (temporaryDirectory) {
    rmSync(temporaryDirectory, { recursive: true, force: true });
    temporaryDirectory = undefined;
  }
});

describe("evidence request route", () => {
  it("근거 요청 검증 결과를 저장하고 승격 후보를 반환한다", async () => {
    const response = await PATCH(
      new Request("http://127.0.0.1/api/evidence-requests/evidence-request-gro-mobile-evening-gift-card", {
        method: "PATCH",
        body: JSON.stringify({
          status: "VERIFIED",
          verificationNote: "모바일 저녁 성과와 광고 설정 근거를 확인했습니다.",
          verifiedEvidenceIds: ["search-ad-device-hourly-buddha-gift-card-2026"],
        }),
      }),
      { params: Promise.resolve({ id: "evidence-request-gro-mobile-evening-gift-card" }) },
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.evidenceRequest.status).toBe("VERIFIED");
    expect(payload.hypothesis.status).toBe("PROMOTED");
    expect(payload.promotedAgendaCandidate.id).toBe("agenda-hypothesis-gro-mobile-evening-gift-card");

    const repository = createFileMarketingWorkflowRepository(storePath);
    expect(repository.listEvidenceRequests().find((request) => request.id === payload.evidenceRequest.id)?.status).toBe(
      "VERIFIED",
    );
    expect(repository.listAgentRunsForWorkflowObject({ objectType: "evidence_request", objectId: payload.evidenceRequest.id })).toHaveLength(1);
  });

  it("잘못된 검증 상태 값은 저장하지 않는다", async () => {
    const response = await PATCH(
      new Request("http://127.0.0.1/api/evidence-requests/evidence-request-gro-mobile-evening-gift-card", {
        method: "PATCH",
        body: JSON.stringify({ status: "DONE" }),
      }),
      { params: Promise.resolve({ id: "evidence-request-gro-mobile-evening-gift-card" }) },
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(payload.error.code).toBe("VALIDATION_ERROR");
  });
});
