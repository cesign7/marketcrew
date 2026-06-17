export type ProductImageStudioSvgConversionState =
  | { readonly kind: "error"; readonly message: string }
  | { readonly fileName: string; readonly kind: "loading" }
  | { readonly kind: "idle" }
  | {
      readonly contentType: "image/svg+xml";
      readonly downloadUrl: string;
      readonly fileName: string;
      readonly kind: "success";
      readonly svg: string;
    };

export type SvgConversionStyle = "icon" | "line_art" | "sticker";

export type SvgConversionClientResult =
  | { readonly contentType: "image/svg+xml"; readonly downloadUrl: string; readonly fileName: string; readonly ok: true; readonly svg: string }
  | { readonly message: string; readonly ok: false };

export type ProductImageStudioSvgConversionInteraction =
  | { readonly file: File | null; readonly kind: "select-file" | "submit" }
  | { readonly kind: "cancel-pending" | "reopen" | "reset" };

export const SVG_CONVERSION_STYLES = [
  { label: "아이콘형", value: "icon" },
  { label: "라인형", value: "line_art" },
  { label: "스티커형", value: "sticker" },
] as const satisfies readonly { readonly label: string; readonly value: SvgConversionStyle }[];

const SVG_CONVERSION_MAX_BYTES = 20 * 1024 * 1024;

export async function requestSvgConversion(input: {
  readonly controller: AbortController;
  readonly file: File;
  readonly style: SvgConversionStyle;
  readonly title: string;
}): Promise<SvgConversionClientResult> {
  const formData = new FormData();
  formData.set("file", input.file);
  formData.set("style", input.style);
  formData.set("title", input.title);
  const response = await fetch("/api/product-image-studio/svg-conversions", {
    body: formData,
    method: "POST",
    signal: input.controller.signal,
  });
  const payload = await readJsonPayload(response);
  return readSvgConversionResponse(payload, response.status);
}

export function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

export function readSvgConversionStatusCopy(state: ProductImageStudioSvgConversionState): string {
  switch (state.kind) {
    case "idle":
      return "PNG 파일을 선택하면 SVG를 만들 수 있습니다.";
    case "loading":
      return `${state.fileName} SVG 생성 중`;
    case "success":
      return "SVG 변환 완료";
    case "error":
      return state.message;
    default:
      return assertNever(state);
  }
}

export function readSvgConversionInteractionState(
  interaction: ProductImageStudioSvgConversionInteraction,
): ProductImageStudioSvgConversionState {
  switch (interaction.kind) {
    case "select-file":
      return interaction.file ? toFileSelectionState(interaction.file) : { kind: "idle" };
    case "submit": {
      if (!interaction.file) return { kind: "error", message: "SVG로 변환할 PNG 파일을 선택해 주세요." };
      const invalidMessage = validatePngFile(interaction.file);
      return invalidMessage ? { kind: "error", message: invalidMessage } : { fileName: interaction.file.name, kind: "loading" };
    }
    case "cancel-pending":
    case "reopen":
    case "reset":
      return { kind: "idle" };
    default:
      return assertNever(interaction);
  }
}

export function readSvgConversionStyle(value: string): SvgConversionStyle {
  for (const option of SVG_CONVERSION_STYLES) if (option.value === value) return option.value;
  return "icon";
}

export function toSvgConversionSuccessState(
  result: Extract<SvgConversionClientResult, { readonly ok: true }>,
  downloadUrl: string,
): ProductImageStudioSvgConversionState {
  return { contentType: result.contentType, downloadUrl, fileName: result.fileName, kind: "success", svg: result.svg };
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

function toSafeSvgConversionErrorMessage(code: string | null, httpStatus: number): string {
  switch (code) {
    case "SVG_CONVERSION_FILE_REQUIRED":
    case "SVG_CONVERSION_FILE_EMPTY":
      return "SVG로 변환할 PNG 파일을 선택해 주세요.";
    case "SVG_CONVERSION_PNG_REQUIRED":
      return "PNG 파일만 SVG로 변환할 수 있습니다.";
    case "SVG_CONVERSION_FILE_TOO_LARGE":
      return "PNG 파일은 20MB 이하만 사용할 수 있습니다.";
    case "SVG_CONVERSION_PNG_MALFORMED":
      return "PNG 파일을 읽지 못했습니다.";
    case "SVG_CONVERSION_UNSAFE":
      return "안전한 SVG 결과를 만들지 못했습니다.";
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

function assertNever(value: never): never {
  throw new Error(`Unexpected SVG conversion state: ${JSON.stringify(value)}`);
}
