import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ProductImageStudioProviderSettingsForm } from "@/components/product-image-studio/ProductImageStudioProviderSettingsForm";

export function renderProviderSettingsFormHtml(): string {
  return renderToStaticMarkup(
    createElement(ProductImageStudioProviderSettingsForm, {
      initialSettings: {
        defaultProvider: "openai",
        generationEnabled: false,
        hasCredential: true,
        model: "gpt-image-1",
        provider: "openai",
        providers: {
          gemini: {
            hasCredential: false,
            model: "gemini-3.1-flash-image",
            provider: "gemini",
            storageMode: "memory",
            updatedAt: null,
          },
          openai: {
            hasCredential: true,
            model: "gpt-image-1",
            provider: "openai",
            storageMode: "memory",
            updatedAt: "2026-06-12T00:00:00.000Z",
          },
        },
        storageMode: "memory",
        updatedAt: "2026-06-12T00:00:00.000Z",
      },
      initialStorageMode: "memory",
    }),
  );
}

export function renderEmptyProviderSettingsFormHtml(): string {
  return renderToStaticMarkup(
    createElement(ProductImageStudioProviderSettingsForm, {
      initialSettings: null,
      initialStorageMode: "memory",
    }),
  );
}
