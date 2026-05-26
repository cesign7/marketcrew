import type { AdProductType, BrandKey } from "./types";

export function inferBrandKey(...values: Array<string | undefined | null>): BrandKey | undefined {
  const text = values.filter(Boolean).join(" ").toLowerCase();
  if (text.includes("커피프린트") || text.includes("coffeeprint")) {
    return "coffeeprint";
  }

  if (text.includes("스티커씨") || text.includes("stickersee") || text.includes("sticker")) {
    return "stickersee";
  }

  return undefined;
}

export function inferAdProductType(...values: Array<string | undefined | null>): AdProductType | undefined {
  const text = values.filter(Boolean).join(" ").toLowerCase();
  if (text.includes("shopping") || text.includes("shop") || text.includes("쇼핑")) {
    return "shopping_search";
  }

  if (text.includes("power") || text.includes("web_site") || text.includes("파워링크") || text.includes("검색")) {
    return "powerlink";
  }

  return undefined;
}
