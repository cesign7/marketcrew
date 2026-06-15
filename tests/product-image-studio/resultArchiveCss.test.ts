import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("product image studio result archive CSS", () => {
  it("keeps archive CSS flat, stable, and neutral with one blue accent", () => {
    const css = readFileSync(
      join(process.cwd(), "src/components/product-image-studio/ProductImageStudioArchive.module.css"),
      "utf8",
    );
    const forbiddenTokens = ["lime", "mint", "purple", "orange", "#d9ff62", "--studio-lime", "#f4f2ee", "rgba(", "box-shadow", "linear-gradient"] as const;
    const allowedHexColors = new Set(["#0070f3", "#171717", "#404040", "#666666", "#d4d4d4", "#e5e5e5", "#ededed", "#fafafa", "#ffffff"]);
    const resultGridRules = Array.from(css.matchAll(/\.resultGrid\s*\{(?<body>[^}]*)\}/g), (match) => match.groups?.body ?? "");
    const resultGridRule = resultGridRules.find((rule) => rule.includes("grid-template-columns")) ?? "";
    const headingRule = css.match(/\.heading\s*\{(?<body>[^}]*)\}/)?.groups?.body ?? "";
    const projectCardRule = css.match(/\.projectCard\s*\{(?<body>[^}]*)\}/)?.groups?.body ?? "";
    const resultCardRule = css.match(/\.resultCard\s*\{(?<body>[^}]*)\}/)?.groups?.body ?? "";
    const summaryStripRule = css.match(/\.summaryStrip\s*\{(?<body>[^}]*)\}/)?.groups?.body ?? "";
    const cssHexColors = Array.from(css.matchAll(/#[0-9a-fA-F]{3,8}/g), (match) => match[0].toLowerCase());

    for (const token of forbiddenTokens) {
      expect(css).not.toContain(token);
    }
    for (const color of cssHexColors) {
      expect(allowedHexColors.has(color)).toBe(true);
    }
    expect(headingRule).not.toContain("background:");
    expect(headingRule).not.toContain("border:");
    expect(summaryStripRule).not.toContain("background:");
    expect(summaryStripRule).not.toContain("border:");
    expect(projectCardRule).toContain("min-height: 184px;");
    expect(resultCardRule).toContain("height: 100%;");
    expect(resultGridRule).not.toContain("justify-content: start;");
    expect(resultGridRule).toContain("grid-template-columns: repeat(auto-fit, minmax(min(100%, 260px), 1fr));");
  });
});
