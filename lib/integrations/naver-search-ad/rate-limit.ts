import type {
  SearchAdAdgroup,
  SearchAdKeyword,
} from "@/lib/integrations/naver-search-ad/normalize";

export interface CollectKeywordsSequentiallyInput {
  adgroups: SearchAdAdgroup[];
  adgroupCampaignMap: Map<string, string>;
  delayMs: number;
  fetchKeywords: (
    adgroupId: string,
    adgroupCampaignMap: Map<string, string>,
  ) => Promise<SearchAdKeyword[]>;
  wait?: (delayMs: number) => Promise<void>;
}

export async function collectKeywordsSequentially({
  adgroups,
  adgroupCampaignMap,
  delayMs,
  fetchKeywords,
  wait = sleep,
}: CollectKeywordsSequentiallyInput) {
  const keywords: SearchAdKeyword[] = [];

  for (const [index, adgroup] of adgroups.entries()) {
    keywords.push(...(await fetchKeywords(adgroup.id, adgroupCampaignMap)));

    if (delayMs > 0 && index < adgroups.length - 1) {
      await wait(delayMs);
    }
  }

  return keywords;
}

export function getKeywordRequestDelayMs(
  env: Partial<Record<string, string | undefined>> = process.env,
) {
  const raw = env.NAVER_SEARCH_AD_KEYWORD_REQUEST_DELAY_MS?.trim();

  if (!raw) {
    return 1000;
  }

  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 1000;
}

function sleep(delayMs: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, delayMs);
  });
}
