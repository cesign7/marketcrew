import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  CARD_FORMATS,
  PRODUCT_IMAGE_STUDIO_OUTPUT_TYPES,
  type ProductImageStudioOutputType,
} from "@/features/product-image-studio/domain/types";
import {
  getAllowedCardPosesForFormat,
  getAssetRolesForCardFormat,
  listOutputContracts,
} from "@/features/product-image-studio/domain/outputContracts";

describe("product image studio domain contract", () => {
  it("defines the four required output types for the card set", () => {
    // Given: the MVP output contract for a card, envelope, and sealing sticker set.
    const expectedOutputTypes: readonly ProductImageStudioOutputType[] = [
      "set_combined",
      "card_single",
      "envelope_single",
      "seal_sticker_single",
    ];

    // When: the domain output contracts are listed.
    const outputTypes = listOutputContracts().map((contract) => contract.outputType);

    // Then: every required output type is available exactly through the studio domain.
    expect(PRODUCT_IMAGE_STUDIO_OUTPUT_TYPES).toEqual(expectedOutputTypes);
    expect(outputTypes).toEqual(expectedOutputTypes);
  });

  it("keeps folded cards and postcard cards as separate card formats", () => {
    // Given: the first studio product supports both folded and non-folded cards.
    const expectedCardFormats = ["folded_card", "postcard_flat"];

    // When: the domain card formats are listed.
    const cardFormats = [...CARD_FORMATS];

    // Then: both formats are first-class variants.
    expect(cardFormats).toEqual(expectedCardFormats);
  });

  it("separates folded-card poses from postcard poses", () => {
    // Given: a folded card can naturally be closed, open, half-open, or standing.
    const foldedPoses = getAllowedCardPosesForFormat("folded_card");

    // When: postcard poses are listed for the same product family.
    const postcardPoses = getAllowedCardPosesForFormat("postcard_flat");

    // Then: postcard cards never inherit folded or inside-spread-only poses.
    expect(foldedPoses).toEqual(["folded_closed", "folded_open_spread", "folded_half_open", "folded_standing"]);
    expect(postcardPoses).toEqual(["postcard_front_flat", "postcard_back_flat", "postcard_lifestyle_stack"]);
    expect(postcardPoses.some((pose) => pose.startsWith("folded_"))).toBe(false);
  });

  it("keeps card-front uploads as the only baseline requirement", () => {
    // Given: each card format needs a different front artwork slot.
    const foldedRoles = getAssetRolesForCardFormat("folded_card");

    // When: the postcard asset contract is requested.
    const postcardRoles = getAssetRolesForCardFormat("postcard_flat");

    // Then: card-only generation can start from a card front while set materials stay optional.
    expect(foldedRoles.required).toEqual(["folded_card_outer_front"]);
    expect(foldedRoles.optional).toContain("folded_card_fold_metadata");
    expect(foldedRoles.optional).toContain("folded_card_inner_spread");
    expect(foldedRoles.optional).toContain("envelope_front");
    expect(foldedRoles.optional).toContain("seal_sticker");
    expect(postcardRoles.required).toEqual(["postcard_front"]);
    expect(postcardRoles.optional).toContain("envelope_front");
    expect(postcardRoles.optional).toContain("seal_sticker");
    expect(postcardRoles.optional).not.toContain("folded_card_inner_spread");
    expect(postcardRoles.optional).not.toContain("folded_card_fold_metadata");
  });

  it("does not import Search Ad domain types into the studio domain", () => {
    // Given: the studio is a separate bounded context.
    const domainDirectory = join(process.cwd(), "src/features/product-image-studio/domain");

    // When: the first domain files are inspected.
    const sourceText = ["types.ts", "outputContracts.ts", "scenePresets.ts"]
      .map((fileName) => readFileSync(join(domainDirectory, fileName), "utf8"))
      .join("\n");

    // Then: Search Ad modules are not part of the studio domain contract.
    expect(sourceText).not.toContain("search-ad");
    expect(sourceText).not.toContain("SearchAd");
  });
});
