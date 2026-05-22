import type { ProviderSyncReport } from "@/lib/domain";
import { buildCommerceReadOnlySyncReport, syncCommerceOrderAggregate } from "@/lib/integrations/commerce/read-only-sync";
import { buildDatalabReadOnlySyncReport, syncDatalabSearchTrends } from "@/lib/integrations/datalab/read-only-sync";
import { buildSearchAdReadOnlySyncReport, syncSearchAdKeywordTool } from "@/lib/integrations/search-ad/read-only-sync";
import { buildYoungcartReadOnlySyncReport, syncYoungcartBridgeAggregate } from "@/lib/integrations/youngcart/read-only-sync";

type EnvMap = Record<string, string | undefined>;

export function buildReadOnlyProviderSyncReports(
  env: EnvMap = process.env,
  checkedAt = new Date().toISOString(),
): ProviderSyncReport[] {
  return [
    buildSearchAdReadOnlySyncReport(env, checkedAt),
    buildDatalabReadOnlySyncReport(env, checkedAt),
    buildCommerceReadOnlySyncReport(env, checkedAt),
    buildYoungcartReadOnlySyncReport(env, checkedAt),
  ];
}

export async function syncReadOnlyProviderSyncReports(
  env: EnvMap = process.env,
  checkedAt = new Date().toISOString(),
): Promise<ProviderSyncReport[]> {
  const [searchAd, datalab, commerce, youngcart] = await Promise.all([
    syncSearchAdKeywordTool({ env, checkedAt }),
    syncDatalabSearchTrends({ env, checkedAt }),
    syncCommerceOrderAggregate({ env, checkedAt }),
    syncYoungcartBridgeAggregate({ env, checkedAt }),
  ]);

  return [searchAd, datalab, commerce, youngcart];
}
