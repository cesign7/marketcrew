import { writeFile } from "node:fs/promises";
import path from "node:path";
import { expect, test } from "@playwright/test";

const baseUrl = process.env.MARKETCREW_TASK5_BASE_URL;
const svgFixturePath = path.resolve(".omo/evidence/fixtures/safe-card.svg");
const screenshotPath = path.resolve(".omo/evidence/task-5-generator-svg-upload.png");
const receiptPath = path.resolve(".omo/evidence/task-5-generator-svg-upload.txt");

test.use({ channel: "chrome", viewport: { height: 900, width: 1280 } });

test("uploads a safe SVG reference on the image generator page", async ({ page }) => {
  if (!baseUrl) {
    throw new Error("MARKETCREW_TASK5_BASE_URL is required for the Todo 5 SVG upload proof.");
  }

  await page.goto(`${baseUrl}/product-image-studio/ai-tools/image-generator`, { waitUntil: "networkidle" });

  const fileInput = page.locator('input[type="file"][name="referenceImages"]');
  await expect(fileInput).toHaveAttribute("accept", /image\/svg\+xml/);

  await fileInput.setInputFiles(svgFixturePath);

  const referenceList = page.getByLabel("업로드한 참고 이미지");
  await expect(referenceList).toBeVisible();
  await expect(referenceList).toContainText("safe-card.svg");
  await expect(referenceList).toContainText("SVG 참고");

  await page.screenshot({ fullPage: true, path: screenshotPath });
  await writeFile(
    receiptPath,
    [
      "PASS generator SVG upload browser proof",
      `URL: ${baseUrl}/product-image-studio/ai-tools/image-generator`,
      "Dev server: MARKETCREW_AUTH_DISABLED=1 npm run dev -- --hostname 127.0.0.1 --port 57778",
      "Command: NODE_PATH=<npx @playwright/test node_modules> MARKETCREW_TASK5_BASE_URL=http://127.0.0.1:57778 npx --yes @playwright/test@latest test .omo/evidence/task-5-generator-svg-upload.spec.ts --reporter=line",
      `Fixture: ${svgFixturePath}`,
      "Action: page.setInputFiles('input[type=file]', ['.omo/evidence/fixtures/safe-card.svg'])",
      "Asserted: upload input accepts SVG, reference list is visible, safe-card.svg appears with SVG 참고",
      `Screenshot: ${screenshotPath}`,
      "",
    ].join("\n"),
    "utf8",
  );
});
