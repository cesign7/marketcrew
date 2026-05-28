import type { SearchAdFilters } from "./types";

export function buildSearchAdFilterHref(path: string, filters?: SearchAdFilters) {
  if (!filters) {
    return path;
  }

  const [pathAndQuery, hash = ""] = path.split("#", 2);
  const [pathname, query = ""] = pathAndQuery.split("?", 2);
  const params = new URLSearchParams(query);

  setFilterParam(params, "brand", filters.brand);
  setFilterParam(params, "adProduct", filters.adProduct);

  const nextQuery = params.toString();
  return `${pathname}${nextQuery ? `?${nextQuery}` : ""}${hash ? `#${hash}` : ""}`;
}

function setFilterParam(params: URLSearchParams, key: keyof SearchAdFilters, value: SearchAdFilters[keyof SearchAdFilters]) {
  if (value === "all") {
    params.delete(key);
    return;
  }

  params.set(key, value);
}
