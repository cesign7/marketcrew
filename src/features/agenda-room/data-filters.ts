import type { ProviderReadinessView, ProviderSyncEvidenceView } from "./types";

export type DataChannelFilter = "all" | "stickersee" | "coffeeprint" | "search-ad";
export type DataPeriodFilter = "today" | "7d" | "30d" | "last-year" | "holiday";

export function normalizeDataChannel(value: string | undefined): DataChannelFilter {
  if (value === "stickersee" || value === "coffeeprint" || value === "search-ad") {
    return value;
  }

  return "all";
}

export function normalizeDataPeriod(value: string | undefined): DataPeriodFilter {
  if (value === "7d" || value === "30d" || value === "last-year" || value === "holiday") {
    return value;
  }

  return "today";
}

export function filterProviderReadiness(
  providers: ProviderReadinessView[],
  selectedChannel: DataChannelFilter,
): ProviderReadinessView[] {
  if (selectedChannel === "all") {
    return providers;
  }

  return providers.filter((provider) => {
    if (selectedChannel === "stickersee") {
      return provider.id === "smartstore";
    }
    if (selectedChannel === "coffeeprint") {
      return provider.id === "shop";
    }

    return provider.id === "search_ad" || provider.id === "datalab";
  });
}

export function filterProviderSyncEvidence(
  reports: ProviderSyncEvidenceView[],
  selectedChannel: DataChannelFilter,
): ProviderSyncEvidenceView[] {
  if (selectedChannel === "all") {
    return reports;
  }

  return reports.filter((report) => {
    if (selectedChannel === "stickersee") {
      return report.channelKey === "smartstore-stickersee";
    }
    if (selectedChannel === "coffeeprint") {
      return report.channelKey === "shop-coffeeprint";
    }

    return report.providerKey === "search_ad" || report.providerKey === "datalab";
  });
}
