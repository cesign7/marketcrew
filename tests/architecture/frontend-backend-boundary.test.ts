import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const frontendRoots = ["src/app", "src/components", "src/features"];
const forbiddenFrontendPatterns = [
  /from\s+["'][^"']*persistence(?:\/[^"']*)?["']/,
  /from\s+["']pg["']/,
  /postgres-read-model/,
  /postgres-repository/,
  /workflow-store/,
  /backend-workflow-state/,
  /\bDATABASE_URL\b/,
  /\bMARKETCREW_DATABASE_URL\b/,
  /화면 불러오는 중/,
];

describe("frontend/backend boundary", () => {
  it("프론트 화면과 API 프록시 라우트는 DB 직접 연결 모듈을 import하지 않는다", () => {
    const violations = frontendRoots
      .flatMap((root) => listSourceFiles(join(process.cwd(), root)))
      .flatMap((filePath) => {
        const content = readFileSync(filePath, "utf8");
        return forbiddenFrontendPatterns
          .filter((pattern) => pattern.test(content))
          .map((pattern) => `${filePath.replace(`${process.cwd()}/`, "")}: ${pattern}`);
      });

    expect(violations).toEqual([]);
  });
});

function listSourceFiles(root: string): string[] {
  return readdirSync(root).flatMap((entry) => {
    const filePath = join(root, entry);
    if (statSync(filePath).isDirectory()) {
      return listSourceFiles(filePath);
    }

    return /\.(?:ts|tsx)$/.test(filePath) ? [filePath] : [];
  });
}
