import Link from "next/link";
import { LogoutButton } from "@/components/LogoutButton";
import { buildSearchAdFilterHref } from "@/features/search-ad/domain/filterLinks";
import { AD_PRODUCTS, BRANDS, getAdProductLabel, getBrandLabel } from "@/features/search-ad/domain/reportTypes";
import type { SearchAdFilters } from "@/features/search-ad/domain/types";

type MarketingShellProps = {
  activePath: string;
  children: React.ReactNode;
  filterPath?: string;
  filters?: SearchAdFilters;
  title: string;
  description: string;
};

type NavigationArea = {
  key: string;
  label: string;
  href: string;
  description: string;
  tabs: Array<{ href: string; label: string }>;
};

const NAV_AREAS: NavigationArea[] = [
  {
    key: "home",
    label: "운영 홈",
    href: "/operations",
    description: "오늘 볼 요약",
    tabs: [{ href: "/operations", label: "운영 요약" }],
  },
  {
    key: "data",
    label: "데이터/보고서",
    href: "/reports",
    description: "수집 데이터 확인",
    tabs: [
      { href: "/reports", label: "보고서 보관함" },
      { href: "/search-terms", label: "검색어 성과" },
    ],
  },
  {
    key: "ads",
    label: "광고 운영",
    href: "/campaigns",
    description: "상태와 키워드 관리",
    tabs: [
      { href: "/campaigns", label: "캠페인" },
      { href: "/adgroups", label: "광고그룹" },
      { href: "/keywords", label: "키워드 정리" },
    ],
  },
  {
    key: "analysis",
    label: "성과 분석",
    href: "/rule-results",
    description: "규칙과 기준",
    tabs: [
      { href: "/rule-results", label: "규칙 결과" },
      { href: "/rules", label: "성과 기준" },
    ],
  },
  {
    key: "execution",
    label: "실행 관리",
    href: "/action-logs",
    description: "변경 이력",
    tabs: [{ href: "/action-logs", label: "실행 이력" }],
  },
  {
    key: "settings",
    label: "설정",
    href: "/settings",
    description: "연결과 보관",
    tabs: [{ href: "/settings", label: "연결/보고서" }],
  },
];

export function getMarketingNavItems() {
  return NAV_AREAS.map((area) => ({ href: area.href, label: area.label }));
}

export function MarketingShell({ activePath, children, description, filterPath, filters, title }: MarketingShellProps) {
  const activeArea = getActiveArea(activePath);
  const currentFilterPath = filterPath ?? activePath;

  return (
    <main className="app-shell">
      <aside className="side-nav" aria-label="마켓크루 메뉴">
        <div className="side-nav__brand">
          <strong>마켓크루</strong>
          <span>검색광고 운영</span>
        </div>
        <nav className="side-nav__links">
          {NAV_AREAS.map((area) => (
            <Link
              aria-current={activeArea.key === area.key ? "page" : undefined}
              className={activeArea.key === area.key ? "is-active" : ""}
              href={buildSearchAdFilterHref(area.href, filters)}
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
            <span className="eyebrow">네이버 검색광고</span>
            <h1>{title}</h1>
            <p className="muted">{description}</p>
          </div>
          <LogoutButton />
        </header>

        <WorkAreaTabs activePath={activePath} area={activeArea} filters={filters} />
        {filters ? <SearchAdTopFilters filterPath={currentFilterPath} filters={filters} /> : null}
        {children}
      </section>
    </main>
  );
}

function WorkAreaTabs({ activePath, area, filters }: { activePath: string; area: NavigationArea; filters?: SearchAdFilters }) {
  if (area.tabs.length <= 1) {
    return null;
  }

  return (
    <nav className="work-tabs" aria-label={`${area.label} 업무 이동`}>
      {area.tabs.map((tab) => (
        <Link
          aria-current={activePath === tab.href ? "page" : undefined}
          className={activePath === tab.href ? "is-active" : ""}
          href={buildSearchAdFilterHref(tab.href, filters)}
          key={tab.href}
          prefetch={false}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}

function SearchAdTopFilters({ filterPath, filters }: { filterPath: string; filters: SearchAdFilters }) {
  return (
    <section className="filter-bar" aria-label="검색광고 필터">
      <div className="filter-group">
        <span>브랜드</span>
        <Link className={filters.brand === "all" ? "is-active" : ""} href={buildSearchAdFilterHref(filterPath, { ...filters, brand: "all" })} prefetch={false}>
          {getBrandLabel("all")}
        </Link>
        {BRANDS.map((brand) => (
          <Link className={filters.brand === brand.key ? "is-active" : ""} href={buildSearchAdFilterHref(filterPath, { ...filters, brand: brand.key })} key={brand.key} prefetch={false}>
            {brand.label}
          </Link>
        ))}
      </div>
      <div className="filter-group">
        <span>광고유형</span>
        <Link className={filters.adProduct === "all" ? "is-active" : ""} href={buildSearchAdFilterHref(filterPath, { ...filters, adProduct: "all" })} prefetch={false}>
          {getAdProductLabel("all")}
        </Link>
        {AD_PRODUCTS.map((product) => (
          <Link className={filters.adProduct === product.key ? "is-active" : ""} href={buildSearchAdFilterHref(filterPath, { ...filters, adProduct: product.key })} key={product.key} prefetch={false}>
            {product.label}
          </Link>
        ))}
      </div>
    </section>
  );
}

function getActiveArea(activePath: string) {
  return NAV_AREAS.find((area) => area.tabs.some((tab) => tab.href === activePath) || area.href === activePath) ?? NAV_AREAS[0];
}
