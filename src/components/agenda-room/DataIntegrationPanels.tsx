"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  AgentRunSummaryView,
  PlannerPreviewView,
  ProviderReadinessView,
  ProviderSyncEvidenceView,
} from "@/features/agenda-room/types";
import {
  filterProviderReadiness,
  filterProviderSyncEvidence,
  dataPeriodLabel,
  dataPeriodPolicyLabel,
  normalizeDataChannel,
  normalizeDataPeriod,
  type DataChannelFilter,
  type DataPeriodFilter,
} from "@/features/agenda-room/data-filters";
import { AgentRunSummaryPanel } from "./AgentRunSummaryPanel";
import { PlannerPreviewPanel } from "./PlannerPreviewPanel";
import { ProviderCollectionPolicyPanel } from "./ProviderCollectionPolicyPanel";
import { ProviderReadinessPanel } from "./ProviderReadinessPanel";
import { ProviderSyncEvidencePanel } from "./ProviderSyncEvidencePanel";

type DataIntegrationPanelsProps = {
  agentRunSummary: AgentRunSummaryView;
  initialChannel: DataChannelFilter;
  initialPeriod: DataPeriodFilter;
  plannerPreview: PlannerPreviewView;
  providerReadiness: ProviderReadinessView[];
  providerSyncEvidence: ProviderSyncEvidenceView[];
};

type ViewFilterChangeEvent = CustomEvent<{
  channel: string;
  period: string;
}>;

export function DataIntegrationPanels({
  agentRunSummary,
  initialChannel,
  initialPeriod,
  plannerPreview,
  providerReadiness,
  providerSyncEvidence,
}: DataIntegrationPanelsProps) {
  const [selectedFilter, setSelectedFilter] = useState({
    channel: initialChannel,
    period: initialPeriod,
  });

  useEffect(() => {
    function handleFilterChange(event: Event) {
      const detail = (event as ViewFilterChangeEvent).detail;
      setSelectedFilter({
        channel: normalizeDataChannel(detail?.channel),
        period: normalizeDataPeriod(detail?.period),
      });
    }

    window.addEventListener("marketcrew:view-filter-change", handleFilterChange);
    return () => window.removeEventListener("marketcrew:view-filter-change", handleFilterChange);
  }, []);

  const filteredProviderReadiness = useMemo(
    () => filterProviderReadiness(providerReadiness, selectedFilter.channel),
    [providerReadiness, selectedFilter.channel],
  );
  const filteredProviderSyncEvidence = useMemo(
    () => filterProviderSyncEvidence(providerSyncEvidence, selectedFilter.channel),
    [providerSyncEvidence, selectedFilter.channel],
  );
  const periodLabel = dataPeriodLabel(selectedFilter.period);
  const periodPolicyLabel = dataPeriodPolicyLabel(selectedFilter.period);

  return (
    <>
      <ProviderCollectionPolicyPanel
        periodLabel={periodLabel}
        periodPolicyLabel={periodPolicyLabel}
        reports={filteredProviderSyncEvidence}
      />
      <ProviderReadinessPanel providers={filteredProviderReadiness} />
      <ProviderSyncEvidencePanel reports={filteredProviderSyncEvidence} showHistoryPolicy />
      <PlannerPreviewPanel preview={plannerPreview} />
      <AgentRunSummaryPanel summary={agentRunSummary} />
    </>
  );
}
