import { extractSearchAdAdExtensionEvidence } from "@/features/search-ad/domain/adExtensionEvidence";
import { getSearchAdCredentials } from "@/lib/integrations/search-ad/client";
import { listSearchAdAdExtensionsByIds, type NaverAdExtension } from "@/lib/integrations/search-ad/management";
import { hasDatabaseUrl } from "@/lib/persistence/postgres";
import {
  backfillSearchAdRuleResultCreativeEvidence,
  listReferencedSearchAdAdExtensionIds,
  listSearchAdAdExtensionOwnerMetadata,
  saveSearchAdAdExtensionSnapshots,
  type SearchAdAdExtensionSnapshotInput,
  type SearchAdExtensionOwnerMetadata,
} from "@/lib/persistence/searchAdRepository";

export async function syncSearchAdAdExtensions() {
  if (!getSearchAdCredentials()) {
    return {
      ok: false as const,
      code: "SEARCH_AD_CREDENTIALS_MISSING",
      message: "네이버 검색광고 API 설정이 필요합니다.",
    };
  }

  if (!hasDatabaseUrl()) {
    return {
      ok: false as const,
      code: "SEARCH_AD_DATABASE_MISSING",
      message: "확장소재 정보를 저장할 DB 연결이 필요합니다.",
    };
  }

  const referencedIds = await listReferencedSearchAdAdExtensionIds();
  const ownerMetadata = await listSearchAdAdExtensionOwnerMetadata();
  const extensions = await listAdExtensions([...referencedIds]);
  const snapshots = extensions.map((extension) => toSnapshot(extension, ownerMetadata.get(extension.ownerId ?? "")));
  const saved = await saveSearchAdAdExtensionSnapshots(snapshots);
  const ruleBackfill = await backfillSearchAdRuleResultCreativeEvidence();

  return {
    ok: true as const,
    data: {
      collectedAt: saved.collectedAt,
      referencedExtensions: referencedIds.size,
      fetched: extensions.length,
      saved: saved.saved,
      ruleResults: ruleBackfill.updated,
    },
  };
}

async function listAdExtensions(ids: string[]) {
  const rows: NaverAdExtension[] = [];
  for (const chunk of chunkItems(ids, 100)) {
    rows.push(...(await listSearchAdAdExtensionsByIds(chunk)));
    await sleep(getAdExtensionSyncDelayMs());
  }
  return rows;
}

function toSnapshot(extension: NaverAdExtension, owner: SearchAdExtensionOwnerMetadata | undefined): SearchAdAdExtensionSnapshotInput {
  const rawPayload = extension as unknown as Record<string, unknown>;
  const evidence = extractSearchAdAdExtensionEvidence(rawPayload);

  return {
    providerExtensionId: extension.nccAdExtensionId,
    ownerId: extension.ownerId,
    ownerName: owner?.name,
    ownerType: owner?.ownerType,
    brandKey: owner?.brandKey,
    adProductType: owner?.adProductType,
    extensionType: evidence.extensionType,
    extensionTypeLabel: evidence.extensionTypeLabel,
    extensionLabel: evidence.extensionLabel,
    extensionDisplayLabel: evidence.extensionDisplayLabel,
    userLock: extension.userLock ?? null,
    status: extension.status,
    statusReason: extension.statusReason,
    inspectStatus: extension.inspectStatus,
    enable: extension.enable ?? null,
    pcChannelId: extension.pcChannelId,
    mobileChannelId: extension.mobileChannelId,
    rawPayload,
  };
}

function getAdExtensionSyncDelayMs() {
  const raw = Number.parseInt(process.env.SEARCH_AD_AD_EXTENSION_SYNC_DELAY_MS ?? "", 10);
  return Number.isFinite(raw) ? Math.max(0, raw) : 100;
}

function sleep(ms: number) {
  return ms > 0 ? new Promise((resolve) => setTimeout(resolve, ms)) : Promise.resolve();
}

function chunkItems<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}
