"use client";

import { useEffect, useMemo, useState } from "react";
import type {
  AiEvidenceBriefView,
  AgentRunSummaryView,
  PlannerPreviewView,
  ProviderDataContractView,
  ProviderEvidenceExpansionPlanView,
  ProviderReadinessView,
  ProviderSyncEvidenceView,
} from "@/features/agenda-room/types";
import {
  filterAiEvidenceBriefs,
  filterProviderEvidenceExpansionPlans,
  filterProviderDataContracts,
  filterProviderReadiness,
  filterProviderSyncEvidence,
  dataPeriodLabel,
  dataPeriodPolicyLabel,
  normalizeDataBusiness,
  normalizeDataPeriod,
  type DataBusinessFilter,
  type DataPeriodFilter,
} from "@/features/agenda-room/data-filters";
import { AgentRunSummaryPanel } from "./AgentRunSummaryPanel";
import { AiEvidenceBriefPanel } from "./AiEvidenceBriefPanel";
import { PlannerPreviewPanel } from "./PlannerPreviewPanel";
import { ProviderCollectionPolicyPanel } from "./ProviderCollectionPolicyPanel";
import { ProviderDataContractPanel } from "./ProviderDataContractPanel";
import { ProviderEvidenceExpansionPlanPanel } from "./ProviderEvidenceExpansionPlanPanel";
import { ProviderReadinessPanel } from "./ProviderReadinessPanel";
import { ProviderSyncEvidencePanel } from "./ProviderSyncEvidencePanel";

type DataIntegrationPanelsProps = {
  agentRunSummary: AgentRunSummaryView;
  aiEvidenceBriefs: AiEvidenceBriefView[];
  initialBusiness: DataBusinessFilter;
  initialPeriod: DataPeriodFilter;
  plannerPreview: PlannerPreviewView;
  providerDataContracts: ProviderDataContractView[];
  providerEvidenceExpansionPlans?: ProviderEvidenceExpansionPlanView[];
  providerReadiness: ProviderReadinessView[];
  providerSyncEvidence: ProviderSyncEvidenceView[];
};

type ViewFilterChangeEvent = CustomEvent<{
  channel: string;
  period: string;
}>;

export function DataIntegrationPanels({
  agentRunSummary,
  aiEvidenceBriefs,
  initialBusiness,
  initialPeriod,
  plannerPreview,
  providerDataContracts,
  providerEvidenceExpansionPlans = [],
  providerReadiness,
  providerSyncEvidence,
}: DataIntegrationPanelsProps) {
  const [selectedFilter, setSelectedFilter] = useState({
    channel: initialBusiness,
    period: initialPeriod,
  });

  useEffect(() => {
    function handleFilterChange(event: Event) {
      const detail = (event as ViewFilterChangeEvent).detail;
      setSelectedFilter({
        channel: normalizeDataBusiness(detail?.channel),
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
  const filteredProviderDataContracts = useMemo(
    () => filterProviderDataContracts(providerDataContracts, selectedFilter.channel),
    [providerDataContracts, selectedFilter.channel],
  );
  const filteredProviderEvidenceExpansionPlans = useMemo(
    () => filterProviderEvidenceExpansionPlans(providerEvidenceExpansionPlans, selectedFilter.channel),
    [providerEvidenceExpansionPlans, selectedFilter.channel],
  );
  const filteredAiEvidenceBriefs = useMemo(
    () => filterAiEvidenceBriefs(aiEvidenceBriefs, selectedFilter.channel),
    [aiEvidenceBriefs, selectedFilter.channel],
  );
  const periodLabel = dataPeriodLabel(selectedFilter.period);
  const periodPolicyLabel = dataPeriodPolicyLabel(selectedFilter.period);

  return (
    <>
      <ProviderCollectionPolicyPanel
        contracts={filteredProviderDataContracts}
        periodLabel={periodLabel}
        periodPolicyLabel={periodPolicyLabel}
        reports={filteredProviderSyncEvidence}
      />
      <AiEvidenceBriefPanel briefs={filteredAiEvidenceBriefs} />
      <ProviderEvidenceExpansionPlanPanel plans={filteredProviderEvidenceExpansionPlans} />
      <ProviderDataContractPanel contracts={filteredProviderDataContracts} />
      <ProviderReadinessPanel providers={filteredProviderReadiness} />
      <ProviderSyncEvidencePanel reports={filteredProviderSyncEvidence} showHistoryPolicy />
      <PlannerPreviewPanel preview={plannerPreview} />
      <AgentRunSummaryPanel summary={agentRunSummary} />
    </>
  );
}
