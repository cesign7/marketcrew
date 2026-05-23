const appUrl = normalizeBaseUrl(process.env.MARKETCREW_PROD_APP_URL ?? "https://marketcrew.app");
const apiUrl = normalizeBaseUrl(process.env.MARKETCREW_PROD_API_URL ?? "https://api.marketcrew.app");

const checks = [
  checkHealth(`${apiUrl}/api/backend/health`, "Railway API 상태"),
  checkHealth(`${appUrl}/api/backend/health`, "Vercel -> Railway 연결"),
  checkLoginGate(`${appUrl}/operations`, "대표 로그인 보호"),
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
    const repositoryMode = payload.repositoryMode ?? payload.summary?.repositoryMode;
    const approvalCount = payload.counts?.approvalRequests ?? payload.summary?.counts?.approvalRequests ?? payload.approvalRequests;
    const providerSyncCount =
      payload.counts?.providerSyncReports ?? payload.summary?.counts?.providerSyncReports ?? payload.providerSyncReports;
    const ok = response.ok && payload.ok !== false && repositoryMode === "db";

    return {
      ok,
      label,
      message: `status=${response.status}, repositoryMode=${repositoryMode ?? "unknown"}, approvalRequests=${approvalCount ?? "unknown"}, providerSyncReports=${providerSyncCount ?? "unknown"}`,
    };
  } catch (error) {
    return {
      ok: false,
      label,
      message: error instanceof Error ? error.message : "알 수 없는 오류",
    };
  }
}

async function checkLoginGate(url, label) {
  try {
    const response = await fetch(url, { cache: "no-store", redirect: "manual" });
    const location = response.headers.get("location") ?? "";
    const ok = [302, 303, 307, 308].includes(response.status) && location.includes("/login");

    return {
      ok,
      label,
      message: `status=${response.status}, location=${location || "none"}`,
    };
  } catch (error) {
    return {
      ok: false,
      label,
      message: error instanceof Error ? error.message : "알 수 없는 오류",
    };
  }
}

function normalizeBaseUrl(value) {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}
