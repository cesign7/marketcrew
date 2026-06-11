"use client";

import { useState, type ChangeEvent } from "react";
import {
  regenerateProductImageStudioResultRatio,
  type ProductImageStudioRegenerateRatioPayload,
} from "@/features/product-image-studio/client/projectWizardApi";
import type { ProductImageStudioGenerationResultPreview } from "@/features/product-image-studio/domain/generationWorkflow";
import type { ProductImageStudioRatioPreset } from "@/features/product-image-studio/domain/types";
import styles from "./ProductImageStudioDownloadPanel.module.css";

type ProductImageStudioDownloadPanelProps = {
  readonly onRegeneratedResult: (result: ProductImageStudioGenerationResultPreview) => void;
  readonly projectId: string | null;
  readonly results: readonly ProductImageStudioGenerationResultPreview[];
};

export type ProductImageStudioDownloadDraft = {
  readonly customHeight: string;
  readonly customWidth: string;
  readonly ratio: ProductImageStudioRatioPreset;
};

type ProductImageStudioDownloadDraftResult =
  | {
      readonly customDimensions?: { readonly height: number; readonly width: number };
      readonly ok: true;
      readonly ratio: ProductImageStudioRatioPreset;
    }
  | {
      readonly message: string;
      readonly ok: false;
    };

type RatioOption = {
  readonly helper: string;
  readonly label: string;
  readonly ratio: ProductImageStudioRatioPreset;
};

const RATIO_OPTIONS = [
  { helper: "정사각형 목록과 대표 이미지", label: "1:1 상품 목록", ratio: "1:1" },
  { helper: "세로형 대표 이미지", label: "4:5 세로 대표", ratio: "4:5" },
  { helper: "상세페이지 중간 이미지", label: "3:4 상세 이미지", ratio: "3:4" },
  { helper: "자사몰, 블로그 확장용", label: "16:9 확장 콘텐츠", ratio: "16:9" },
  { helper: "직접 입력한 픽셀 크기", label: "사용자 지정", ratio: "custom" },
] as const satisfies readonly RatioOption[];

const EMPTY_DOWNLOAD_MESSAGE = "다운로드할 이미지가 없습니다.";
const READY_DOWNLOAD_MESSAGE = "원하는 비율을 선택한 뒤 다운로드하거나 새 크기로 다시 만들 수 있습니다.";

export function ProductImageStudioDownloadPanel({
  onRegeneratedResult,
  projectId,
  results,
}: ProductImageStudioDownloadPanelProps) {
  const [selectedResultId, setSelectedResultId] = useState("");
  const [draft, setDraft] = useState<ProductImageStudioDownloadDraft>({
    customHeight: "1500",
    customWidth: "1200",
    ratio: "1:1",
  });
  const [message, setMessage] = useState(EMPTY_DOWNLOAD_MESSAGE);
  const [isBusy, setIsBusy] = useState(false);
  const selectedResult = results.find((result) => result.id === selectedResultId) ?? results[0] ?? null;
  const zipUrl = projectId ? `/api/product-image-studio/projects/${encodeURIComponent(projectId)}/downloads.zip` : "";
  const individualUrl =
    projectId && selectedResult
      ? `/api/product-image-studio/projects/${encodeURIComponent(projectId)}/results/${encodeURIComponent(selectedResult.id)}/download`
      : "";
  const hasResults = Boolean(projectId && selectedResult);
  const displayMessage = hasResults && message === EMPTY_DOWNLOAD_MESSAGE ? READY_DOWNLOAD_MESSAGE : message;

  return (
    <section className={styles.panel} aria-label="비율 및 다운로드">
      <div className={styles.heading}>
        <h3>비율 및 다운로드</h3>
        <p>목록, 대표 이미지, 상세 이미지에 맞게 다시 만들거나 내려받습니다.</p>
      </div>

      <fieldset className={styles.ratioGroup}>
        <legend>출력 비율</legend>
        {RATIO_OPTIONS.map((option) => (
          <label className={styles.ratioOption} data-selected={draft.ratio === option.ratio ? "true" : "false"} key={option.ratio}>
            <input
              checked={draft.ratio === option.ratio}
              name="product-image-ratio"
              onChange={() => setDraft((current) => ({ ...current, ratio: option.ratio }))}
              type="radio"
            />
            <span>{option.label}</span>
            <small>{option.helper}</small>
          </label>
        ))}
      </fieldset>

      <div className={styles.customSize} data-visible={draft.ratio === "custom" ? "true" : "false"}>
        <label>
          <span>가로 px</span>
          <input
            inputMode="numeric"
            min="64"
            max="4096"
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              setDraft((current) => ({ ...current, customWidth: event.currentTarget.value }))
            }
            value={draft.customWidth}
          />
        </label>
        <label>
          <span>세로 px</span>
          <input
            inputMode="numeric"
            min="64"
            max="4096"
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              setDraft((current) => ({ ...current, customHeight: event.currentTarget.value }))
            }
            value={draft.customHeight}
          />
        </label>
      </div>

      <label className={styles.resultSelect}>
        <span>기준 이미지</span>
        <select
          disabled={results.length === 0}
          onChange={(event: ChangeEvent<HTMLSelectElement>) => setSelectedResultId(event.currentTarget.value)}
          value={selectedResult?.id ?? ""}
        >
          {results.length === 0 ? <option value="">생성 결과 없음</option> : null}
          {results.map((result) => (
            <option key={result.id} value={result.id}>
              {result.label} · {result.ratio}
            </option>
          ))}
        </select>
      </label>

      <p className={styles.status} aria-live="polite">
        {displayMessage}
      </p>

      <div className={styles.actions}>
        <button className={styles.secondary} disabled={!hasResults || isBusy} onClick={() => void handleRegenerate()} type="button">
          {isBusy ? "비율 변경 중" : "비율 변경 생성"}
        </button>
        <button
          className={styles.secondary}
          data-download-url={individualUrl || undefined}
          disabled={!hasResults}
          onClick={() => startDownload(individualUrl)}
          type="button"
        >
          개별 다운로드
        </button>
        <button
          className={styles.primary}
          data-download-url={zipUrl || undefined}
          disabled={!hasResults}
          onClick={() => startDownload(zipUrl)}
          type="button"
        >
          ZIP 다운로드
        </button>
      </div>
    </section>
  );

  async function handleRegenerate(): Promise<void> {
    if (!projectId || !selectedResult) {
      return;
    }

    const validated = validateProductImageStudioDownloadDraft(draft);
    if (!validated.ok) {
      setMessage(validated.message);
      return;
    }

    setIsBusy(true);
    try {
      const result = await regenerateProductImageStudioResultRatio(projectId, selectedResult.id, toPayload(validated));
      setIsBusy(false);
      if (!result.ok) {
        setMessage(result.message);
        return;
      }

      setSelectedResultId(result.value.id);
      setMessage("비율 변경 이미지가 준비되었습니다.");
      onRegeneratedResult(result.value);
    } catch (error) {
      setIsBusy(false);
      if (error instanceof Error) {
        setMessage("비율 변경 이미지를 만들지 못했습니다. 잠시 후 다시 시도해 주세요.");
        return;
      }
      throw error;
    }
  }
}

export function validateProductImageStudioDownloadDraft(
  draft: ProductImageStudioDownloadDraft,
): ProductImageStudioDownloadDraftResult {
  if (draft.ratio !== "custom") {
    return { ok: true, ratio: draft.ratio };
  }

  const width = parseCustomDimension(draft.customWidth);
  const height = parseCustomDimension(draft.customHeight);
  if (!width || !height) {
    return {
      message: "사용자 지정 크기는 64px 이상 4096px 이하의 정수로 입력해 주세요.",
      ok: false,
    };
  }

  return { customDimensions: { height, width }, ok: true, ratio: "custom" };
}

function parseCustomDimension(value: string): number | null {
  const trimmed = value.trim();
  if (!/^[0-9]+$/.test(trimmed)) {
    return null;
  }

  const dimension = Number(trimmed);
  return Number.isSafeInteger(dimension) && dimension >= 64 && dimension <= 4096 ? dimension : null;
}

function toPayload(validated: Extract<ProductImageStudioDownloadDraftResult, { readonly ok: true }>): ProductImageStudioRegenerateRatioPayload {
  if (validated.ratio !== "custom") {
    return { ratio: validated.ratio };
  }

  return { customDimensions: validated.customDimensions, ratio: "custom" };
}

function startDownload(url: string): void {
  if (url.length === 0) {
    return;
  }

  window.location.assign(url);
}
