import Link from "next/link";
import { LogoutButton } from "@/components/LogoutButton";
import styles from "./ProductImageStudioShell.module.css";

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

const PRODUCT_IMAGE_STUDIO_NAV_AREAS: readonly ProductImageStudioNavigationArea[] = [
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
];

export function getProductImageStudioNavItems() {
  return PRODUCT_IMAGE_STUDIO_NAV_AREAS.map((area) => ({ href: area.href, label: area.label }));
}

export function ProductImageStudioShell({ activePath, children, description, title }: ProductImageStudioShellProps) {
  const activeArea = getActiveArea(activePath);

  return (
    <main className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.brandLine}>
          <div className={styles.brand}>
            <strong>마켓크루</strong>
            <span>AI 이미지 작업대</span>
          </div>
          <nav className={styles.nav} aria-label="상품 이미지 스튜디오 메뉴">
            {PRODUCT_IMAGE_STUDIO_NAV_AREAS.map((area) => (
              <Link
                aria-current={activeArea.key === area.key ? "page" : undefined}
                className={activeArea.key === area.key ? styles.activeLink : styles.navLink}
                href={area.href}
                key={area.key}
                prefetch={false}
              >
                <span>{area.label}</span>
                <small>{area.description}</small>
              </Link>
            ))}
          </nav>
        </div>

        <div className={styles.titleRow}>
          <div className={styles.titleCopy}>
            <span>상품 이미지 스튜디오</span>
            <h1>{title}</h1>
            <p>{description}</p>
          </div>
          <div className={styles.headerActions}>
            <Link className={styles.primaryLink} href="/product-image-studio" prefetch={false}>
              새 이미지 만들기
            </Link>
            <LogoutButton />
          </div>
        </div>
      </header>

      <section className={styles.workspace}>
        {children}
      </section>
    </main>
  );
}

function getActiveArea(activePath: string): ProductImageStudioNavigationArea {
  return (
    [...PRODUCT_IMAGE_STUDIO_NAV_AREAS].sort((left, right) => right.href.length - left.href.length).find(
      (area) => activePath === area.href || activePath.startsWith(`${area.href}/`),
    ) ?? PRODUCT_IMAGE_STUDIO_NAV_AREAS[0]
  );
}
