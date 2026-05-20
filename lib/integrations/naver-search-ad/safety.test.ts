import { describe, expect, it } from "vitest";
import { assertReadOnlySearchAdRequest } from "./safety";

describe("assertReadOnlySearchAdRequest", () => {
  it("allows current documented read-only endpoints", () => {
    expect(() =>
      assertReadOnlySearchAdRequest("GET", "/ncc/campaigns"),
    ).not.toThrow();
    expect(() =>
      assertReadOnlySearchAdRequest("GET", "/ncc/adgroups"),
    ).not.toThrow();
    expect(() =>
      assertReadOnlySearchAdRequest("GET", "/ncc/keywords"),
    ).not.toThrow();
    expect(() =>
      assertReadOnlySearchAdRequest("GET", "/stats"),
    ).not.toThrow();
    expect(() =>
      assertReadOnlySearchAdRequest("POST", "/stat-reports"),
    ).not.toThrow();
    expect(() =>
      assertReadOnlySearchAdRequest("GET", "/stat-reports"),
    ).not.toThrow();
    expect(() =>
      assertReadOnlySearchAdRequest("GET", "/stat-reports/123456"),
    ).not.toThrow();
    expect(() =>
      assertReadOnlySearchAdRequest(
        "GET",
        "/report-download?authtoken=token&fileVersion=v2",
      ),
    ).not.toThrow();
  });

  it("blocks write methods until a write workflow is explicitly approved", () => {
    expect(() =>
      assertReadOnlySearchAdRequest("POST", "/ncc/keywords"),
    ).toThrow("write request blocked");
    expect(() =>
      assertReadOnlySearchAdRequest("POST", "/stats"),
    ).toThrow("write request blocked");
    expect(() =>
      assertReadOnlySearchAdRequest("DELETE", "/stat-reports/123456"),
    ).toThrow("write request blocked");
    expect(() =>
      assertReadOnlySearchAdRequest("POST", "/report-download"),
    ).toThrow("write request blocked");
  });

  it("blocks unreviewed read endpoints until official docs are checked", () => {
    expect(() =>
      assertReadOnlySearchAdRequest("GET", "/ncc/ads"),
    ).toThrow("requires official-doc review");
  });
});
