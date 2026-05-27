type CronAuthEnv = Partial<Record<"CRON_SECRET" | "MARKETCREW_API_TOKEN" | "MARKETCREW_BACKEND_API_TOKEN" | "MARKETCREW_CRON_SECRET", string>>;

export function isAuthorizedCronRequest(request: Request, env: CronAuthEnv = process.env as unknown as CronAuthEnv) {
  const pathname = new URL(request.url).pathname;
  if (!pathname.startsWith("/api/cron/")) {
    return false;
  }

  const bearer = parseBearerToken(request.headers.get("authorization"));
  if (!bearer) {
    return false;
  }

  return getAcceptedCronTokens(env).some((token) => token === bearer);
}

export function getAcceptedCronTokens(env: CronAuthEnv = process.env as unknown as CronAuthEnv) {
  return [
    env.CRON_SECRET,
    env.MARKETCREW_CRON_SECRET,
    env.MARKETCREW_API_TOKEN,
    env.MARKETCREW_BACKEND_API_TOKEN,
  ].filter((token): token is string => Boolean(token && token.trim().length > 0));
}

function parseBearerToken(value: string | null) {
  const match = value?.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim();
}
