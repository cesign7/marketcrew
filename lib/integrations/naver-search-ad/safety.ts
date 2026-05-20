const allowedReadOnlySearchAdPaths = new Set([
  "/ncc/campaigns",
  "/ncc/adgroups",
  "/ncc/keywords",
]);

export function assertReadOnlySearchAdRequest(method: string, uri: string) {
  const normalizedMethod = method.trim().toUpperCase();
  const path = uri.split("?")[0];

  if (normalizedMethod !== "GET") {
    throw new Error(
      `Naver Search Ad write request blocked in MVP read-only mode: ${normalizedMethod} ${path}`,
    );
  }

  if (!allowedReadOnlySearchAdPaths.has(path)) {
    throw new Error(
      `Naver Search Ad endpoint requires official-doc review before use: ${normalizedMethod} ${path}`,
    );
  }
}
