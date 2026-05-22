import { expect, test } from "@playwright/test";

test("대표 업무실은 왼쪽 업무 메뉴와 상단 기준 필터로 나뉜다", async ({ page }) => {
  await page.goto("/operations");

  const navigation = page.getByRole("navigation", { name: "주요 업무 메뉴" });
  await expect(navigation.getByRole("link", { name: "오늘 업무실" })).toBeVisible();
  await expect(navigation.getByRole("link", { name: "캐릭터 업무데스크" })).toBeVisible();
  await expect(navigation.getByRole("link", { name: "결재/실행관리" })).toBeVisible();
  await expect(navigation.getByRole("link", { name: "데이터 연동" })).toBeVisible();
  await expect(navigation.getByRole("link", { name: "성장/성과" })).toBeVisible();
  await expect(navigation.getByRole("link", { name: "인사과" })).toBeVisible();
  await expect(navigation.getByRole("link", { name: "설정" })).toBeVisible();
  await expect(navigation.getByRole("link", { name: "데이터 연동" })).toHaveAttribute("data-prefetch-mode", "intent");

  const topControls = page.getByRole("region", { name: "화면 보기 기준" });
  await expect(topControls.getByRole("button", { name: "전체" })).toBeVisible();
  await expect(topControls.getByRole("button", { name: "스티커씨" })).toBeVisible();
  await expect(topControls.getByRole("button", { name: "커피" })).toBeVisible();
  await expect(topControls.getByRole("button", { name: "광고" })).toHaveCount(0);
  await expect(topControls.getByRole("button", { name: "오늘" })).toBeVisible();
  await expect(topControls.getByRole("button", { name: "7일" })).toBeVisible();
  await expect(topControls.getByRole("button", { name: "30일" })).toBeVisible();
  await expect(topControls.getByRole("button", { name: "전년" })).toBeVisible();
  await expect(topControls.getByRole("button", { name: "명절" })).toBeVisible();
});

test("인사과 메뉴에서 캐릭터 롤모델과 월별 AI 사용 명세를 확인한다", async ({ page }) => {
  await page.goto("/operations");

  await page.getByRole("navigation", { name: "주요 업무 메뉴" }).getByRole("link", { name: "인사과" }).click();

  await expect(page).toHaveURL(/\/people$/);
  await expect(page.getByRole("heading", { level: 1, name: "인사과" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "모델별 토큰과 예상금액" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "AI 직원 기본 역할" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 3, name: "모아" })).toBeVisible();
  const firstRoleModel = page.getByLabel("롤모델").first();
  await expect(firstRoleModel).toBeVisible();
  await firstRoleModel.fill("대표 비서실장처럼 안건 우선순위와 비용 위험을 먼저 정리합니다.");
  await page.getByRole("button", { name: "저장" }).click();
  await expect(page.getByText("저장 완료")).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("롤모델").first()).toHaveValue("대표 비서실장처럼 안건 우선순위와 비용 위험을 먼저 정리합니다.");
});

test("왼쪽 업무 메뉴를 아이콘 폭으로 접고 다시 펼칠 수 있다", async ({ page }) => {
  await page.goto("/operations");

  const sidebar = page.locator(".app-sidebar");
  await expect(sidebar).toBeVisible();
  const expandedWidth = await sidebar.evaluate((element) => element.getBoundingClientRect().width);
  await page.getByRole("button", { name: "왼쪽 메뉴 접기" }).click();

  await expect(page.getByRole("button", { name: "왼쪽 메뉴 펼치기" })).toBeVisible();
  await expect
    .poll(() => sidebar.evaluate((element) => element.getBoundingClientRect().width))
    .toBeLessThan(expandedWidth);
  await expect
    .poll(() => sidebar.evaluate((element) => element.getBoundingClientRect().width))
    .toBeLessThanOrEqual(90);

  await expect(page.getByRole("navigation", { name: "주요 업무 메뉴" }).getByRole("link", { name: "오늘 업무실" })).toBeVisible();
});

test("데이터 연동 메뉴와 상단 채널/기간 필터가 클릭에 반응한다", async ({ page }) => {
  await page.goto("/operations");

  await page.getByRole("navigation", { name: "주요 업무 메뉴" }).getByRole("link", { name: "데이터 연동" }).click();
  await expect(page).toHaveURL(/\/data$/);
  await expect(page.getByRole("heading", { level: 1, name: "데이터 연동" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "불러오는 데이터와 저장하는 데이터" })).toBeVisible();
  await expect(page.getByRole("heading", { level: 2, name: "조회 한계와 저장 기준" })).toBeVisible();
  await expect(page.getByLabel("추천 수집 주기와 중복 방지 기준")).toContainText("자동 스케줄");
  await expect(page.getByLabel("추천 수집 주기와 중복 방지 기준")).toContainText("07:05 / 15:05");
  await expect(page.getByLabel("추천 수집 주기와 중복 방지 기준")).toContainText("중복 방지");
  await expect(page.getByRole("heading", { level: 3, name: "원문 필드 점검표" })).toBeVisible();
  await expect(page.getByRole("link", { name: "불러오는 데이터" }).first()).toBeVisible();
  await expect(page.getByRole("link", { name: "원천 필드 목록" })).toHaveCount(0);
  const firstSourceGroup = page.locator("details.data-source-field-card").first();
  await expect(firstSourceGroup).not.toHaveAttribute("open", "");
  await firstSourceGroup.locator("summary").click();
  await expect(firstSourceGroup).toHaveAttribute("open", "");
  await expect(page.locator(".data-source-field-overview")).toContainText("monthlyAvePcClkCnt");
  await expect(page.locator(".data-contract-table").first()).toContainText("칼럼");

  const topControls = page.getByRole("region", { name: "화면 보기 기준" });
  await topControls.getByRole("button", { name: "스티커씨" }).click();
  await expect(page).toHaveURL(/\/data\?channel=stickersee$/);
  await expect(topControls.getByRole("button", { name: "스티커씨" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator(".provider-card").filter({ hasText: "스마트스토어(스티커씨)" })).toHaveCount(1);
  await expect(page.locator(".provider-card").filter({ hasText: "쇼핑몰(커피프린트)" })).toHaveCount(0);
  await expect(page.locator(".collection-policy-card")).toHaveCount(1);
  await expect(page.locator(".collection-policy-card").first()).toContainText("스마트스토어(스티커씨)");
  await expect(page.locator(".data-contract-provider").filter({ hasText: "스마트스토어(스티커씨)" })).toHaveCount(1);
  await expect(page.locator(".data-contract-provider").filter({ hasText: "쇼핑몰(커피프린트)" })).toHaveCount(0);
  await expect(page.locator(".data-source-field-card").filter({ hasText: "lastChangeStatuses[0]" })).toBeVisible();

  await page.goto("/data?channel=search-ad");
  await expect(page).toHaveURL(/\/data\?channel=search-ad$/);
  await expect(topControls.getByRole("button", { name: "전체" })).toHaveAttribute("aria-pressed", "true");
  await expect(topControls.getByRole("button", { name: "광고" })).toHaveCount(0);

  await topControls.getByRole("button", { name: "30일" }).click();
  await expect(page).toHaveURL(/\/data\?period=30d$/);
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

test("앱 브라우저 폭에서도 왼쪽 메뉴와 본문 카드가 읽히게 유지된다", async ({ page }) => {
  await page.setViewportSize({ width: 787, height: 850 });
  await page.goto("/operations");

  await expect(page.getByRole("button", { name: "왼쪽 메뉴 접기" })).toBeVisible();
  const firstBucketWidth = await page
    .locator(".bucket-item")
    .first()
    .evaluate((element) => element.getBoundingClientRect().width);
  expect(firstBucketWidth).toBeGreaterThanOrEqual(220);

  const dailyBriefColumns = await page
    .locator(".daily-brief-grid")
    .evaluate((element) => getComputedStyle(element).gridTemplateColumns.split(" ").length);
  expect(dailyBriefColumns).toBe(1);

  await page.goto("/data");
  const overflowingPolicyCards = await page.locator(".collection-policy-card").evaluateAll((cards) =>
    cards.filter((card) => card.scrollWidth > Math.ceil(card.getBoundingClientRect().width) + 1).length,
  );
  expect(overflowingPolicyCards).toBe(0);
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
