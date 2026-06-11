import Link from "next/link";
import { LogoutButton } from "@/components/LogoutButton";

type ProductImageStudioShellProps = {
  readonly activePath: string;
  readonly children: React.ReactNode;
  readonly description: string;
  readonly title: string;
};

type ProductImageStudioNavigationArea = {
  readonly key: string;
  readonly href: string;
  readonly label: string;
  readonly description: string;
};

const PRODUCT_IMAGE_STUDIO_NAV_AREAS = [
  {
    key: "studio",
    href: "/product-image-studio",
    label: "스튜디오",
    description: "이미지 제작",
  },
  {
    key: "projects",
    href: "/product-image-studio/projects",
    label: "프로젝트",
    description: "인쇄물 세트",
  },
  {
    key: "results",
    href: "/product-image-studio/results",
    label: "결과 보관함",
    description: "생성 이미지",
  },
  {
    key: "settings",
    href: "/product-image-studio/settings",
    label: "이미지 설정",
    description: "생성 상태",
  },
] as const satisfies readonly ProductImageStudioNavigationArea[];

export function getProductImageStudioNavItems() {
  return PRODUCT_IMAGE_STUDIO_NAV_AREAS.map((area) => ({ href: area.href, label: area.label }));
}

export function ProductImageStudioShell({ activePath, children, description, title }: ProductImageStudioShellProps) {
  const activeArea = getActiveArea(activePath);

  return (
    <main className="app-shell">
      <aside className="side-nav" aria-label="상품 이미지 스튜디오 메뉴">
        <div className="side-nav__brand">
          <strong>마켓크루</strong>
          <span>상품 이미지 제작</span>
        </div>
        <nav className="side-nav__links">
          {PRODUCT_IMAGE_STUDIO_NAV_AREAS.map((area) => (
            <Link
              aria-current={activeArea.key === area.key ? "page" : undefined}
              className={activeArea.key === area.key ? "is-active" : ""}
              href={area.href}
              key={area.key}
              prefetch={false}
            >
              <span>{area.label}</span>
              <small>{area.description}</small>
            </Link>
          ))}
        </nav>
      </aside>

      <section className="workspace">
        <header className="workspace-header">
          <div>
            <span className="eyebrow">상품 이미지 스튜디오</span>
            <h1>{title}</h1>
            <p className="muted">{description}</p>
          </div>
          <LogoutButton />
        </header>

        {children}
      </section>
    </main>
  );
}

function getActiveArea(activePath: string): ProductImageStudioNavigationArea {
  return (
    PRODUCT_IMAGE_STUDIO_NAV_AREAS.find(
      (area) => activePath === area.href || activePath.startsWith(`${area.href}/`),
    ) ?? PRODUCT_IMAGE_STUDIO_NAV_AREAS[0]
  );
}
