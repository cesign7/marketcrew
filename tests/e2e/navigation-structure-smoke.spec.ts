import { expect, test } from "@playwright/test";

test("대표 업무실은 왼쪽 업무 메뉴와 상단 기준 필터로 나뉜다", async ({ page }) => {
  await page.goto("/operations");

  const navigation = page.getByRole("navigation", { name: "주요 업무 메뉴" });
  await expect(navigation.getByRole("link", { name: "오늘 업무실" })).toBeVisible();
  await expect(navigation.getByRole("link", { name: "캐릭터 업무데스크" })).toBeVisible();
  await expect(navigation.getByRole("link", { name: "결재/실행관리" })).toBeVisible();
  await expect(navigation.getByRole("link", { name: "데이터 연동" })).toBeVisible();
  await expect(navigation.getByRole("link", { name: "성장/성과" })).toBeVisible();
  await expect(navigation.getByRole("link", { name: "설정" })).toBeVisible();

  const topControls = page.getByRole("region", { name: "화면 보기 기준" });
  await expect(topControls.getByRole("button", { name: "전체" })).toBeVisible();
  await expect(topControls.getByRole("button", { name: "스티커씨" })).toBeVisible();
  await expect(topControls.getByRole("button", { name: "커피프린트" })).toBeVisible();
  await expect(topControls.getByRole("button", { name: "키워드광고" })).toBeVisible();
  await expect(topControls.getByRole("button", { name: "오늘" })).toBeVisible();
  await expect(topControls.getByRole("button", { name: "7일" })).toBeVisible();
  await expect(topControls.getByRole("button", { name: "30일" })).toBeVisible();
  await expect(topControls.getByRole("button", { name: "전년동기" })).toBeVisible();
  await expect(topControls.getByRole("button", { name: "명절기준" })).toBeVisible();
});

test("데이터 연동 메뉴와 상단 채널/기간 필터가 클릭에 반응한다", async ({ page }) => {
  await page.goto("/operations");

  await page.getByRole("navigation", { name: "주요 업무 메뉴" }).getByRole("link", { name: "데이터 연동" }).click();
  await expect(page).toHaveURL(/\/data$/);
  await expect(page.getByRole("heading", { level: 1, name: "데이터 연동" })).toBeVisible();

  const topControls = page.getByRole("region", { name: "화면 보기 기준" });
  await topControls.getByRole("button", { name: "스티커씨" }).click();
  await expect(page).toHaveURL(/\/data\?channel=stickersee$/);
  await expect(topControls.getByRole("button", { name: "스티커씨" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".provider-card").filter({ hasText: "스마트스토어(스티커씨)" })).toHaveCount(1);
  await expect(page.locator(".provider-card").filter({ hasText: "쇼핑몰(커피프린트)" })).toHaveCount(0);

  await topControls.getByRole("button", { name: "30일" }).click();
  await expect(page).toHaveURL(/\/data\?channel=stickersee&period=30d$/);
  await expect(topControls.getByRole("button", { name: "30일" })).toHaveAttribute("aria-pressed", "true");
});

test("모바일 상단 메뉴는 첫 화면을 과하게 차지하지 않는다", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/operations");

  const topbar = page.locator(".workspace-topbar");
  await expect(topbar).toBeVisible();
  const topbarHeight = await topbar.evaluate((element) => element.getBoundingClientRect().height);

  expect(topbarHeight).toBeLessThanOrEqual(300);
  await expect(page.getByRole("region", { name: "화면 실행 버튼" }).getByRole("link", { name: "결재 검토" })).toBeVisible();
  await expect(page.getByRole("region", { name: "화면 보기 기준" }).getByRole("button", { name: "스티커씨" })).toBeVisible();
});

test("캐릭터 업무데스크에서 캐릭터별 업무 화면으로 이동한다", async ({ page }) => {
  await page.goto("/characters");

  await expect(page.getByRole("heading", { level: 1, name: "캐릭터 업무데스크" })).toBeVisible();
  await page.getByRole("link", { name: /그로 업무 보기/ }).click();

  await expect(page).toHaveURL(/\/characters\/gro$/);
  await expect(page.getByRole("heading", { level: 1, name: "그로 업무데스크" })).toBeVisible();
  await expect(page.getByText("시즌 키워드 테스트 안건 상신")).toBeVisible();
});

test("모바일 캐릭터 업무데스크는 첫 화면 안에서 업무 카드를 보여준다", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/characters");

  const firstCharacterCard = page.locator(".character-desk-card").first();
  await expect(firstCharacterCard).toBeVisible();

  await expect(page.getByRole("link", { name: "캐릭터 업무데스크" })).toBeVisible();
  await expect(page.getByRole("link", { name: "모아", exact: true })).toBeVisible();
  await expect(firstCharacterCard).toBeInViewport();
});
