"use client";

import { Download, RotateCcw, Sparkles, UploadCloud } from "lucide-react";
import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import styles from "./ProductImageStudioAiTools.module.css";

export type ProductImageStudioSvgConversionState = { readonly kind: "error"; readonly message: string } | { readonly fileName: string; readonly kind: "loading" } | { readonly kind: "idle" } | { readonly contentType: "image/svg+xml"; readonly downloadUrl: string; readonly fileName: string; readonly kind: "success"; readonly svg: string };

type ProductImageStudioSvgConversionModalProps = { readonly initialState?: ProductImageStudioSvgConversionState; readonly initialTitle?: string };

type SvgConversionStyle = "icon" | "line_art" | "sticker";

type SvgConversionClientResult = { readonly contentType: "image/svg+xml"; readonly downloadUrl: string; readonly fileName: string; readonly ok: true; readonly svg: string } | { readonly message: string; readonly ok: false };

export type ProductImageStudioSvgConversionInteraction = { readonly file: File | null; readonly kind: "select-file" | "submit" } | { readonly kind: "cancel-pending" | "reopen" | "reset" };

const SVG_CONVERSION_MAX_BYTES = 20 * 1024 * 1024;
const SVG_CONVERSION_STYLES = [{ label: "아이콘형", value: "icon" }, { label: "라인형", value: "line_art" }, { label: "스티커형", value: "sticker" }] as const satisfies readonly { readonly label: string; readonly value: SvgConversionStyle }[];

export function ProductImageStudioSvgConversionModal({ initialState, initialTitle = "" }: ProductImageStudioSvgConversionModalProps) {
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

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    const file = selectedFile;
    const submissionState = readSvgConversionInteractionState({ file, kind: "submit" });
    if (submissionState.kind !== "loading" || !file) return setState(submissionState);

    const controller = new AbortController();
    requestControllerRef.current = controller;
    const timeoutId = window.setTimeout(() => controller.abort(), 60_000);
    setState(submissionState);

    try {
      const result = await requestSvgConversion({ controller, file, style, title });
      if (!mountedRef.current) return;
      if (result.ok) {
        revokeSvgObjectUrl();
        const downloadUrl = createSvgObjectUrl(result.svg) ?? result.downloadUrl;
        setState(toSuccessState(result, downloadUrl));
        return;
      }
      setState({ kind: "error", message: result.message });
    } catch (error) {
      if (!mountedRef.current || isAbortError(error)) return;
      if (error instanceof TypeError || error instanceof DOMException) {
        setState({ kind: "error", message: "SVG 변환 요청을 보내지 못했습니다. 잠시 후 다시 시도해 주세요." });
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
    setState(readSvgConversionInteractionState({ file, kind: "select-file" }));
  }

  function resetConversion(): void {
    requestControllerRef.current?.abort();
    requestControllerRef.current = null;
    revokeSvgObjectUrl();
    setSelectedFile(null);
    setTitle("");
    setState(readSvgConversionInteractionState({ kind: "reset" }));
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

export function readSvgConversionStatusCopy(state: ProductImageStudioSvgConversionState): string {
  switch (state.kind) {
    case "idle": return "PNG 파일을 선택하면 SVG를 만들 수 있습니다.";
    case "loading": return `${state.fileName} SVG 생성 중`;
    case "success": return "SVG 변환 완료";
    case "error": return state.message;
    default:
      return assertNever(state);
  }
}

export function readSvgConversionInteractionState(interaction: ProductImageStudioSvgConversionInteraction): ProductImageStudioSvgConversionState {
  switch (interaction.kind) {
    case "select-file": return interaction.file ? toFileSelectionState(interaction.file) : { kind: "idle" };
    case "submit": {
      if (!interaction.file) return { kind: "error", message: "SVG로 변환할 PNG 파일을 선택해 주세요." };
      const invalidMessage = validatePngFile(interaction.file);
      return invalidMessage ? { kind: "error", message: invalidMessage } : { fileName: interaction.file.name, kind: "loading" };
    }
    case "cancel-pending":
    case "reopen":
    case "reset": return { kind: "idle" };
    default: return assertNever(interaction);
  }
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

async function requestSvgConversion(input: { readonly controller: AbortController; readonly file: File; readonly style: SvgConversionStyle; readonly title: string }): Promise<SvgConversionClientResult> {
  const formData = new FormData();
  formData.set("file", input.file);
  formData.set("style", input.style);
  formData.set("title", input.title);
  const response = await fetch("/api/product-image-studio/svg-conversions", { body: formData, method: "POST", signal: input.controller.signal });
  const payload = await readJsonPayload(response);
  return readSvgConversionResponse(payload, response.status);
}

function readSvgConversionResponse(payload: unknown, httpStatus: number): SvgConversionClientResult {
  if (!isRecord(payload)) {
    return { message: httpStatus >= 500 ? "SVG 변환 서비스가 응답하지 않았습니다." : "SVG 변환 응답을 읽지 못했습니다.", ok: false };
  }
  if (payload["ok"] !== true) {
    return { message: toSafeSvgConversionErrorMessage(readErrorCode(payload), httpStatus), ok: false };
  }
  const data = payload["data"];
  if (!isRecord(data)) {
    return { message: "SVG 변환 결과를 확인하지 못했습니다.", ok: false };
  }
  const downloadUrl = readSafeApiPath(data["downloadUrl"]);
  const fileName = readSvgFileName(data["fileName"]);
  const svg = readSvgText(data["svg"]);
  if (!downloadUrl || !fileName || !svg || data["contentType"] !== "image/svg+xml") {
    return { message: "SVG 변환 결과를 확인하지 못했습니다.", ok: false };
  }
  return { contentType: "image/svg+xml", downloadUrl, fileName, ok: true, svg };
}

async function readJsonPayload(response: Response): Promise<unknown | null> {
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return null;
  try {
    return await response.json();
  } catch (error) {
    if (error instanceof SyntaxError || error instanceof TypeError) return null;
    throw error;
  }
}

function toFileSelectionState(file: File): ProductImageStudioSvgConversionState {
  const invalidMessage = validatePngFile(file);
  return invalidMessage ? { kind: "error", message: invalidMessage } : { kind: "idle" };
}

function validatePngFile(file: File): string | null {
  if (file.type !== "image/png") return "PNG 파일만 SVG로 변환할 수 있습니다.";
  if (file.size > SVG_CONVERSION_MAX_BYTES) return "PNG 파일은 20MB 이하만 사용할 수 있습니다.";
  return null;
}

function readSvgConversionStyle(value: string): SvgConversionStyle {
  for (const option of SVG_CONVERSION_STYLES) if (option.value === value) return option.value;
  return "icon";
}

function toSuccessState(result: Extract<SvgConversionClientResult, { readonly ok: true }>, downloadUrl: string): ProductImageStudioSvgConversionState {
  return { contentType: result.contentType, downloadUrl, fileName: result.fileName, kind: "success", svg: result.svg };
}

function toSafeSvgConversionErrorMessage(code: string | null, httpStatus: number): string {
  switch (code) {
    case "SVG_CONVERSION_FILE_REQUIRED":
    case "SVG_CONVERSION_FILE_EMPTY": return "SVG로 변환할 PNG 파일을 선택해 주세요.";
    case "SVG_CONVERSION_PNG_REQUIRED": return "PNG 파일만 SVG로 변환할 수 있습니다.";
    case "SVG_CONVERSION_FILE_TOO_LARGE": return "PNG 파일은 20MB 이하만 사용할 수 있습니다.";
    case "SVG_CONVERSION_PNG_MALFORMED": return "PNG 파일을 읽지 못했습니다.";
    case "SVG_CONVERSION_UNSAFE": return "안전한 SVG 결과를 만들지 못했습니다.";
    default:
      return httpStatus >= 500 ? "SVG 변환 서비스가 응답하지 않았습니다." : "SVG 변환에 실패했습니다.";
  }
}

function readErrorCode(payload: Readonly<Record<string, unknown>>): string | null {
  const error = payload["error"];
  if (!isRecord(error)) return null;
  return typeof error["code"] === "string" ? error["code"] : null;
}

function readSafeApiPath(value: unknown): string | null {
  return typeof value === "string" && value.startsWith("/api/product-image-studio/") ? value : null;
}

function readSvgFileName(value: unknown): string | null {
  return typeof value === "string" && value.endsWith(".svg") ? value : null;
}

function readSvgText(value: unknown): string | null {
  return typeof value === "string" && value.includes("<svg") ? value : null;
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null;
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

function assertNever(value: never): never { throw new Error(`Unexpected SVG conversion state: ${JSON.stringify(value)}`); }
