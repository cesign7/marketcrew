import { Buffer } from "node:buffer";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createFakeProductImageStudioImageProvider, resolveProductImageStudioImageProvider } from "@/features/product-image-studio/server/imageProvider";
import { createOpenAiImageProvider } from "@/features/product-image-studio/server/openAiImageProvider";
import {
  foldedProviderPromptContext,
  postcardProviderPromptContext,
  providerPromptContextForConcept,
} from "./imageProviderTestSupport";

describe("product image studio image provider", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("returns deterministic fake provider output for local blocked mode", async () => {
    const provider = createFakeProductImageStudioImageProvider();
    const promptContext = foldedProviderPromptContext(["folded_card_outer_front", "envelope_front", "seal_sticker"]);
    const first = await provider.generateScene({ promptContext, referenceImages: [] });
    const second = await provider.generateScene({ promptContext, referenceImages: [] });

    expect(first).toEqual(second);
    expect(first.provider).toBe("fake");
    expect(first.model).toBe("fake-product-image-studio");
    expect(first.b64Json).toMatch(/^[A-Za-z0-9+/=]+$/);
  });

  it("returns unique deterministic fake PNG output for prompt-generator count indexes", async () => {
    const provider = createFakeProductImageStudioImageProvider();
    const promptContext = foldedProviderPromptContext(["folded_card_outer_front", "envelope_front", "seal_sticker"]);
    const first = await provider.generateScene({
      promptContext: { ...promptContext, resolution: "1k", resultIndex: 0 },
      referenceImages: [],
    });
    const second = await provider.generateScene({
      promptContext: { ...promptContext, resolution: "1k", resultIndex: 1 },
      referenceImages: [],
    });
    const secondRepeat = await provider.generateScene({
      promptContext: { ...promptContext, resolution: "1k", resultIndex: 1 },
      referenceImages: [],
    });

    expect(Buffer.from(first.b64Json, "base64").subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    expect(first.b64Json).not.toBe(second.b64Json);
    expect(second).toEqual(secondRepeat);
    expect(first.width).toBe(1024);
    expect(first.height).toBe(1024);
  });

  it("keeps the provider blocked by default and exposes a fake provider for local tests", () => {
    const resolved = resolveProductImageStudioImageProvider({});

    expect(resolved.kind).toBe("blocked");
    if (resolved.kind === "blocked") {
      expect(resolved.reason).toBe("generation_disabled");
      expect(resolved.provider.name).toBe("fake");
    }
  });

  it("builds prompts with card format, pose, and asset role context", () => {
    const folded = foldedProviderPromptContext(["folded_card_outer_front", "folded_card_fold_metadata", "envelope_front"]);
    const postcard = postcardProviderPromptContext(["postcard_front", "envelope_front", "seal_sticker"]);

    expect(folded.prompt).toContain("cardFormat=folded_card");
    expect(folded.prompt).toContain("requestedCardPoses=folded_closed,folded_open_spread,folded_standing");
    expect(folded.prompt).toContain("assetRoles=folded_card_outer_front,folded_card_fold_metadata,envelope_front");
    expect(folded.prompt).toContain("generationMethod=mockup_composite_first");
    expect(folded.prompt).toContain("cardFoldedSize=100x150mm");
    expect(folded.prompt).toContain("envelopeSize=110x160mm");
    expect(folded.prompt).toContain("designPreservation=exact_composite");
    expect(folded.prompt).toContain("카드와 봉투의 상대 크기가 실제 사양과 맞아야 합니다.");
    expect(folded.prompt).toContain("접힌 축");
    expect(postcard.prompt).toContain("cardFormat=postcard_flat");
    expect(postcard.prompt).toContain("assetRoles=postcard_front,envelope_front,seal_sticker");
    expect(postcard.prompt).toContain("접힘 없는");
    expect(postcard.prompt).not.toBe(folded.prompt);
  });

  it("locks print design and physical scale across the primary card-set concepts", () => {
    const conceptIds = ["tabletop-set", "premium-stationery", "seasonal-gift", "minimal-studio"] as const;

    for (const conceptId of conceptIds) {
      const promptContext = providerPromptContextForConcept(conceptId);

      expect(promptContext.prompt).toContain("designLock=uploaded_print_surface_locked");
      expect(promptContext.prompt).toContain("do not change text size, font, kerning, line breaks, text placement");
      expect(promptContext.prompt).toContain("logo placement, colors, illustrations, patterns, margins, or safe area");
      expect(promptContext.prompt).toContain("must remain clipped inside the printed card, envelope, or sticker surface");
      expect(promptContext.prompt).toContain("never move printed content outside the product image");
      expect(promptContext.prompt).toContain("expand or crop only the background/canvas");
      expect(promptContext.prompt).toContain("Do not rescale the card, change the card aspect ratio, or resize the uploaded print design");
      expect(promptContext.prompt).toContain("physicalScaleReference=card=100x150mm | envelope=110x160mm | sealSticker=35mm diameter");
      expect(promptContext.prompt).toContain("Pens and pencils should read as about 140-190mm long and 7-12mm thick");
      expect(promptContext.prompt).toContain("If the card is about 90mm wide, props and surface area must still look physically plausible");
    }
  });

  it("builds an OpenAI adapter request without leaking the API key in results", async () => {
    let capturedBody = "";
    let capturedAuthorization = "";
    const provider = createOpenAiImageProvider({
      apiKey: "secret-test-key",
      fetchImpl: async (_input, init) => {
        capturedBody = typeof init?.body === "string" ? init.body : "";
        capturedAuthorization = init?.headers instanceof Headers ? init.headers.get("authorization") ?? "" : "";
        return new Response(JSON.stringify({ data: [{ b64_json: "ZmFrZS1pbWFnZQ==" }] }), {
          headers: { "content-type": "application/json", "x-request-id": "req-test" },
          status: 200,
        });
      },
      model: "gpt-image-2",
    });
    const result = await provider.generateScene({
      promptContext: foldedProviderPromptContext(["folded_card_outer_front", "seal_sticker"]),
      referenceImages: [],
    });

    expect(capturedBody).toContain("\"model\":\"gpt-image-2\"");
    expect(capturedBody).toContain("cardFormat=folded_card");
    expect(capturedAuthorization).toBe("Bearer secret-test-key");
    expect(result.model).toBe("gpt-image-2");
    expect(JSON.stringify(result)).not.toContain("secret-test-key");
  });
});
