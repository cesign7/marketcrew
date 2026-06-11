const appUrl = normalizeBaseUrl(process.env.MARKETCREW_PROD_APP_URL ?? "https://marketcrew.app");
const apiUrl = normalizeBaseUrl(process.env.MARKETCREW_PROD_API_URL ?? "https://api.marketcrew.app");

const checks = [
  checkHealth(`${apiUrl}/api/backend/health`, "Railway API 상태"),
  checkHealth(`${appUrl}/api/backend/health`, "Vercel -> Railway 연결"),
  checkPageRender(`${appUrl}/login?next=%2Fproduct-image-studio`, "대표 로그인 페이지 렌더", "대표 로그인"),
  checkLoginGate(`${appUrl}/operations`, "대표 로그인 보호"),
  checkLoginGate(`${appUrl}/product-image-studio`, "상품 이미지 스튜디오 로그인 보호"),
  checkApiLoginGate(`${appUrl}/api/product-image-studio/provider-status`, "상품 이미지 생성 상태 API 보호"),
];

const results = await Promise.all(checks);
const failed = results.filter((result) => !result.ok);

for (const result of results) {
  const marker = result.ok ? "PASS" : "FAIL";
  process.stdout.write(`${marker} ${result.label}: ${result.message}\n`);
}

if (failed.length > 0) {
  process.exitCode = 1;
}

async function checkHealth(url, label) {
  try {
    const response = await fetch(url, { cache: "no-store" });
    const payload = await response.json();
    const totalRecords = payload.database?.totalRecords ?? payload.totalRecords ?? "unknown";
    const repositoryMode = payload.repositoryMode ?? "unknown";
    const ok = response.ok && payload.ok === true;

    return {
      ok,
      label,
      message: `status=${response.status}, repositoryMode=${repositoryMode}, totalRecords=${totalRecords}`,
    };
  } catch (error) {
    return { ok: false, label, message: error instanceof Error ? error.message : "알 수 없는 오류" };
  }
}

async function checkLoginGate(url, label) {
  try {
    const response = await fetch(url, { cache: "no-store", redirect: "manual" });
    const location = response.headers.get("location") ?? "";
    const ok = [302, 303, 307, 308].includes(response.status) && location.includes("/login");

    return { ok, label, message: `status=${response.status}, location=${location || "none"}` };
  } catch (error) {
    return { ok: false, label, message: error instanceof Error ? error.message : "알 수 없는 오류" };
  }
}

async function checkPageRender(url, label, expectedText) {
  try {
    const response = await fetch(url, { cache: "no-store", redirect: "manual" });
    const bodyText = await response.text();
    const hasServerError =
      bodyText.includes("A server error occurred") ||
      bodyText.includes("This page couldn") ||
      bodyText.includes("ERR_REQUIRE_ESM");
    const ok = response.status === 200 && bodyText.includes(expectedText) && !hasServerError;

    return {
      ok,
      label,
      message: `status=${response.status}, expectedText=${bodyText.includes(expectedText) ? "true" : "false"}, bodySafe=${
        hasServerError ? "false" : "true"
      }`,
    };
  } catch (error) {
    return { ok: false, label, message: error instanceof Error ? error.message : "알 수 없는 오류" };
  }
}

async function checkApiLoginGate(url, label) {
  try {
    const response = await fetch(url, { cache: "no-store", redirect: "manual" });
    const bodyText = await response.text();
    const hasUnsafeBody =
      bodyText.includes("OPENAI_API_KEY") ||
      bodyText.includes("PRODUCT_IMAGE_STUDIO") ||
      bodyText.includes("gpt-image") ||
      bodyText.includes("sk-");
    const ok = response.status === 401 && !hasUnsafeBody;

    return { ok, label, message: `status=${response.status}, bodySafe=${hasUnsafeBody ? "false" : "true"}` };
  } catch (error) {
    return { ok: false, label, message: error instanceof Error ? error.message : "알 수 없는 오류" };
  }
}

function normalizeBaseUrl(value) {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}
