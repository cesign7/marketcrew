import { describe, expect, it } from "vitest";
import type { ProductImageStudioRatioPreset } from "@/features/product-image-studio/domain/types";
import {
  buildOpenAiGenerationRequestBody,
  createOpenAiImageProvider,
} from "@/features/product-image-studio/server/openAiImageProvider";
import { singleCardOpenAiPromptContext } from "./imageProviderTestSupport";

describe("product image studio OpenAI image provider", () => {
  it("keeps product-staging OpenAI generation bodies valid when resolution is absent", () => {
    const body = buildOpenAiGenerationRequestBody(
      { promptContext: singleCardOpenAiPromptContext({ qualityMode: "draft", ratio: "1:1" }), referenceImages: [] },
      "gpt-image-2",
    );

    expect(body).toMatchObject({
      model: "gpt-image-2",
      n: 1,
      output_format: "png",
      quality: "low",
      size: "1024x1024",
    });
    expect(body.prompt).toContain("cardFormat=folded_card");
  });

  it("maps OpenAI 0.5k requests to low quality and the nearest ratio-supported size", () => {
    const body = buildOpenAiGenerationRequestBody(
      { promptContext: singleCardOpenAiPromptContext({ qualityMode: "high", ratio: "16:9", resolution: "0.5k" }), referenceImages: [] },
      "gpt-image-2",
    );

    expect(body.quality).toBe("low");
    expect(body.size).toBe("1536x1024");
    expect(body.n).toBe(1);
  });

  it("maps OpenAI 1k prompt-generator requests without using multi-image n", () => {
    const body = buildOpenAiGenerationRequestBody(
      { promptContext: singleCardOpenAiPromptContext({ ratio: "3:4", resolution: "1k" }), referenceImages: [] },
      "gpt-image-2",
    );

    expect(body.size).toBe("1024x1536");
    expect(body.n).toBe(1);
  });

  it.each([
    { ratio: "1:1", size: "2048x2048" },
    { ratio: "4:5", size: "1632x2048" },
    { ratio: "3:4", size: "1536x2048" },
    { ratio: "16:9", size: "2048x1152" },
  ] satisfies readonly { readonly ratio: ProductImageStudioRatioPreset; readonly size: string }[])(
    "maps OpenAI 2k %s prompt-generator requests to a real 2K-class size",
    ({ ratio, size }) => {
      const body = buildOpenAiGenerationRequestBody(
        { promptContext: singleCardOpenAiPromptContext({ ratio, resolution: "2k" }), referenceImages: [] },
        "gpt-image-2",
      );

      expect(body.size).toBe(size);
      expect(body.size).not.toBe("1024x1024");
      expect(body.size).not.toBe("1024x1536");
      expect(body.size).not.toBe("1536x1024");
      expect(body.n).toBe(1);
    },
  );

  it("turns OpenAI invalid key errors into an actionable Korean message without leaking the key", async () => {
    const provider = createOpenAiImageProvider({
      apiKey: "secret-openai-key",
      fetchImpl: async () =>
        openAiErrorResponse(
          {
            code: "invalid_api_key",
            message: "Incorrect API key provided: sk-live-secret-key. You can find your API key at https://platform.openai.com.",
            type: "invalid_request_error",
          },
          401,
          "req-openai-invalid-key",
        ),
      model: "gpt-image-1",
    });

    await expect(provider.generateScene({ promptContext: singleCardOpenAiPromptContext(), referenceImages: [] })).rejects.toMatchObject({
      message:
        "OpenAI 이미지 생성 요청이 실패했습니다: OpenAI API 키가 유효하지 않습니다. 설정에서 sk-... 키를 다시 저장해 주세요.",
      requestId: "req-openai-invalid-key",
      status: 401,
    });
    await expect(provider.generateScene({ promptContext: singleCardOpenAiPromptContext(), referenceImages: [] })).rejects.not.toThrow(
      /sk-live-secret-key/,
    );
  });

  it("surfaces OpenAI quota errors with the provider request id", async () => {
    const provider = createOpenAiImageProvider({
      apiKey: "secret-openai-key",
      fetchImpl: async () =>
        openAiErrorResponse(
          {
            code: "insufficient_quota",
            message: "You exceeded your current quota, please check your plan and billing details.",
            type: "insufficient_quota",
          },
          429,
          "req-openai-quota",
        ),
      model: "gpt-image-1",
    });

    await expect(provider.generateScene({ promptContext: singleCardOpenAiPromptContext(), referenceImages: [] })).rejects.toMatchObject({
      message:
        "OpenAI 이미지 생성 요청이 실패했습니다: OpenAI API 크레딧 또는 사용 한도가 부족합니다. OpenAI Platform의 Billing/Usage Limits를 확인해 주세요.",
      requestId: "req-openai-quota",
      status: 429,
    });
  });

  it("surfaces OpenAI model access and organization verification errors", async () => {
    const provider = createOpenAiImageProvider({
      apiKey: "secret-openai-key",
      fetchImpl: async () =>
        openAiErrorResponse(
          {
            code: "model_not_found",
            message: "Your organization must be verified to use GPT image models.",
            type: "invalid_request_error",
          },
          403,
          "req-openai-model-access",
        ),
      model: "gpt-image-1",
    });

    await expect(provider.generateScene({ promptContext: singleCardOpenAiPromptContext(), referenceImages: [] })).rejects.toMatchObject({
      message:
        "OpenAI 이미지 생성 요청이 실패했습니다: OpenAI 조직 인증 또는 이미지 모델 권한이 필요합니다. Platform에서 Organization Verification, 프로젝트 권한, 모델 설정을 확인해 주세요.",
      requestId: "req-openai-model-access",
      status: 403,
    });
  });
});

function openAiErrorResponse(
  error: { readonly code: string; readonly message: string; readonly type: string },
  status: number,
  requestId: string,
): Response {
  return new Response(JSON.stringify({ error }), {
    headers: { "content-type": "application/json", "x-request-id": requestId },
    status,
  });
}
