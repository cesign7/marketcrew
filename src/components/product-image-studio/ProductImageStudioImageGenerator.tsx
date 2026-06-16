"use client";

import { AlertTriangle, Download, FileDown, Image, Sparkles, UploadCloud, X } from "lucide-react";
import { useMemo, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { startProductImageStudioImageGeneratorGeneration, type ProductImageStudioImageGeneratorGenerationClientResult } from "@/features/product-image-studio/client/imageGeneratorApi";
import { PRODUCT_IMAGE_STUDIO_IMAGE_GENERATOR_ALLOWED_REFERENCE_IMAGE_MIME_TYPES, PRODUCT_IMAGE_STUDIO_IMAGE_GENERATOR_MAX_PROMPT_LENGTH, PRODUCT_IMAGE_STUDIO_IMAGE_GENERATOR_MAX_REFERENCE_IMAGES, PRODUCT_IMAGE_STUDIO_IMAGE_GENERATOR_MODEL_CONTRACTS, type ProductImageStudioImageGeneratorCount, type ProductImageStudioImageGeneratorModelLabel, type ProductImageStudioImageGeneratorRatio, type ProductImageStudioImageGeneratorResolution } from "@/features/product-image-studio/domain/imageGenerator";
import { getProductImageStudioGenerationBlockedMessage } from "@/features/product-image-studio/domain/generationMessages";
import type { ProductImageStudioProviderStatus } from "@/features/product-image-studio/server/providerConfig";
import { ProductImageStudioGenerationOptionControls } from "./ProductImageStudioGenerationOptionControls";
import styles from "./ProductImageStudioImageGenerator.module.css";

type ProductImageStudioImageGeneratorProps = { readonly initialPrompt?: string; readonly providerStatus: ProductImageStudioProviderStatus };

type GeneratorPhase = "idle" | "generating";
type GeneratorBlockedReason = "credential_missing" | "generation_disabled" | "provider_not_configured";

const REFERENCE_ACCEPT = PRODUCT_IMAGE_STUDIO_IMAGE_GENERATOR_ALLOWED_REFERENCE_IMAGE_MIME_TYPES.join(",");
const DEFAULT_COUNT: ProductImageStudioImageGeneratorCount = 1;
const DEFAULT_RATIO: ProductImageStudioImageGeneratorRatio = "1:1";
const DEFAULT_RESOLUTION: ProductImageStudioImageGeneratorResolution = "1k";

export function ProductImageStudioImageGenerator({ initialPrompt = "", providerStatus }: ProductImageStudioImageGeneratorProps) {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [modelLabel, setModelLabel] = useState<ProductImageStudioImageGeneratorModelLabel>(getInitialModelLabel(providerStatus));
  const [count, setCount] = useState<ProductImageStudioImageGeneratorCount>(DEFAULT_COUNT);
  const [ratio, setRatio] = useState<ProductImageStudioImageGeneratorRatio>(DEFAULT_RATIO);
  const [resolution, setResolution] = useState<ProductImageStudioImageGeneratorResolution>(DEFAULT_RESOLUTION);
  const [referenceImages, setReferenceImages] = useState<readonly File[]>([]);
  const [fileMessage, setFileMessage] = useState<string | null>(null);
  const [phase, setPhase] = useState<GeneratorPhase>("idle");
  const [generationResult, setGenerationResult] = useState<ProductImageStudioImageGeneratorGenerationClientResult | null>(null);
  const referenceInputRef = useRef<HTMLInputElement>(null);
  const blockedReason = getSelectedProviderBlockedReason(providerStatus, modelLabel);
  const trimmedPrompt = prompt.trim();
  const promptTooLong = trimmedPrompt.length > PRODUCT_IMAGE_STUDIO_IMAGE_GENERATOR_MAX_PROMPT_LENGTH;
  const canGenerate =
    trimmedPrompt.length > 0 && !promptTooLong && fileMessage === null && phase !== "generating" && blockedReason === null;
  const statusMessage = getStatusMessage({ blockedReason, fileMessage, generationResult, phase, promptTooLong });
  const referenceSummaries = useMemo(() => referenceImages.map(toReferenceSummary), [referenceImages]);
  const resultCards = generationResult?.ok === true ? generationResult.results : [];

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!canGenerate) {
      return;
    }

    setPhase("generating");
    setGenerationResult(null);
    try {
      const result = await startProductImageStudioImageGeneratorGeneration({ count, modelLabel, prompt: trimmedPrompt, ratio, referenceImages, resolution });
      setGenerationResult(result);
    } catch (error) {
      if (error instanceof TypeError || error instanceof DOMException) {
        setGenerationResult({ kind: "failed", message: "이미지 생성 요청을 보내지 못했습니다. 네트워크 상태를 확인해 주세요.", ok: false });
        return;
      }
      throw error;
    } finally {
      setPhase("idle");
    }
  }

  return (
    <section className={styles.workspace} aria-label="AI 이미지 생성 작업대">
      <section className={styles.canvas} aria-label="생성 결과">
        <div className={styles.canvasHeader}>
          <div>
            <span className={styles.kicker}>결과 화면</span>
            <h2>결과 캔버스</h2>
            <p>참고 이미지는 디자인 방향만 전달하며, 캐릭터·아이콘형 결과는 벡터 SVG로 다시 그릴 수 있습니다.</p>
          </div>
          <span className={styles.statusBadge} data-state={generationResult?.ok === true ? "ready" : phase}>
            <Image size={15} strokeWidth={2.25} aria-hidden="true" /> {resultCards.length > 0 ? `${resultCards.length}장 준비` : "대기"}
          </span>
        </div>

        {resultCards.length > 0 ? (
          <div className={styles.resultGrid}>
            {resultCards.map((result, index) => (
              <article className={styles.resultCard} key={result.id}>
                {result.previewUrl ? <img className={styles.resultImage} alt={`AI 생성 이미지 ${index + 1}`} src={result.previewUrl} /> : <div className={styles.resultPlaceholder}>미리보기 준비 중</div>}
                <div className={styles.resultMeta}>
                  <strong>{result.label}</strong>
                  <span>{result.ratio} · 래스터 · SVG 가능</span>
                </div>
                {result.downloadUrl ? (
                  <div className={styles.downloadActions}>
                    <a className={styles.downloadLink} href={result.downloadUrl}><Download size={15} strokeWidth={2.25} aria-hidden="true" /> 다운로드</a>
                    {result.vectorSvgUrl ? <a className={styles.downloadLink} href={result.vectorSvgUrl}><FileDown size={15} strokeWidth={2.25} aria-hidden="true" /> 벡터 SVG</a> : null}
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        ) : (
          <div className={styles.emptyCanvas}>
            <Image size={34} strokeWidth={1.8} aria-hidden="true" />
            <strong>프롬프트만 입력해도 결과가 여기에 표시됩니다.</strong>
            <span>캐릭터·아이콘형 결과는 벡터 SVG로 다시 그릴 수 있습니다.</span>
          </div>
        )}
      </section>

      <form className={styles.controls} aria-label="이미지 생성 설정" onSubmit={handleSubmit}>
        <div className={styles.controlHeader}>
          <span className={styles.kicker}>생성 옵션</span>
          <h2>생성 설정</h2>
        </div>

        <label className={styles.promptField}>
          <span>프롬프트</span>
          <textarea aria-invalid={promptTooLong ? "true" : undefined} maxLength={PRODUCT_IMAGE_STUDIO_IMAGE_GENERATOR_MAX_PROMPT_LENGTH} name="prompt" onChange={(event) => setPrompt(event.currentTarget.value)} placeholder="정돈된 테이블 위 프리미엄 카드 설정샷" rows={5} value={prompt} />
        </label>

        <label className={styles.uploadBox}>
          <input accept={REFERENCE_ACCEPT} multiple name="referenceImages" onChange={handleReferenceImagesChange} ref={referenceInputRef} type="file" />
          <span className={styles.uploadIcon} aria-hidden="true">
            <UploadCloud size={18} strokeWidth={2.25} />
          </span>
          <strong>참고 이미지 업로드 선택</strong>
          <small>참고 이미지 없이도 프롬프트만으로 생성할 수 있습니다.</small>
          <small>PNG · JPEG · WebP · SVG</small>
          <small>SVG는 디자인 참고용이며 생성 결과는 벡터 파일이 아닙니다.</small>
        </label>

        {referenceSummaries.length > 0 ? (
          <div className={styles.referenceList} aria-label="업로드한 참고 이미지">
            {referenceSummaries.map((reference) => (
              <span className={styles.referencePill} key={reference.id}>
                {reference.name} · {reference.kind} · {reference.size}
              </span>
            ))}
          </div>
        ) : null}

        {referenceSummaries.length > 0 || fileMessage ? (
          <button className={styles.clearReferenceButton} onClick={clearReferenceImages} type="button">
            <X size={14} strokeWidth={2.35} aria-hidden="true" /> 참고 이미지 없이 생성
          </button>
        ) : null}

        <ProductImageStudioGenerationOptionControls
          count={count}
          modelLabel={modelLabel}
          onCountChange={setCount}
          onModelLabelChange={setModelLabel}
          onRatioChange={setRatio}
          onResolutionChange={setResolution}
          ratio={ratio}
          resolution={resolution}
        />

        <p aria-live="polite" className={styles.statusLine} data-blocked={blockedReason ? "true" : "false"}>
          {blockedReason ? <AlertTriangle size={14} strokeWidth={2.25} aria-hidden="true" /> : null} {statusMessage}
        </p>

        <button className={styles.generateButton} disabled={!canGenerate} type="submit">
          <Sparkles size={16} strokeWidth={2.35} aria-hidden="true" /> {phase === "generating" ? "생성 중" : "생성"}
        </button>
      </form>
    </section>
  );

  function handleReferenceImagesChange(event: ChangeEvent<HTMLInputElement>): void {
    const files = Array.from(event.currentTarget.files ?? []);
    if (files.length > PRODUCT_IMAGE_STUDIO_IMAGE_GENERATOR_MAX_REFERENCE_IMAGES) {
      setFileMessage("참고 이미지는 최대 4개까지 업로드할 수 있습니다.");
      setReferenceImages([]);
      event.currentTarget.value = "";
      return;
    }

    const unsupported = files.find((file) => !isAllowedReferenceFile(file));
    if (unsupported) {
      setFileMessage("PNG, JPEG, WebP, SVG 이미지만 참고 이미지로 사용할 수 있습니다.");
      setReferenceImages([]);
      event.currentTarget.value = "";
      return;
    }

    setFileMessage(null);
    setReferenceImages(files);
  }

  function clearReferenceImages(): void {
    setFileMessage(null);
    setReferenceImages([]);
    if (referenceInputRef.current) {
      referenceInputRef.current.value = "";
    }
  }
}

function getStatusMessage(input: { readonly blockedReason: GeneratorBlockedReason | null; readonly fileMessage: string | null; readonly generationResult: ProductImageStudioImageGeneratorGenerationClientResult | null; readonly phase: GeneratorPhase; readonly promptTooLong: boolean }): string {
  if (input.phase === "generating") return "이미지를 생성하는 중입니다. 보통 30초에서 2분 정도 걸립니다.";
  if (input.fileMessage) return input.fileMessage;
  if (input.promptTooLong) return "프롬프트는 3000자 이하로 입력해 주세요.";
  if (input.generationResult) return input.generationResult.message;
  if (input.blockedReason) return getProductImageStudioGenerationBlockedMessage(input.blockedReason);
  return "프롬프트를 입력하면 생성할 수 있습니다.";
}

function getInitialModelLabel(providerStatus: ProductImageStudioProviderStatus): ProductImageStudioImageGeneratorModelLabel {
  return providerStatus.provider.name === "gemini" ? "nano-banana-2" : "gpt2";
}

function getSelectedProviderBlockedReason(providerStatus: ProductImageStudioProviderStatus, modelLabel: ProductImageStudioImageGeneratorModelLabel): GeneratorBlockedReason | null {
  const provider = PRODUCT_IMAGE_STUDIO_IMAGE_GENERATOR_MODEL_CONTRACTS[modelLabel].provider;
  const providerEntry = providerStatus.providers[provider];
  return providerEntry.status === "blocked" ? providerEntry.reason : null;
}

function isAllowedReferenceFile(file: File): boolean {
  return PRODUCT_IMAGE_STUDIO_IMAGE_GENERATOR_ALLOWED_REFERENCE_IMAGE_MIME_TYPES.some((mimeType) => file.type === mimeType) || file.name.toLowerCase().endsWith(".svg");
}

function toReferenceSummary(file: File, index: number): { readonly id: string; readonly kind: string; readonly name: string; readonly size: string } {
  return { id: `${file.name}-${file.size}-${index}`, kind: file.type === "image/svg+xml" || file.name.toLowerCase().endsWith(".svg") ? "SVG 참고" : "래스터 참고", name: file.name, size: `${Math.max(1, Math.round(file.size / 1024))}KB` };
}
