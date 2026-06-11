import { randomUUID } from "node:crypto";
import type {
  CardDisplayPose,
  CardFormat,
  ProductImageStudioAssetRole,
  ProductImageStudioGenerationStatus,
  ProductImageStudioOutputType,
  ProductImageStudioProductType,
  ProductImageStudioQualityMode,
  ProductImageStudioRatioPreset,
} from "@/features/product-image-studio/domain/types";

export const PRODUCT_IMAGE_STUDIO_TABLE_NAMES = [
  "product_image_studio_projects",
  "product_image_studio_assets",
  "product_image_studio_generation_requests",
  "product_image_studio_results",
  "product_image_studio_download_bundles",
  "product_image_studio_usage_records",
] as const;

export type ProductImageStudioTableName = (typeof PRODUCT_IMAGE_STUDIO_TABLE_NAMES)[number];
export type ProductImageStudioJsonValue = string | number | boolean | null;
export type ProductImageStudioJsonSummary = Record<string, ProductImageStudioJsonValue>;

export type ProductImageStudioProjectRecord = {
  readonly id: string;
  readonly name: string;
  readonly productType: ProductImageStudioProductType;
  readonly cardFormat: CardFormat;
  readonly requestedCardPoses: readonly CardDisplayPose[];
  readonly requestedOutputs: readonly ProductImageStudioOutputType[];
  readonly ratios: readonly ProductImageStudioRatioPreset[];
  readonly qualityMode: ProductImageStudioQualityMode;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type CreateProductImageStudioProjectInput = Omit<ProductImageStudioProjectRecord, "id" | "createdAt" | "updatedAt">;

export type ProductImageStudioAssetRecord = {
  readonly id: string;
  readonly projectId: string;
  readonly role: ProductImageStudioAssetRole;
  readonly originalFileName: string;
  readonly contentType: string;
  readonly byteSize: number;
  readonly storageKey: string;
  readonly createdAt: string;
};

export type AddProductImageStudioAssetInput = Omit<ProductImageStudioAssetRecord, "id" | "createdAt">;

export type ProductImageStudioGenerationRequestRecord = {
  readonly id: string;
  readonly projectId: string;
  readonly conceptId: string;
  readonly qualityMode: ProductImageStudioQualityMode;
  readonly requestedOutputs: readonly ProductImageStudioOutputType[];
  readonly requestedCardPoses: readonly CardDisplayPose[];
  readonly status: ProductImageStudioGenerationStatus;
  readonly providerRequestSummary: ProductImageStudioJsonSummary;
  readonly providerResponseSummary: ProductImageStudioJsonSummary;
  readonly errorMessage?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
};

export type CreateProductImageStudioGenerationRequestInput = Omit<
  ProductImageStudioGenerationRequestRecord,
  "id" | "status" | "providerResponseSummary" | "errorMessage" | "createdAt" | "updatedAt"
>;

export type ProductImageStudioResultRecord = {
  readonly id: string;
  readonly projectId: string;
  readonly generationRequestId: string;
  readonly outputType: ProductImageStudioOutputType;
  readonly cardPose?: CardDisplayPose;
  readonly ratio: ProductImageStudioRatioPreset;
  readonly width: number;
  readonly height: number;
  readonly storageKey: string;
  readonly createdAt: string;
};

export type AddProductImageStudioResultInput = Omit<ProductImageStudioResultRecord, "id" | "createdAt">;

export type ProductImageStudioDownloadBundleRecord = {
  readonly id: string;
  readonly projectId: string;
  readonly resultIds: readonly string[];
  readonly manifest: ProductImageStudioJsonSummary;
  readonly storageKey: string;
  readonly createdAt: string;
};

export type AddProductImageStudioDownloadBundleInput = Omit<ProductImageStudioDownloadBundleRecord, "id" | "createdAt">;

export type ProductImageStudioUsageRecord = {
  readonly id: string;
  readonly projectId: string;
  readonly generationRequestId: string;
  readonly provider: string;
  readonly model: string;
  readonly qualityMode: ProductImageStudioQualityMode;
  readonly imageCount: number;
  readonly estimatedCostCents: number;
  readonly usageSummary: ProductImageStudioJsonSummary;
  readonly createdAt: string;
};

export type AddProductImageStudioUsageRecordInput = Omit<ProductImageStudioUsageRecord, "id" | "createdAt">;

export interface ProductImageStudioRepository {
  createProject(input: CreateProductImageStudioProjectInput): Promise<ProductImageStudioProjectRecord>;
  getProject(id: string): Promise<ProductImageStudioProjectRecord | null>;
  addAsset(input: AddProductImageStudioAssetInput): Promise<ProductImageStudioAssetRecord>;
  listAssets(projectId: string): Promise<readonly ProductImageStudioAssetRecord[]>;
  createGenerationRequest(
    input: CreateProductImageStudioGenerationRequestInput,
  ): Promise<ProductImageStudioGenerationRequestRecord>;
  addResult(input: AddProductImageStudioResultInput): Promise<ProductImageStudioResultRecord>;
  listResults(projectId: string): Promise<readonly ProductImageStudioResultRecord[]>;
  addDownloadBundle(input: AddProductImageStudioDownloadBundleInput): Promise<ProductImageStudioDownloadBundleRecord>;
  listDownloadBundles(projectId: string): Promise<readonly ProductImageStudioDownloadBundleRecord[]>;
  addUsageRecord(input: AddProductImageStudioUsageRecordInput): Promise<ProductImageStudioUsageRecord>;
  listUsageRecords(projectId: string): Promise<readonly ProductImageStudioUsageRecord[]>;
}

export type ProductImageStudioRepositoryOptions = {
  readonly createId?: () => string;
  readonly now?: () => string;
};

export function createInMemoryProductImageStudioRepository(
  options: ProductImageStudioRepositoryOptions = {},
): ProductImageStudioRepository {
  return new InMemoryProductImageStudioRepository(options.createId ?? randomUUID, options.now ?? defaultNow);
}

function defaultNow(): string {
  return new Date().toISOString();
}

class InMemoryProductImageStudioRepository implements ProductImageStudioRepository {
  private readonly projects = new Map<string, ProductImageStudioProjectRecord>();
  private readonly assets = new Map<string, ProductImageStudioAssetRecord>();
  private readonly generationRequests = new Map<string, ProductImageStudioGenerationRequestRecord>();
  private readonly results = new Map<string, ProductImageStudioResultRecord>();
  private readonly downloadBundles = new Map<string, ProductImageStudioDownloadBundleRecord>();
  private readonly usageRecords = new Map<string, ProductImageStudioUsageRecord>();

  constructor(
    private readonly createId: () => string,
    private readonly now: () => string,
  ) {}

  async createProject(input: CreateProductImageStudioProjectInput): Promise<ProductImageStudioProjectRecord> {
    const timestamp = this.now();
    const record = { ...input, createdAt: timestamp, id: this.createId(), updatedAt: timestamp };
    this.projects.set(record.id, record);
    return record;
  }

  async getProject(id: string): Promise<ProductImageStudioProjectRecord | null> {
    return this.projects.get(id) ?? null;
  }

  async addAsset(input: AddProductImageStudioAssetInput): Promise<ProductImageStudioAssetRecord> {
    const record = { ...input, createdAt: this.now(), id: this.createId() };
    this.assets.set(record.id, record);
    return record;
  }

  async listAssets(projectId: string): Promise<readonly ProductImageStudioAssetRecord[]> {
    return [...this.assets.values()].filter((asset) => asset.projectId === projectId);
  }

  async createGenerationRequest(
    input: CreateProductImageStudioGenerationRequestInput,
  ): Promise<ProductImageStudioGenerationRequestRecord> {
    const timestamp = this.now();
    const record: ProductImageStudioGenerationRequestRecord = {
      ...input,
      createdAt: timestamp,
      id: this.createId(),
      providerResponseSummary: {},
      status: "queued",
      updatedAt: timestamp,
    };
    this.generationRequests.set(record.id, record);
    return record;
  }

  async addResult(input: AddProductImageStudioResultInput): Promise<ProductImageStudioResultRecord> {
    const record = { ...input, createdAt: this.now(), id: this.createId() };
    this.results.set(record.id, record);
    return record;
  }

  async listResults(projectId: string): Promise<readonly ProductImageStudioResultRecord[]> {
    return [...this.results.values()].filter((result) => result.projectId === projectId);
  }

  async addDownloadBundle(
    input: AddProductImageStudioDownloadBundleInput,
  ): Promise<ProductImageStudioDownloadBundleRecord> {
    const record = { ...input, createdAt: this.now(), id: this.createId() };
    this.downloadBundles.set(record.id, record);
    return record;
  }

  async listDownloadBundles(projectId: string): Promise<readonly ProductImageStudioDownloadBundleRecord[]> {
    return [...this.downloadBundles.values()].filter((bundle) => bundle.projectId === projectId);
  }

  async addUsageRecord(input: AddProductImageStudioUsageRecordInput): Promise<ProductImageStudioUsageRecord> {
    const record = { ...input, createdAt: this.now(), id: this.createId() };
    this.usageRecords.set(record.id, record);
    return record;
  }

  async listUsageRecords(projectId: string): Promise<readonly ProductImageStudioUsageRecord[]> {
    return [...this.usageRecords.values()].filter((usage) => usage.projectId === projectId);
  }
}
