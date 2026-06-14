import Link from "next/link";
import { LogoutButton } from "@/components/LogoutButton";
import { Bell, FolderKanban, ImagePlus, Images, LayoutDashboard, Search, Settings, Sparkles } from "lucide-react";
import type { LucideIcon } from "lucide-react";
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
  readonly icon: LucideIcon;
  readonly description: string;
};

const PRODUCT_IMAGE_STUDIO_NAV_AREAS: readonly ProductImageStudioNavigationArea[] = [
  {
    key: "studio",
    href: "/product-image-studio",
    label: "이미지 제작",
    icon: Images,
    description: "캔버스 작업",
  },
  {
    key: "projects",
    href: "/product-image-studio/projects",
    label: "프로젝트",
    icon: FolderKanban,
    description: "작업 묶음",
  },
  {
    key: "results",
    href: "/product-image-studio/results",
    label: "결과",
    icon: ImagePlus,
    description: "이미지 보관함",
  },
  {
    key: "settings",
    href: "/product-image-studio/settings",
    label: "설정",
    icon: Settings,
    description: "연결과 모델",
  },
];

export function getProductImageStudioNavItems() {
  return PRODUCT_IMAGE_STUDIO_NAV_AREAS.map((area) => ({ href: area.href, label: area.label }));
}

export function ProductImageStudioShell({ activePath, children, description, title }: ProductImageStudioShellProps) {
  const activeArea = getActiveArea(activePath);

  return (
    <main className={styles.shell}>
      <aside className={styles.sidebar} aria-label="상품 이미지 스튜디오 메뉴">
        <div className={styles.railBrand}>
          <span className={styles.brandMark} aria-hidden="true">
            <Sparkles size={19} strokeWidth={2.5} />
          </span>
          <div>
            <strong>마켓크루</strong>
            <span>상품 이미지 스튜디오</span>
          </div>
        </div>

        <div className={styles.railSection}>
          <span className={styles.sectionLabel}>작업 메뉴</span>
          <nav className={styles.nav} aria-label="상품 이미지 스튜디오 메뉴">
            {PRODUCT_IMAGE_STUDIO_NAV_AREAS.map((area) => {
              const Icon = area.icon;
              return (
                <Link
                  aria-current={activeArea.key === area.key ? "page" : undefined}
                  className={activeArea.key === area.key ? styles.activeLink : styles.navLink}
                  href={area.href}
                  key={area.key}
                  prefetch={false}
                >
                  <span className={styles.navIcon} aria-hidden="true">
                    <Icon size={17} strokeWidth={2.25} />
                  </span>
                  <span className={styles.navText}>
                    <strong>{area.label}</strong>
                    <small>{area.description}</small>
                  </span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className={styles.sidebarCard}>
          <span>현재 모드</span>
          <strong>인쇄물 상품컷</strong>
          <small>카드, 봉투, 봉합스티커를 업로드한 구성만으로 생성합니다.</small>
        </div>
      </aside>

      <section className={styles.workspace}>
        <header className={styles.topBar}>
          <div className={styles.commandSearch} aria-label="스튜디오 검색">
            <span className={styles.searchIcon} aria-hidden="true">
              <Search size={16} strokeWidth={2.25} />
            </span>
            <span className={styles.commandSearchText}>상품명, 프로젝트, 생성 결과 검색</span>
          </div>
          <div className={styles.topBarActions}>
            <button className={styles.iconButton} type="button" aria-label="알림">
              <Bell size={17} strokeWidth={2.3} aria-hidden="true" />
            </button>
            <LogoutButton />
          </div>
        </header>

        <section className={styles.pageHeader} aria-label="현재 작업">
          <div className={styles.titleCopy}>
            <span>
              <span className={styles.titleIcon} aria-hidden="true">
                <LayoutDashboard size={14} strokeWidth={2.3} />
              </span>
              {activeArea.label}
            </span>
            <h1>{title}</h1>
            <p>{description}</p>
          </div>
          <Link className={styles.primaryLink} href="/product-image-studio" prefetch={false}>
            <span className={styles.primaryIcon} aria-hidden="true">
              <ImagePlus size={16} strokeWidth={2.35} />
            </span>
            새 상품컷
          </Link>
        </section>

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
