"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

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
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const activeChannel = searchParams.get("channel") ?? DEFAULT_CHANNEL;
  const activePeriod = searchParams.get("period") ?? DEFAULT_PERIOD;

  function updateFilter(key: "channel" | "period", value: string) {
    const nextParams = new URLSearchParams(searchParams.toString());
    const defaultValue = key === "channel" ? DEFAULT_CHANNEL : DEFAULT_PERIOD;
    if (value === defaultValue) {
      nextParams.delete(key);
    } else {
      nextParams.set(key, value);
    }

    const queryString = nextParams.toString();
    startTransition(() => {
      router.replace(queryString ? `${pathname}?${queryString}` : pathname, { scroll: false });
    });
  }

  return (
    <section className="view-control-bar" aria-busy={isPending} aria-label="화면 보기 기준">
      <div className="filter-group" aria-label="채널 기준">
        <span>채널</span>
        {channelFilters.map((filter) => (
          <button
            aria-pressed={activeChannel === filter.value}
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
            aria-pressed={activePeriod === filter.value}
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
