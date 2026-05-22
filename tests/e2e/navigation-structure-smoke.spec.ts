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
  await expect(topControls.getByRole("button", { name: "스마트스토어" })).toBeVisible();
  await expect(topControls.getByRole("button", { name: "쇼핑몰" })).toBeVisible();
  await expect(topControls.getByRole("button", { name: "키워드광고" })).toBeVisible();
  await expect(topControls.getByRole("button", { name: "오늘" })).toBeVisible();
  await expect(topControls.getByRole("button", { name: "7일" })).toBeVisible();
  await expect(topControls.getByRole("button", { name: "30일" })).toBeVisible();
  await expect(topControls.getByRole("button", { name: "전년동기" })).toBeVisible();
  await expect(topControls.getByRole("button", { name: "명절기준" })).toBeVisible();
});

test("캐릭터 업무데스크에서 캐릭터별 업무 화면으로 이동한다", async ({ page }) => {
  await page.goto("/characters");

  await expect(page.getByRole("heading", { level: 1, name: "캐릭터 업무데스크" })).toBeVisible();
  await page.getByRole("link", { name: /그로 업무 보기/ }).click();

  await expect(page).toHaveURL(/\/characters\/gro$/);
  await expect(page.getByRole("heading", { level: 1, name: "그로 업무데스크" })).toBeVisible();
  await expect(page.getByText("시즌 키워드 테스트 안건 상신")).toBeVisible();
});
