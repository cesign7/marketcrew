import { describe, expect, it } from "vitest";
import { createSearchAdSignature, normalizeSignatureUri } from "@/lib/integrations/search-ad/signer";

describe("Search Ad signer", () => {
  it("공식 문서의 /api prefix를 실제 서명 path에서 제거한다", () => {
    expect(normalizeSignatureUri("/api/stat-reports?x=1")).toBe("/stat-reports");
    expect(normalizeSignatureUri("/report-download?authtoken=abc&fileVersion=1")).toBe("/report-download");
  });

  it("같은 timestamp/method/path/secret 조합은 같은 서명을 만든다", () => {
    const first = createSearchAdSignature({
      method: "GET",
      secretKey: "secret",
      timestamp: "1700000000000",
      uri: "/report-download?authtoken=ignored",
    });
    const second = createSearchAdSignature({
      method: "GET",
      secretKey: "secret",
      timestamp: "1700000000000",
      uri: "/report-download",
    });

    expect(first).toBe(second);
  });
});
