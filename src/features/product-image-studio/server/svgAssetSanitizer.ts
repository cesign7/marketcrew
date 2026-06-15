export const PRODUCT_IMAGE_STUDIO_SVG_MIME_TYPE = "image/svg+xml";

export type SanitizedProductImageStudioSvgAsset = {
  readonly bytes: Uint8Array;
  readonly contentType: typeof PRODUCT_IMAGE_STUDIO_SVG_MIME_TYPE;
};

export type ProductImageStudioSvgSanitizerError = {
  readonly code: "UNSAFE_SVG_ASSET";
  readonly message: string;
};

export type ProductImageStudioSvgSanitizerResult =
  | {
      readonly ok: true;
    } & SanitizedProductImageStudioSvgAsset
  | {
      readonly error: ProductImageStudioSvgSanitizerError;
      readonly ok: false;
    };

const UNSAFE_SVG_PATTERNS = [
  /<\s*(?:[A-Za-z_][A-Za-z0-9_.-]*:)?(?:script|foreignObject|iframe|object|embed|link|meta|base|form|input|button|textarea|select|audio|video|canvas|applet|frame|frameset)(?=[\s/>])/i,
  /\s+on[a-z0-9_-]+\s*=/i,
  /(?:href|xlink:href)\s*=\s*["']?\s*(?:https?:|\/\/|ftp:|file:|javascript:|data:text\/html|data:application\/xhtml\+xml|data:image\/svg\+xml)/i,
  /url\(\s*["']?\s*(?:https?:|\/\/|ftp:|file:|javascript:|data:text\/html|data:application\/xhtml\+xml|data:image\/svg\+xml)/i,
  /(?:@import|<!ENTITY|<!DOCTYPE)\b/i,
  /xmlns(?::[A-Za-z0-9_.-]+)?\s*=\s*["'](?:http:\/\/www\.w3\.org\/1999\/xhtml|http:\/\/www\.w3\.org\/1998\/Math\/MathML|http:\/\/www\.w3\.org\/2001\/xml-events)["']/i,
] as const;

const SVG_ROOT_PATTERN = /^\s*(?:<\?xml[\s\S]*?\?>\s*)?<svg(?:\s|>)/i;

export function sanitizeProductImageStudioSvgAsset(bytes: Uint8Array): ProductImageStudioSvgSanitizerResult {
  const decoded = decodeSvgUtf8(bytes);
  if (!decoded.ok) {
    return decoded;
  }

  const svg = decoded.value.trim();
  if (!SVG_ROOT_PATTERN.test(svg)) {
    return unsafeSvg("SVG 파일 구조가 올바르지 않습니다.");
  }

  for (const pattern of UNSAFE_SVG_PATTERNS) {
    if (pattern.test(svg)) {
      return unsafeSvg("보안상 안전하지 않은 SVG 요소가 포함되어 있습니다.");
    }
  }

  return {
    bytes: new TextEncoder().encode(svg),
    contentType: PRODUCT_IMAGE_STUDIO_SVG_MIME_TYPE,
    ok: true,
  };
}

function decodeSvgUtf8(
  bytes: Uint8Array,
): { readonly ok: true; readonly value: string } | { readonly error: ProductImageStudioSvgSanitizerError; readonly ok: false } {
  try {
    return { ok: true, value: new TextDecoder("utf-8", { fatal: true }).decode(bytes) };
  } catch (error) {
    if (error instanceof TypeError) {
      return unsafeSvg("SVG 파일은 UTF-8 텍스트여야 합니다.");
    }
    throw error;
  }
}

function unsafeSvg(message: string): { readonly error: ProductImageStudioSvgSanitizerError; readonly ok: false } {
  return { error: { code: "UNSAFE_SVG_ASSET", message }, ok: false };
}
