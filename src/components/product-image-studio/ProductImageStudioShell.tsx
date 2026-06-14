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
    label: "이미지 제작",
    description: "새 상품컷 준비",
  },
  {
    key: "projects",
    href: "/product-image-studio/projects",
    label: "프로젝트",
    description: "작업 묶음",
  },
  {
    key: "results",
    href: "/product-image-studio/results",
    label: "결과",
    description: "완성 이미지",
  },
  {
    key: "settings",
    href: "/product-image-studio/settings",
    label: "설정",
    description: "연결 관리",
  },
];

export function getProductImageStudioNavItems() {
  return PRODUCT_IMAGE_STUDIO_NAV_AREAS.map((area) => ({ href: area.href, label: area.label }));
}

export function ProductImageStudioShell({ activePath, children, description, title }: ProductImageStudioShellProps) {
  const activeArea = getActiveArea(activePath);

  return (
    <main className={styles.shell}>
      <aside className={styles.resourceRail} aria-label="상품 이미지 스튜디오 리소스">
        <div className={styles.railBrand}>
          <strong>마켓크루</strong>
          <span>MarketCrew 비주얼 스튜디오</span>
        </div>

        <div className={styles.railSection}>
          <span className={styles.sectionLabel}>리소스</span>
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
      </aside>

      <section className={styles.workspace}>
        <header className={styles.topBar}>
          <div className={styles.titleCopy}>
            <span>작업 공간</span>
            <h1>{title}</h1>
            <p>{description}</p>
          </div>
          <div className={styles.topBarActions}>
            <Link className={styles.primaryLink} href="/product-image-studio" prefetch={false}>
              새 상품컷
            </Link>
            <LogoutButton />
          </div>
        </header>

        <section className={styles.contentWell}>
          {children}
        </section>
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
