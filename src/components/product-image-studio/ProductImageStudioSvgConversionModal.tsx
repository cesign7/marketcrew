"use client";

import { Download, RotateCcw, Sparkles, UploadCloud } from "lucide-react";
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import {
  isAbortError,
  readSvgConversionInteractionState,
  readSvgConversionStatusCopy,
  readSvgConversionStyle,
  requestSvgConversion,
  SVG_CONVERSION_STYLES,
  toSvgConversionSuccessState,
  type ProductImageStudioSvgConversionState,
  type SvgConversionStyle,
} from "./ProductImageStudioSvgConversionCore";
import styles from "./ProductImageStudioAiTools.module.css";

export {
  readSvgConversionInteractionState,
  readSvgConversionStatusCopy,
} from "./ProductImageStudioSvgConversionCore";

export type {
  ProductImageStudioSvgConversionInteraction,
  ProductImageStudioSvgConversionState,
} from "./ProductImageStudioSvgConversionCore";

type ProductImageStudioSvgConversionModalProps = {
  readonly initialState?: ProductImageStudioSvgConversionState;
  readonly initialTitle?: string;
  readonly onStateChange?: (state: ProductImageStudioSvgConversionState) => void;
};

export function ProductImageStudioSvgConversionModal({
  initialState,
  initialTitle = "",
  onStateChange,
}: ProductImageStudioSvgConversionModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [style, setStyle] = useState<SvgConversionStyle>("icon");
  const [title, setTitle] = useState(initialTitle);
  const [state, setState] = useState<ProductImageStudioSvgConversionState>(initialState ?? { kind: "idle" });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const requestControllerRef = useRef<AbortController | null>(null);
  const svgObjectUrlRef = useRef<string | null>(null);
  const mountedRef = useRef(true);
  const isLoading = state.kind === "loading";

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; requestControllerRef.current?.abort(); revokeSvgObjectUrl(); };
  }, []);

  function updateState(nextState: ProductImageStudioSvgConversionState): void {
    setState(nextState);
    onStateChange?.(nextState);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const file = selectedFile;
    const submissionState = readSvgConversionInteractionState({ file, kind: "submit" });
    if (submissionState.kind !== "loading" || !file) return updateState(submissionState);

    const controller = new AbortController();
    requestControllerRef.current = controller;
    const timeoutId = window.setTimeout(() => controller.abort(), 60_000);
    updateState(submissionState);

    try {
      const result = await requestSvgConversion({ controller, file, style, title });
      if (!mountedRef.current) return;
      if (result.ok) {
        revokeSvgObjectUrl();
        const downloadUrl = createSvgObjectUrl(result.svg) ?? result.downloadUrl;
        updateState(toSvgConversionSuccessState(result, downloadUrl));
        return;
      }
      updateState({ kind: "error", message: result.message });
    } catch (error) {
      if (!mountedRef.current || isAbortError(error)) return;
      if (error instanceof TypeError || error instanceof DOMException) {
        updateState({ kind: "error", message: "SVG 변환 요청을 보내지 못했습니다. 잠시 후 다시 시도해 주세요." });
        return;
      }
      throw error;
    } finally {
      window.clearTimeout(timeoutId);
      if (requestControllerRef.current === controller) requestControllerRef.current = null;
    }
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>): void {
    const file = event.currentTarget.files?.item(0) ?? null;
    revokeSvgObjectUrl();
    setSelectedFile(file);
    updateState(readSvgConversionInteractionState({ file, kind: "select-file" }));
  }

  function resetConversion(): void {
    requestControllerRef.current?.abort();
    requestControllerRef.current = null;
    revokeSvgObjectUrl();
    setSelectedFile(null);
    setTitle("");
    updateState(readSvgConversionInteractionState({ kind: "reset" }));
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function createSvgObjectUrl(svg: string): string | null {
    if (typeof Blob === "undefined" || typeof URL === "undefined" || typeof URL.createObjectURL !== "function") return null;
    const objectUrl = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    svgObjectUrlRef.current = objectUrl;
    return objectUrl;
  }

  function revokeSvgObjectUrl(): void {
    const objectUrl = svgObjectUrlRef.current;
    if (!objectUrl || typeof URL === "undefined" || typeof URL.revokeObjectURL !== "function") return;
    URL.revokeObjectURL(objectUrl);
    svgObjectUrlRef.current = null;
  }

  return (
    <form className={styles.svgForm} data-svg-conversion-state={state.kind} onSubmit={handleSubmit}>
      <label className={styles.uploadBox}>
        <input accept="image/png" aria-label="SVG 변환 PNG 파일" className={styles.fileInput} disabled={isLoading} name="file" onChange={handleFileChange} ref={fileInputRef} type="file" />
        <span className={styles.uploadIcon} aria-hidden="true">
          <UploadCloud size={18} strokeWidth={2.25} />
        </span>
        <strong>{selectedFile?.name ?? "PNG 파일 선택"}</strong>
        <small>PNG만 업로드 · 20MB 이하</small>
        <span className={styles.uploadAction}>{selectedFile ? "파일 다시 선택" : "파일 업로드"}</span>
      </label>

      <div className={styles.inlineGrid}>
        <label className={styles.field}>
          <span>스타일</span>
          <select disabled={isLoading} name="style" onChange={(event) => setStyle(readSvgConversionStyle(event.currentTarget.value))} value={style}>
            {SVG_CONVERSION_STYLES.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
        <label className={styles.field}>
          <span>이름</span>
          <input disabled={isLoading} name="title" onChange={(event) => setTitle(event.currentTarget.value)} placeholder="예: 씰 스티커 아이콘" value={title} />
        </label>
      </div>

      <p aria-live="polite" className={styles.statusLine}>{readSvgConversionStatusCopy(state)}</p>

      {state.kind === "success" ? <SvgConversionResult state={state} /> : null}

      <div className={styles.actionRow}>
        <button className={styles.primaryButton} disabled={isLoading} type="submit">
          <Sparkles size={16} strokeWidth={2.35} aria-hidden="true" /> {isLoading ? "생성 중" : "생성"}
        </button>
        <button className={styles.secondaryButton} onClick={resetConversion} type="button">
          <RotateCcw size={15} strokeWidth={2.35} aria-hidden="true" /> 초기화
        </button>
      </div>
    </form>
  );
}

function SvgConversionResult({ state }: { readonly state: Extract<ProductImageStudioSvgConversionState, { readonly kind: "success" }> }) {
  return (
    <section className={styles.svgResult} aria-label="SVG 변환 결과">
      <object aria-label="SVG 미리보기" className={styles.svgPreview} data={state.downloadUrl} type={state.contentType}>SVG 미리보기</object>
      <div className={styles.resultMeta}>
        <strong>{state.fileName}</strong><span>{state.contentType}</span>
      </div>
      <pre className={styles.svgSnippet}>{state.svg.slice(0, 360)}</pre>
      <a className={styles.downloadLink} data-content-type={state.contentType} download={state.fileName} href={state.downloadUrl}>
        <Download size={15} strokeWidth={2.35} aria-hidden="true" /> SVG 다운로드
      </a>
    </section>
  );
}
