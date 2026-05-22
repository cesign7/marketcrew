"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

export type ViewFilterOption = {
  label: string;
  value: string;
};

type ViewFilterControlsProps = {
  channelFilters: ViewFilterOption[];
  periodFilters: ViewFilterOption[];
};

const DEFAULT_CHANNEL = "all";
const DEFAULT_PERIOD = "today";

export function ViewFilterControls({ channelFilters, periodFilters }: ViewFilterControlsProps) {
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const urlChannel = normalizeFilterValue(searchParams.get("channel"), channelFilters, DEFAULT_CHANNEL);
  const urlPeriod = normalizeFilterValue(searchParams.get("period"), periodFilters, DEFAULT_PERIOD);
  const [selectedFilter, setSelectedFilter] = useState({
    channel: urlChannel,
    period: urlPeriod,
  });

  useEffect(() => {
    setSelectedFilter({
      channel: urlChannel,
      period: urlPeriod,
    });
  }, [urlChannel, urlPeriod]);

  function updateFilter(key: "channel" | "period", value: string) {
    const nextParams = new URLSearchParams(window.location.search);
    if (!isAllowedFilterValue(nextParams.get("channel"), channelFilters)) {
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
      <div className="filter-group" aria-label="채널 기준">
        <span>채널</span>
        {channelFilters.map((filter) => (
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
