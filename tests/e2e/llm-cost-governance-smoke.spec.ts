import { expect, test } from "@playwright/test";

test("운영실에서 실제 AI 모델 호출 전 비용 가드를 확인한다", async ({ page }) => {
  await page.goto("/settings");

  await expect(page.getByRole("heading", { name: "대표 승인 전 비용 한도" })).toBeVisible();
  await expect(page.locator(".ai-budget-settings-card")).toContainText("월 예산");
  await expect(page.locator(".ai-budget-settings-card")).toContainText("입력 상한");
  await expect(page.getByRole("heading", { name: "실제 호출 전 예산 확인" })).toBeVisible();
  await expect(page.getByText("AI 모델 비용 가드")).toBeVisible();
  await expect(page.locator(".llm-governance-status")).toContainText(/실제 호출 차단|실제 호출 차단 해제|주의 후 가능/);
  const llmGuard = page.getByLabel("AI 모델 호출 조건");
  await expect(llmGuard.getByText("연동 키")).toBeVisible();
  await expect(llmGuard.getByText("일 예산", { exact: true })).toBeVisible();
  await expect(page.locator(".llm-governance-token-row")).toContainText("원천 행 제외");
  const pricingReference = page.getByLabel("공식 AI 모델 가격 기준");
  await expect(pricingReference.getByText("공식 가격 기준")).toBeVisible();
  await expect(pricingReference.getByText("Gemini 3.5 Flash")).toBeVisible();
  await expect(pricingReference.getByText("입력 $1.50 / 100만 토큰")).toBeVisible();
  await expect(pricingReference.getByText("출력 $9.00 / 100만 토큰")).toBeVisible();
  await page.goto("/approvals");
  await expect(page.getByText("카드별 근거 추적").first()).toBeVisible();
  await expect(page.getByText(/근거 \d+개 · 실행 이력 \d+개 · 연동 수집 \d+개/).first()).toBeVisible();
});
