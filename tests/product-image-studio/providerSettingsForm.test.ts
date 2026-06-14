import { describe, expect, it } from "vitest";
import { renderEmptyProviderSettingsFormHtml, renderProviderSettingsFormHtml } from "./providerSettingsFormFixture";

describe("product image studio provider settings form", () => {
  it("renders the provider settings UI without exposing credentials", () => {
    const html = renderProviderSettingsFormHtml();

    expect(html).toContain("연결 리소스");
    expect(html).toContain("기본 생성 엔진");
    expect(html).toContain("생성 게이트");
    expect(html).toContain("게이트 열기");
    expect(html).toContain("게이트 닫기");
    expect(html).toContain("OpenAI");
    expect(html).toContain("Gemini");
    expect(html).toContain("실제 이미지 생성 허용");
    expect(html).toContain("저장됨");
    expect(html).toContain("연결 해제");
    expect(html).not.toContain("secret");
    expect(html).not.toContain("OPENAI_API_KEY");
  });

  it("shows the latest OpenAI image model for a new provider connection", () => {
    const html = renderEmptyProviderSettingsFormHtml();

    expect(html).toContain('value="gpt-image-2"');
  });
});
