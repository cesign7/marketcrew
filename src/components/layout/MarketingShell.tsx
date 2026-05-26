import Link from "next/link";
import { LogoutButton } from "@/components/LogoutButton";
import { AD_PRODUCTS, BRANDS, getAdProductLabel, getBrandLabel } from "@/features/search-ad/domain/reportTypes";
import type { SearchAdFilters } from "@/features/search-ad/domain/types";

type MarketingShellProps = {
  activePath: string;
  children: React.ReactNode;
  filters?: SearchAdFilters;
  title: string;
  description: string;
};

const NAV_ITEMS = [
  { href: "/operations", label: "운영 홈" },
  { href: "/reports", label: "보고서" },
  { href: "/campaigns", label: "캠페인" },
  { href: "/adgroups", label: "광고그룹" },
  { href: "/search-terms", label: "검색어 성과" },
  { href: "/rule-results", label: "규칙 결과" },
  { href: "/rules", label: "성과 기준" },
  { href: "/action-logs", label: "실행 이력" },
  { href: "/settings", label: "설정" },
];

export function getMarketingNavItems() {
  return NAV_ITEMS;
}

export function MarketingShell({ activePath, children, description, filters, title }: MarketingShellProps) {
  return (
    <main className="app-shell">
      <aside className="side-nav" aria-label="마켓크루 메뉴">
        <div className="side-nav__brand">
          <strong>마켓크루</strong>
          <span>검색광고 운영</span>
        </div>
        <nav className="side-nav__links">
          {NAV_ITEMS.map((item) => (
            <Link aria-current={activePath === item.href ? "page" : undefined} className={activePath === item.href ? "is-active" : ""} href={withFilters(item.href, filters)} key={item.href}>
              {item.label}
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

        {filters ? <SearchAdTopFilters activePath={activePath} filters={filters} /> : null}
        {children}
      </section>
    </main>
  );
}

function SearchAdTopFilters({ activePath, filters }: { activePath: string; filters: SearchAdFilters }) {
  return (
    <section className="filter-bar" aria-label="검색광고 필터">
      <div className="filter-group">
        <span>브랜드</span>
        <Link className={filters.brand === "all" ? "is-active" : ""} href={withFilters(activePath, { ...filters, brand: "all" })}>
          {getBrandLabel("all")}
        </Link>
        {BRANDS.map((brand) => (
          <Link className={filters.brand === brand.key ? "is-active" : ""} href={withFilters(activePath, { ...filters, brand: brand.key })} key={brand.key}>
            {brand.label}
          </Link>
        ))}
      </div>
      <div className="filter-group">
        <span>광고유형</span>
        <Link className={filters.adProduct === "all" ? "is-active" : ""} href={withFilters(activePath, { ...filters, adProduct: "all" })}>
          {getAdProductLabel("all")}
        </Link>
        {AD_PRODUCTS.map((product) => (
          <Link className={filters.adProduct === product.key ? "is-active" : ""} href={withFilters(activePath, { ...filters, adProduct: product.key })} key={product.key}>
            {product.label}
          </Link>
        ))}
      </div>
    </section>
  );
}

function withFilters(path: string, filters?: SearchAdFilters) {
  if (!filters) {
    return path;
  }

  const params = new URLSearchParams();
  if (filters.brand !== "all") {
    params.set("brand", filters.brand);
  }
  if (filters.adProduct !== "all") {
    params.set("adProduct", filters.adProduct);
  }
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}
