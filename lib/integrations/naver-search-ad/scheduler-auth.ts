type SchedulerAuthEnv = Partial<Record<string, string | undefined>>;

export type SchedulerAuthResult =
  | { ok: true }
  | { ok: false; status: 401 | 503; error: string };

export function authorizePerformanceSchedulerRequest(
  authorizationHeader: string | null,
  env: SchedulerAuthEnv = process.env,
): SchedulerAuthResult {
  const secret = (
    env.MARKETCREW_SCHEDULER_SECRET ??
    env.CRON_SECRET ??
    ""
  ).trim();

  if (secret) {
    return authorizationHeader === `Bearer ${secret}`
      ? { ok: true }
      : {
          ok: false,
          status: 401,
          error: "Scheduler authorization failed.",
        };
  }

  if (env.NODE_ENV === "production") {
    return {
      ok: false,
      status: 503,
      error: "Scheduler secret is required in production.",
    };
  }

  return { ok: true };
}
