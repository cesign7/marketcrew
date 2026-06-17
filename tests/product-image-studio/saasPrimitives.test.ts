import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ImagePlus, PackageOpen, Sparkles } from "lucide-react";
import { describe, expect, it } from "vitest";
import {
  CompactActionCard,
  CompactCardGrid,
  CompactEmptyState,
  CompactItemCard,
  CompactPageHeader,
  CompactWorkModal,
  isWorkModalOverlayDismissTarget,
  shouldCloseWorkModalOnKey,
} from "@/components/product-image-studio/ProductImageStudioSaasPrimitives";

describe("product image studio compact SaaS primitives", () => {
  it("renders compact headers and card grids without nested card structures", () => {
    const html = renderToStaticMarkup(
      createElement(
        "section",
        null,
        createElement(CompactPageHeader, {
          eyebrow: "AI 도구",
          title: "이미지 작업",
          description: "자주 쓰는 작업만 빠르게 엽니다.",
          meta: "2개 준비됨",
        }),
        createElement(CompactCardGrid, {
          ariaLabel: "이미지 작업 카드",
          children: [
            createElement(CompactActionCard, {
              actionKind: "button",
              actionLabel: "열기",
              description: "인쇄물 이미지를 설정샷으로 만듭니다.",
              icon: Sparkles,
              id: "product-staging",
              key: "product-staging",
              onSelect: () => undefined,
              statusLabel: "사용 가능",
              statusTone: "ready",
              title: "상품 설정샷",
            }),
            createElement(CompactItemCard, {
              description: "최근 업로드한 카드 앞면",
              icon: ImagePlus,
              key: "card-front",
              meta: "PNG",
              title: "card-front.png",
            }),
          ],
        }),
      ),
    );

    expect(html).toContain('data-saas-page-header="true"');
    expect(html).toContain('data-saas-card-grid="true"');
    expect(countOccurrences(html, 'data-saas-action-card="')).toBe(1);
    expect(countOccurrences(html, 'data-saas-item-card="true"')).toBe(1);
    expect(html).not.toMatch(/data-saas-action-card="[^"]+"[\s\S]*data-saas-item-card="true"[\s\S]*<\/article>[\s\S]*<\/article>/);
  });

  it("renders empty states with concise Korean copy and a lucide icon", () => {
    const html = renderToStaticMarkup(
      createElement(CompactEmptyState, {
        action: createElement("button", { type: "button" }, "업로드"),
        description: "파일을 올리면 바로 작업을 시작할 수 있습니다.",
        icon: PackageOpen,
        title: "아직 이미지가 없습니다.",
      }),
    );

    expect(html).toContain('data-saas-empty-state="true"');
    expect(html).toContain("아직 이미지가 없습니다.");
    expect(html).toContain("업로드");
    expect(html).not.toContain('data-saas-action-card="');
  });

  it("renders an accessible work modal and exposes shared dismiss rules", () => {
    const html = renderToStaticMarkup(
      createElement(
        CompactWorkModal,
        {
          children: createElement("button", { type: "button" }, "작업 화면 열기"),
          description: "필요한 설정을 확인한 뒤 작업 화면으로 이동합니다.",
          onClose: () => undefined,
          open: true,
          title: "상품 설정샷 준비",
        },
      ),
    );

    expect(html).toContain('role="dialog"');
    expect(html).toContain('aria-modal="true"');
    expect(html).toContain('aria-label="닫기"');
    expect(html).toContain('data-work-modal-overlay-close="true"');
    expect(html).toContain('data-work-modal-initial-focus="true"');
    expect(shouldCloseWorkModalOnKey("Escape")).toBe(true);
    expect(shouldCloseWorkModalOnKey("Enter")).toBe(false);

    const overlayTarget = new EventTarget();
    const childTarget = new EventTarget();
    expect(isWorkModalOverlayDismissTarget(overlayTarget, overlayTarget)).toBe(true);
    expect(isWorkModalOverlayDismissTarget(childTarget, overlayTarget)).toBe(false);
  });

  it("keeps shared card radii at eight pixels or smaller", () => {
    const css = readFileSync(
      join(process.cwd(), "src/components/product-image-studio/ProductImageStudioSaasPrimitives.module.css"),
      "utf8",
    );

    const radii = Array.from(css.matchAll(/border-radius:\s*(\d+)px/g), (match) => Number(match[1]));
    expect(radii.length).toBeGreaterThan(0);
    expect(Math.max(...radii)).toBeLessThanOrEqual(8);
  });

  it("keeps shared card grids mobile-safe without wide minimum tracks", () => {
    const css = readFileSync(
      join(process.cwd(), "src/components/product-image-studio/ProductImageStudioSaasPrimitives.module.css"),
      "utf8",
    );
    const minTrackMatch = css.match(/grid-template-columns:\s*repeat\(auto-fit,\s*minmax\(min\(100%,\s*(\d+)px\),\s*1fr\)\)/);

    expect(minTrackMatch).not.toBeNull();
    expect(Number(minTrackMatch?.[1])).toBeLessThanOrEqual(208);
    expect(css).not.toContain("minmax(220px, 1fr)");
  });
});

function countOccurrences(value: string, needle: string): number {
  return value.split(needle).length - 1;
}
