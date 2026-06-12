import { describe, expect, it } from "vitest";
import { renderProviderSettingsFormHtml } from "./providerSettingsFormFixture";

describe("product image studio provider settings form", () => {
  it("renders the provider settings UI without exposing credentials", () => {
    const html = renderProviderSettingsFormHtml();

    expect(html).toContain("생성 연결 설정");
    expect(html).toContain("생성 게이트");
    expect(html).toContain("게이트 열기");
    expect(html).toContain("게이트 닫기");
    expect(html).toContain("OpenAI");
    expect(html).toContain("Gemini");
    expect(html).toContain("실제 이미지 생성 허용");
    expect(html).toContain("키 저장됨");
    expect(html).not.toContain("secret");
    expect(html).not.toContain("OPENAI_API_KEY");
  });
});
