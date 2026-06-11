import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { NextRequest } from "next/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { proxy } from "../../src/proxy";

describe("product image studio production smoke contract", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("checks studio auth surfaces without invoking image generation endpoints", async () => {
    const smokeScript = await readFile(join(process.cwd(), "scripts", "production-smoke.mjs"), "utf8");

    expect(smokeScript).toContain("/product-image-studio");
    expect(smokeScript).toContain("/api/product-image-studio/provider-status");
    expect(smokeScript).toContain("checkApiLoginGate");
    expect(smokeScript).not.toContain("/generations");
    expect(smokeScript).not.toContain("regenerate-ratio");
  });

  it("redirects the unauthenticated studio page to owner login when auth is required", async () => {
    vi.stubEnv("MARKETCREW_AUTH_DISABLED", "0");

    const response = await proxy(new NextRequest("http://127.0.0.1:3000/product-image-studio"));
    const location = response.headers.get("location") ?? "";

    expect([302, 303, 307, 308]).toContain(response.status);
    expect(location).toContain("/login");
    expect(location).toContain("next=%2Fproduct-image-studio");
  });

  it("keeps the provider status API behind auth without leaking provider env details", async () => {
    vi.stubEnv("MARKETCREW_AUTH_DISABLED", "0");
    vi.stubEnv("OPENAI_API_KEY", "configured-test-secret");
    vi.stubEnv("PRODUCT_IMAGE_STUDIO_GENERATION_ENABLED", "1");
    vi.stubEnv("PRODUCT_IMAGE_STUDIO_OPENAI_IMAGE_MODEL", "gpt-image-1");
    vi.stubEnv("PRODUCT_IMAGE_STUDIO_PROVIDER", "openai");

    const response = await proxy(
      new NextRequest("http://127.0.0.1:3000/api/product-image-studio/provider-status"),
    );
    const bodyText = await response.text();

    expect(response.status).toBe(401);
    expect(bodyText).toContain("UNAUTHORIZED");
    expect(bodyText).not.toContain("configured-test-secret");
    expect(bodyText).not.toContain("gpt-image-1");
    expect(bodyText).not.toContain("PRODUCT_IMAGE_STUDIO");
    expect(bodyText).not.toContain("OPENAI_API_KEY");
  });
});
