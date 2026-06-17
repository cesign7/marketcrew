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
    expect(smokeScript).toContain("/product-image-studio/ai-tools/image-generator");
    expect(smokeScript).toContain("/login?next=%2Fproduct-image-studio");
    expect(smokeScript).toContain("/api/product-image-studio/provider-status");
    expect(smokeScript).toContain("/api/product-image-studio/provider-settings");
    expect(smokeScript).toContain("checkPageRender");
    expect(smokeScript).toContain("checkLoginGate");
    expect(smokeScript).toContain("checkApiLoginGate");
    expect(smokeScript).not.toContain("/api/product-image-studio/image-generator/generations");
    expect(smokeScript).not.toContain('method: "POST"');
    expect(smokeScript).not.toContain("method: 'POST'");
    expect(smokeScript).not.toContain("regenerate-ratio");
  });

  it("keeps Next app route output compatible with the current ESM build", async () => {
    const packageJson: unknown = JSON.parse(await readFile(join(process.cwd(), "package.json"), "utf8"));

    expect(readPackageType(packageJson)).toBe("module");
  });

  it("redirects the unauthenticated studio page to owner login when auth is required", async () => {
    vi.stubEnv("MARKETCREW_AUTH_DISABLED", "0");

    const response = await proxy(new NextRequest("http://127.0.0.1:3000/product-image-studio"));
    const location = response.headers.get("location") ?? "";

    expect([302, 303, 307, 308]).toContain(response.status);
    expect(location).toContain("/login");
    expect(location).toContain("next=%2Fproduct-image-studio");
  });

  it("redirects the unauthenticated image generator page to owner login when auth is required", async () => {
    vi.stubEnv("MARKETCREW_AUTH_DISABLED", "0");

    const response = await proxy(new NextRequest("http://127.0.0.1:3000/product-image-studio/ai-tools/image-generator"));
    const location = response.headers.get("location") ?? "";

    expect([302, 303, 307, 308]).toContain(response.status);
    expect(location).toContain("/login");
    expect(location).toContain("next=%2Fproduct-image-studio%2Fai-tools%2Fimage-generator");
  });

  it("keeps the image generator generation API behind auth without posting to a provider", async () => {
    vi.stubEnv("MARKETCREW_AUTH_DISABLED", "0");
    vi.stubEnv("OPENAI_API_KEY", "configured-test-secret");
    vi.stubEnv("PRODUCT_IMAGE_STUDIO_GENERATION_ENABLED", "1");
    vi.stubEnv("PRODUCT_IMAGE_STUDIO_OPENAI_IMAGE_MODEL", "gpt-image-2");
    vi.stubEnv("PRODUCT_IMAGE_STUDIO_PROVIDER", "openai");

    const response = await proxy(
      new NextRequest("http://127.0.0.1:3000/api/product-image-studio/image-generator/generations"),
    );
    const bodyText = await response.text();

    expect(response.status).toBe(401);
    expect(bodyText).toContain("UNAUTHORIZED");
    expect(bodyText).not.toContain("configured-test-secret");
    expect(bodyText).not.toContain("gpt-image-2");
    expect(bodyText).not.toContain("PRODUCT_IMAGE_STUDIO");
    expect(bodyText).not.toContain("OPENAI_API_KEY");
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

  it("keeps the provider settings API behind auth without leaking provider env details", async () => {
    vi.stubEnv("MARKETCREW_AUTH_DISABLED", "0");
    vi.stubEnv("GEMINI_API_KEY", "configured-test-secret");
    vi.stubEnv("PRODUCT_IMAGE_STUDIO_GENERATION_ENABLED", "1");
    vi.stubEnv("PRODUCT_IMAGE_STUDIO_GEMINI_IMAGE_MODEL", "gemini-3.1-flash-image");
    vi.stubEnv("PRODUCT_IMAGE_STUDIO_PROVIDER", "gemini");

    const response = await proxy(
      new NextRequest("http://127.0.0.1:3000/api/product-image-studio/provider-settings"),
    );
    const bodyText = await response.text();

    expect(response.status).toBe(401);
    expect(bodyText).toContain("UNAUTHORIZED");
    expect(bodyText).not.toContain("configured-test-secret");
    expect(bodyText).not.toContain("gemini-3.1-flash-image");
    expect(bodyText).not.toContain("PRODUCT_IMAGE_STUDIO");
    expect(bodyText).not.toContain("GEMINI_API_KEY");
  });

  it("allows internal backend API calls signed with the backend bridge token", async () => {
    vi.stubEnv("MARKETCREW_AUTH_DISABLED", "0");
    vi.stubEnv("MARKETCREW_BACKEND_API_TOKEN", "bridge-token");

    const response = await proxy(
      new NextRequest("http://127.0.0.1:3000/api/product-image-studio/provider-status", {
        headers: { authorization: "Bearer bridge-token" },
      }),
    );

    expect(response.status).not.toBe(401);
  });
});

function readPackageType(value: unknown): string | null {
  if (
    typeof value === "object" &&
    value !== null &&
    "type" in value &&
    typeof value.type === "string"
  ) {
    return value.type;
  }

  return null;
}
