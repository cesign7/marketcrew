import { expect, test } from "@playwright/test";

test("대표 결재 상세에서 즉시 반영 클릭 시 외부 반영 잠금 알림을 보여준다", async ({ page, request }) => {
  await page.goto("/approvals/approval-agenda-season-plan-buddha-gift-card");

  await expect(page.getByRole("heading", { level: 1, name: /부처님오신날 선물카드/ })).toBeVisible();
  const submitPanel = page.locator("#owner-decision-submit");
  await expect(submitPanel.getByRole("status")).toContainText("대표 결정을 선택하면");
  await expect(submitPanel.getByLabel("광고 유형")).toHaveValue("네이버 키워드광고");
  await expect(submitPanel.getByLabel("기기/매체")).toHaveValue("모바일 우선 + PC 소액 병행");
  await submitPanel.getByLabel("기기/매체").selectOption("모바일만");

  await submitPanel.getByLabel("결정 메모").fill("브라우저 확인: 외부 반영 잠금 확인");
  await submitPanel.getByRole("button", { name: "승인 후 바로 반영" }).click();

  await expect(submitPanel.getByRole("status")).toContainText("결재는 기록됐지만 외부 반영은 차단됐습니다.");
  await expect(submitPanel.getByRole("status")).toContainText("WRITE_GATE_CLOSED");

  await page.reload();
  await expect(page.getByRole("heading", { level: 2, name: "이 결재의 AI 실행 이력" })).toBeVisible();
  const agentRunSection = page.getByLabel("결재별 AI 실행 이력");
  await expect(agentRunSection.getByRole("strong").filter({ hasText: "대표 결정" })).toBeVisible();
  await expect(agentRunSection.getByText("연동 로컬 · 모델 대표 결정 기록기")).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "저장된 성과 보고" })).toBeVisible();
  await expect(
    page.locator(".outcome-history-card").getByText("대표 승인은 통과했지만 실제 외부 반영 잠금이 닫혀"),
  ).toBeVisible();

  const stateResponse = await request.get("/api/operations/workflow-state");
  expect(stateResponse.ok()).toBe(true);
  const statePayload = (await stateResponse.json()) as {
    state: {
      repositoryMode: string;
      counts: {
        ownerDecisions: number;
        executionResults: number;
        outcomeReports: number;
      };
    };
  };
  expect(statePayload.state.repositoryMode).toBe("file");
  expect(statePayload.state.counts.ownerDecisions).toBeGreaterThanOrEqual(1);
  expect(statePayload.state.counts.executionResults).toBeGreaterThanOrEqual(1);
  expect(statePayload.state.counts.outcomeReports).toBeGreaterThanOrEqual(1);
});
