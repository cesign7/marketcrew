import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const CREDENTIAL_FORMAT_VERSION = "v1";
const IV_BYTE_LENGTH = 12;

export class ProductImageStudioCredentialCryptoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProductImageStudioCredentialCryptoError";
  }
}

export function getProductImageStudioCredentialSecret(
  env: Readonly<Record<string, string | undefined>> = process.env,
): string | null {
  const secret =
    env.PRODUCT_IMAGE_STUDIO_PROVIDER_SETTINGS_SECRET ??
    env.MARKETCREW_PROVIDER_SETTINGS_SECRET ??
    env.MARKETCREW_AUTH_SECRET;
  const trimmed = secret?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
}

export function encryptProductImageStudioCredential(plainText: string, secret: string): string {
  const iv = randomBytes(IV_BYTE_LENGTH);
  const cipher = createCipheriv("aes-256-gcm", deriveKey(secret), iv);
  const encrypted = Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [
    CREDENTIAL_FORMAT_VERSION,
    iv.toString("base64url"),
    tag.toString("base64url"),
    encrypted.toString("base64url"),
  ].join(":");
}

export function decryptProductImageStudioCredential(cipherText: string, secret: string): string {
  const [version, ivValue, tagValue, encryptedValue] = cipherText.split(":");
  if (version !== CREDENTIAL_FORMAT_VERSION || !ivValue || !tagValue || !encryptedValue) {
    throw new ProductImageStudioCredentialCryptoError("저장된 provider credential 형식이 올바르지 않습니다.");
  }

  try {
    const decipher = createDecipheriv("aes-256-gcm", deriveKey(secret), Buffer.from(ivValue, "base64url"));
    decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
    return Buffer.concat([
      decipher.update(Buffer.from(encryptedValue, "base64url")),
      decipher.final(),
    ]).toString("utf8");
  } catch (error) {
    if (error instanceof Error) {
      throw new ProductImageStudioCredentialCryptoError("저장된 provider credential을 복호화하지 못했습니다.");
    }
    throw error;
  }
}

function deriveKey(secret: string): Buffer {
  return createHash("sha256").update(secret).digest();
}
