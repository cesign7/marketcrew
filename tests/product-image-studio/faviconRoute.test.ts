import { describe, expect, it } from "vitest";
import { GET } from "@/app/favicon.ico/route";

describe("product image studio favicon route", () => {
  it("matches the production-observed favicon response when the browser requests /favicon.ico", async () => {
    // Given
    const request = new Request("https://marketcrew.app/favicon.ico");

    // When
    const response = await GET(request);
    const body = new Uint8Array(await response.arrayBuffer());

    // Then
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/vnd.microsoft.icon");
    expect(response.headers.get("cache-control")).toBe("public, max-age=0, must-revalidate");
    expect(body.length).toBeGreaterThan(0);
    expect(Array.from(body.slice(0, 4))).toEqual([0, 0, 1, 0]);
  });
});
