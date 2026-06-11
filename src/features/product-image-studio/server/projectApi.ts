import {
  CARD_FORMATS,
  PRODUCT_IMAGE_STUDIO_OUTPUT_TYPES,
  PRODUCT_IMAGE_STUDIO_PRODUCT_TYPES,
  PRODUCT_IMAGE_STUDIO_QUALITY_MODES,
  PRODUCT_IMAGE_STUDIO_RATIO_PRESETS,
  type CardDisplayPose,
  type CardFormat,
  type ProductImageStudioOutputType,
  type ProductImageStudioQualityMode,
  type ProductImageStudioRatioPreset,
} from "@/features/product-image-studio/domain/types";
import { getAllowedCardPosesForFormat } from "@/features/product-image-studio/domain/outputContracts";
import {
  createInMemoryProductImageStudioRepository,
  type CreateProductImageStudioProjectInput,
  type ProductImageStudioProjectRecord,
  type ProductImageStudioRepository,
} from "@/lib/persistence/productImageStudioRepository";

export type ProductImageStudioApiError = {
  readonly code: string;
  readonly message: string;
};

export type ProductImageStudioCreateProjectResult =
  | {
      readonly ok: true;
      readonly project: ProductImageStudioProjectRecord;
    }
  | {
      readonly error: ProductImageStudioApiError;
      readonly ok: false;
    };

const projectRepository = createInMemoryProductImageStudioRepository();

export function getProductImageStudioProjectRepository(): ProductImageStudioRepository {
  return projectRepository;
}

export async function createProductImageStudioProjectFromPayload(
  payload: unknown,
  repository: ProductImageStudioRepository = projectRepository,
): Promise<ProductImageStudioCreateProjectResult> {
  const parsed = parseCreateProjectPayload(payload);
  if (!parsed.ok) {
    return parsed;
  }

  const project = await repository.createProject(parsed.input);
  return { ok: true, project };
}

export async function getProductImageStudioProject(
  id: string,
  repository: ProductImageStudioRepository = projectRepository,
): Promise<ProductImageStudioProjectRecord | null> {
  return repository.getProject(id);
}

function parseCreateProjectPayload(
  payload: unknown,
):
  | {
      readonly input: CreateProductImageStudioProjectInput;
      readonly ok: true;
    }
  | {
      readonly error: ProductImageStudioApiError;
      readonly ok: false;
    } {
  if (!isRecord(payload)) {
    return invalidPayload("INVALID_JSON", "프로젝트 요청 형식이 올바르지 않습니다.");
  }

  const name = payload["name"];
  if (typeof name !== "string" || name.trim().length === 0) {
    return invalidPayload("PROJECT_NAME_REQUIRED", "프로젝트 이름을 입력해 주세요.");
  }

  if (!isOneOf(payload["productType"], PRODUCT_IMAGE_STUDIO_PRODUCT_TYPES)) {
    return invalidPayload("INVALID_PRODUCT_TYPE", "카드, 봉투, 봉합스티커 세트만 지원합니다.");
  }

  if (!isOneOf(payload["cardFormat"], CARD_FORMATS)) {
    return invalidPayload("INVALID_CARD_FORMAT", "카드 형식을 선택해 주세요.");
  }

  const cardFormat = payload["cardFormat"];
  const requestedCardPoses = parseAllowedStringArray(
    payload["requestedCardPoses"],
    getAllowedCardPosesForFormat(cardFormat),
  );
  const requestedOutputs = parseAllowedStringArray(payload["requestedOutputs"], PRODUCT_IMAGE_STUDIO_OUTPUT_TYPES);
  const ratios = parseAllowedStringArray(payload["ratios"], PRODUCT_IMAGE_STUDIO_RATIO_PRESETS);

  if (!requestedCardPoses || requestedCardPoses.length === 0) {
    return invalidPayload("INVALID_CARD_POSES", "카드 형식에 맞는 촬영 자세를 선택해 주세요.");
  }

  if (!requestedOutputs || requestedOutputs.length === 0) {
    return invalidPayload("INVALID_OUTPUTS", "생성할 이미지 종류를 선택해 주세요.");
  }

  if (!ratios || ratios.length === 0) {
    return invalidPayload("INVALID_RATIOS", "생성 비율을 선택해 주세요.");
  }

  if (!isOneOf(payload["qualityMode"], PRODUCT_IMAGE_STUDIO_QUALITY_MODES)) {
    return invalidPayload("INVALID_QUALITY_MODE", "생성 품질을 선택해 주세요.");
  }

  return {
    input: {
      cardFormat,
      name: name.trim(),
      productType: "card_envelope_seal_set",
      qualityMode: payload["qualityMode"],
      ratios: ratios satisfies readonly ProductImageStudioRatioPreset[],
      requestedCardPoses: requestedCardPoses satisfies readonly CardDisplayPose[],
      requestedOutputs: requestedOutputs satisfies readonly ProductImageStudioOutputType[],
    },
    ok: true,
  };
}

function invalidPayload(code: string, message: string): { readonly error: ProductImageStudioApiError; readonly ok: false } {
  return { error: { code, message }, ok: false };
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseAllowedStringArray<Value extends string>(
  value: unknown,
  allowedValues: readonly Value[],
): readonly Value[] | null {
  if (!Array.isArray(value)) {
    return null;
  }

  const parsed: Value[] = [];
  for (const item of value) {
    if (!isOneOf(item, allowedValues)) {
      return null;
    }
    parsed.push(item);
  }

  return parsed;
}

function isOneOf<Value extends string>(value: unknown, allowedValues: readonly Value[]): value is Value {
  return typeof value === "string" && allowedValues.some((allowedValue) => allowedValue === value);
}
