import { expect, test } from "@playwright/test";

test("운영실에서 실제 AI 모델 호출 전 비용 가드를 확인한다", async ({ page }) => {
  await page.goto("/operations");

  await expect(page.getByRole("heading", { name: "실제 호출 전 예산 확인" })).toBeVisible();
  await expect(page.getByText("AI 모델 비용 가드")).toBeVisible();
  await expect(page.locator(".llm-governance-status")).toContainText(/실제 호출 차단|실제 호출 차단 해제|주의 후 가능/);
  await expect(page.getByText("연동 키")).toBeVisible();
  await expect(page.getByText("일 예산", { exact: true })).toBeVisible();
  await expect(page.locator(".llm-governance-token-row")).toContainText("원천 행 제외");
  await expect(page.getByText("카드별 근거 추적").first()).toBeVisible();
  await expect(page.getByText(/근거 \d+개 · 실행 이력 \d+개 · 연동 수집 \d+개/).first()).toBeVisible();
});
