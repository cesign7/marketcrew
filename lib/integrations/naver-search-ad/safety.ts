const allowedReadOnlySearchAdPaths = new Set([
  "/ncc/campaigns",
  "/ncc/adgroups",
  "/ncc/keywords",
  "/stats",
  "/stat-reports",
]);

const allowedReadOnlySearchAdPostPaths = new Set(["/stat-reports"]);

export function assertReadOnlySearchAdRequest(method: string, uri: string) {
  const normalizedMethod = method.trim().toUpperCase();
  const path = uri.split("?")[0];
  const reviewedPath = normalizeReviewedPath(path);

  if (
    normalizedMethod === "POST" &&
    allowedReadOnlySearchAdPostPaths.has(reviewedPath)
  ) {
    return;
  }

  if (normalizedMethod !== "GET") {
    throw new Error(
      `Naver Search Ad write request blocked in MVP read-only mode: ${normalizedMethod} ${path}`,
    );
  }

  if (!allowedReadOnlySearchAdPaths.has(reviewedPath)) {
    throw new Error(
      `Naver Search Ad endpoint requires official-doc review before use: ${normalizedMethod} ${path}`,
    );
  }
}

function normalizeReviewedPath(path: string) {
  if (/^\/stat-reports\/[^/]+(?:\/download)?$/.test(path)) {
    return "/stat-reports";
  }

  return path;
}
