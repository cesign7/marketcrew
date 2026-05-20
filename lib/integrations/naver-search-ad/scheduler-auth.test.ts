import { describe, expect, it } from "vitest";
import { authorizePerformanceSchedulerRequest } from "./scheduler-auth";

describe("Naver Search Ad performance scheduler auth", () => {
  it("accepts the configured bearer secret", () => {
    expect(
      authorizePerformanceSchedulerRequest("Bearer scheduler-secret", {
        MARKETCREW_SCHEDULER_SECRET: "scheduler-secret",
        NODE_ENV: "production",
      }),
    ).toEqual({ ok: true });
  });

  it("rejects an invalid bearer secret", () => {
    expect(
      authorizePerformanceSchedulerRequest("Bearer wrong", {
        MARKETCREW_SCHEDULER_SECRET: "scheduler-secret",
        NODE_ENV: "production",
      }),
    ).toEqual({
      ok: false,
      status: 401,
      error: "Scheduler authorization failed.",
    });
  });

  it("allows local development when no secret is configured", () => {
    expect(
      authorizePerformanceSchedulerRequest(null, {
        NODE_ENV: "development",
      }),
    ).toEqual({ ok: true });
  });

  it("refuses production scheduler calls when no secret is configured", () => {
    expect(
      authorizePerformanceSchedulerRequest(null, {
        NODE_ENV: "production",
      }),
    ).toEqual({
      ok: false,
      status: 503,
      error: "Scheduler secret is required in production.",
    });
  });
});
