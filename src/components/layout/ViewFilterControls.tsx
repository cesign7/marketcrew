"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

export type ViewFilterOption = {
  label: string;
  value: string;
};

type ViewFilterControlsProps = {
  businessFilters: ViewFilterOption[];
  periodFilters: ViewFilterOption[];
};

const DEFAULT_CHANNEL = "all";
const DEFAULT_PERIOD = "today";

export function ViewFilterControls({ businessFilters, periodFilters }: ViewFilterControlsProps) {
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const urlBusiness = normalizeFilterValue(searchParams.get("channel"), businessFilters, DEFAULT_CHANNEL);
  const urlPeriod = normalizeFilterValue(searchParams.get("period"), periodFilters, DEFAULT_PERIOD);
  const [selectedFilter, setSelectedFilter] = useState({
    channel: urlBusiness,
    period: urlPeriod,
  });

  useEffect(() => {
    setSelectedFilter({
      channel: urlBusiness,
      period: urlPeriod,
    });
  }, [urlBusiness, urlPeriod]);

  function updateFilter(key: "channel" | "period", value: string) {
    const nextParams = new URLSearchParams(window.location.search);
    if (!isAllowedFilterValue(nextParams.get("channel"), businessFilters)) {
      nextParams.delete("channel");
    }
    if (!isAllowedFilterValue(nextParams.get("period"), periodFilters)) {
      nextParams.delete("period");
    }
    const defaultValue = key === "channel" ? DEFAULT_CHANNEL : DEFAULT_PERIOD;
    const nextSelectedFilter = {
      ...selectedFilter,
      [key]: value,
    };
    setSelectedFilter(nextSelectedFilter);

    if (value === defaultValue) {
      nextParams.delete(key);
    } else {
      nextParams.set(key, value);
    }

    const queryString = nextParams.toString();
    startTransition(() => {
      const nextUrl = queryString ? `${window.location.pathname}?${queryString}` : window.location.pathname;
      window.history.replaceState(null, "", nextUrl);
      window.dispatchEvent(new CustomEvent("marketcrew:view-filter-change", { detail: nextSelectedFilter }));
    });
  }

  return (
    <section className="view-control-bar" aria-busy={isPending} aria-label="화면 보기 기준">
      <div className="filter-group" aria-label="브랜드 기준">
        <span>브랜드</span>
        {businessFilters.map((filter) => (
          <button
            aria-pressed={selectedFilter.channel === filter.value}
            key={filter.value}
            onClick={() => updateFilter("channel", filter.value)}
            type="button"
          >
            {filter.label}
          </button>
        ))}
      </div>
      <div className="filter-group period-filter-group" aria-label="기간 기준">
        <span>기간</span>
        {periodFilters.map((filter) => (
          <button
            aria-pressed={selectedFilter.period === filter.value}
            key={filter.value}
            onClick={() => updateFilter("period", filter.value)}
            type="button"
          >
            {filter.label}
          </button>
        ))}
      </div>
    </section>
  );
}

function normalizeFilterValue(value: string | null, options: ViewFilterOption[], defaultValue: string): string {
  if (isAllowedFilterValue(value, options)) {
    return value;
  }

  return defaultValue;
}

function isAllowedFilterValue(value: string | null, options: ViewFilterOption[]): value is string {
  return Boolean(value && options.some((option) => option.value === value));
}
