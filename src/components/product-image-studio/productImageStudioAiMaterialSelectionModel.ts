import type {
  ProductImageStudioMaterialRecord,
  ProductImageStudioMaterialTarget,
} from "@/features/product-image-studio/domain/materialLibrary";
import { parseProductImageStudioMaterialRecord } from "@/features/product-image-studio/domain/materialLibrary";

export type ProductImageStudioAiMaterialSelectionGroupId = "card" | "envelope" | "sticker" | "business_card";
export type ProductImageStudioAiMaterialSelectionTarget = ProductImageStudioAiMaterialSelectionGroupId;

export type ProductImageStudioAiMaterialSelectionEntry = {
  readonly locked: boolean;
  readonly materialId: string;
  readonly target: ProductImageStudioAiMaterialSelectionGroupId;
};

export type ProductImageStudioAiMaterialSelectionState = {
  readonly entries: readonly ProductImageStudioAiMaterialSelectionEntry[];
};

export type ProductImageStudioAiMaterialSelectionChoice = {
  readonly canSwap: boolean;
  readonly groupId: ProductImageStudioAiMaterialSelectionGroupId;
  readonly label: string;
  readonly locked: boolean;
  readonly materials: readonly ProductImageStudioMaterialRecord[];
  readonly selectedMaterial: ProductImageStudioMaterialRecord | null;
  readonly target: ProductImageStudioAiMaterialSelectionGroupId;
};

type ProductImageStudioAiMaterialSelectionTargetDefinition = {
  readonly compatibleTargets: readonly ProductImageStudioMaterialTarget[];
  readonly groupId: ProductImageStudioAiMaterialSelectionGroupId;
  readonly label: string;
};

const PRODUCT_IMAGE_STUDIO_AI_MATERIAL_TARGETS = [
  { compatibleTargets: ["folded_card", "postcard"], groupId: "card", label: "카드·엽서" },
  { compatibleTargets: ["envelope"], groupId: "envelope", label: "봉투" },
  { compatibleTargets: ["sticker"], groupId: "sticker", label: "스티커" },
  { compatibleTargets: ["business_card"], groupId: "business_card", label: "명함" },
] as const satisfies readonly ProductImageStudioAiMaterialSelectionTargetDefinition[];

export function createInitialProductImageStudioAiMaterialSelectionState(
  materials: readonly unknown[] | null | undefined,
): ProductImageStudioAiMaterialSelectionState {
  const entries: ProductImageStudioAiMaterialSelectionEntry[] = [];
  for (const choice of getProductImageStudioAiMaterialSelectionChoices(materials, { entries: [] })) {
    if (choice.selectedMaterial) {
      entries.push({ locked: false, materialId: choice.selectedMaterial.id, target: choice.groupId });
    }
  }
  return { entries };
}

export function syncProductImageStudioAiMaterialSelectionState(
  materials: readonly unknown[] | null | undefined,
  state: ProductImageStudioAiMaterialSelectionState,
): ProductImageStudioAiMaterialSelectionState {
  const entries: ProductImageStudioAiMaterialSelectionEntry[] = [];
  for (const choice of getProductImageStudioAiMaterialSelectionChoices(materials, state)) {
    if (choice.selectedMaterial) {
      entries.push({ locked: choice.locked, materialId: choice.selectedMaterial.id, target: choice.groupId });
    }
  }
  return { entries };
}

export function getProductImageStudioAiMaterialSelectionChoices(
  materials: readonly unknown[] | null | undefined,
  state: ProductImageStudioAiMaterialSelectionState,
): readonly ProductImageStudioAiMaterialSelectionChoice[] {
  const normalizedMaterials = normalizeProductImageStudioAiMaterialSelectionMaterials(materials);
  const choices: ProductImageStudioAiMaterialSelectionChoice[] = [];
  for (const definition of PRODUCT_IMAGE_STUDIO_AI_MATERIAL_TARGETS) {
    const targetMaterials = normalizedMaterials.filter((material) =>
      isCompatibleMaterial(material, definition.compatibleTargets),
    );
    if (targetMaterials.length > 0) {
      const entry = state.entries.find((candidate) => candidate.target === definition.groupId);
      const selectedMaterial = findSelectedMaterial(targetMaterials, entry?.materialId);
      choices.push({
        canSwap: targetMaterials.length > 1,
        groupId: definition.groupId,
        label: definition.label,
        locked: entry?.locked ?? false,
        materials: targetMaterials,
        selectedMaterial,
        target: definition.groupId,
      });
    }
  }
  return choices;
}

export function toggleProductImageStudioAiMaterialSelectionLock(
  state: ProductImageStudioAiMaterialSelectionState,
  groupId: ProductImageStudioAiMaterialSelectionGroupId,
): ProductImageStudioAiMaterialSelectionState {
  const entry = state.entries.find((candidate) => candidate.target === groupId);
  if (!entry) {
    return state;
  }
  return setSelectionEntry(state, { ...entry, locked: !entry.locked });
}

export function selectNextProductImageStudioAiMaterial(
  materials: readonly unknown[] | null | undefined,
  state: ProductImageStudioAiMaterialSelectionState,
  groupId: ProductImageStudioAiMaterialSelectionGroupId,
): ProductImageStudioAiMaterialSelectionState {
  const choice = getProductImageStudioAiMaterialSelectionChoices(materials, state).find(
    (candidate) => candidate.groupId === groupId,
  );
  if (!choice || choice.locked || choice.materials.length < 2 || !choice.selectedMaterial) {
    return state;
  }

  const currentIndex = choice.materials.findIndex((material) => material.id === choice.selectedMaterial?.id);
  const nextIndex = currentIndex < 0 || currentIndex + 1 >= choice.materials.length ? 0 : currentIndex + 1;
  const nextMaterial = choice.materials[nextIndex];
  if (!nextMaterial) {
    return state;
  }
  return setSelectionEntry(state, { locked: false, materialId: nextMaterial.id, target: groupId });
}

export function formatProductImageStudioAiMaterialSummary(material: ProductImageStudioMaterialRecord): string {
  const size = material.sizeMm ? ` · ${material.sizeMm.width} x ${material.sizeMm.height}mm` : "";
  return `${material.surface} · ${material.colorName} · ${material.thickness.value} ${material.thickness.unit}${size}`;
}

function isCompatibleMaterial(
  material: ProductImageStudioMaterialRecord,
  targets: readonly ProductImageStudioMaterialTarget[],
): boolean {
  return material.compatibleTargets.some((target) => targets.some((candidate) => candidate === target));
}

function findSelectedMaterial(
  materials: readonly ProductImageStudioMaterialRecord[],
  materialId: string | undefined,
): ProductImageStudioMaterialRecord | null {
  const selectedMaterial = materialId ? materials.find((material) => material.id === materialId) : undefined;
  return selectedMaterial ?? materials[0] ?? null;
}

function normalizeProductImageStudioAiMaterialSelectionMaterials(
  materials: readonly unknown[] | null | undefined,
): readonly ProductImageStudioMaterialRecord[] {
  if (!materials) {
    return [];
  }
  const normalizedMaterials: ProductImageStudioMaterialRecord[] = [];
  for (const material of materials) {
    const normalizedMaterial = parseProductImageStudioMaterialRecord(material);
    if (normalizedMaterial) {
      normalizedMaterials.push(normalizedMaterial);
    }
  }
  return normalizedMaterials;
}

function setSelectionEntry(
  state: ProductImageStudioAiMaterialSelectionState,
  entry: ProductImageStudioAiMaterialSelectionEntry,
): ProductImageStudioAiMaterialSelectionState {
  const replacedEntries = state.entries.map((candidate) => (candidate.target === entry.target ? entry : candidate));
  return state.entries.some((candidate) => candidate.target === entry.target)
    ? { entries: replacedEntries }
    : { entries: [...state.entries, entry] };
}
