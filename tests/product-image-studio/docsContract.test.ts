import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const PLAN_DOC = join(process.cwd(), "docs", "01-plan", "features", "product-image-studio.plan.md");
const ANALYSIS_DOC = join(process.cwd(), "docs", "03-analysis", "product-image-studio.analysis.md");

describe("product image studio docs contract", () => {
  it("documents the MVP outputs and excluded external writes in the plan", async () => {
    const planDoc = await readFile(PLAN_DOC, "utf8");

    for (const term of ["세트컷", "카드 단독컷", "봉투 단독컷", "봉합스티커 단독컷"]) {
      expect(planDoc).toContain(term);
    }
    expect(planDoc).toContain("접이식 카드");
    expect(planDoc).toContain("엽서형 카드");
    expect(planDoc).toContain("외부 원장 쓰기 금지");
    expect(planDoc).toContain("provider gate");
    expect(planDoc).toContain("스마트스토어");
    expect(planDoc).toContain("AIPRESSO");
  });

  it("checks implementation status and future integration boundaries in the analysis", async () => {
    const analysisDoc = await readFile(ANALYSIS_DOC, "utf8");

    expect(analysisDoc).toContain("/product-image-studio");
    expect(analysisDoc).toContain("세트컷");
    expect(analysisDoc).toContain("카드");
    expect(analysisDoc).toContain("봉투");
    expect(analysisDoc).toContain("봉합스티커");
    expect(analysisDoc).toContain("외부 원장 쓰기 금지");
    expect(analysisDoc).toContain("실제 provider 호출 차단");
    expect(analysisDoc).toContain("스마트스토어");
    expect(analysisDoc).toContain("AIPRESSO");
  });
});
