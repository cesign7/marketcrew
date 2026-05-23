import { expect, test } from "@playwright/test";

test("후속 업무 큐에서 대표 결정 이후 업무를 보고 완료 처리한다", async ({ page }) => {
  await page.request.post("/api/approvals/approval-agenda-season-plan-teacher-day-bundle/decision", {
    data: {
      decision: "APPROVE_DRAFT_ONLY",
      memo: "후속 업무 e2e",
    },
  });

  await page.goto("/follow-ups");

  await expect(page.getByRole("heading", { name: "대표 결정 이후 내려간 일" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "대표 결정이 다음 추천에 남기는 기준" })).toBeVisible();
  await expect(page.getByText("초안 우선 패턴")).toBeVisible();
  await expect(page.getByText("초안 확정 범위로 내부 작업을 정리하고 외부 반영 전 재상신")).toBeVisible();

  await page.getByRole("button", { name: "완료 처리" }).first().click();

  await expect(page.getByText("완료 처리했습니다.")).toBeVisible();
  await expect(page.getByText("완료된 후속 업무", { exact: true })).toBeVisible();
});
