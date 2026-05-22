import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ProviderDataContractPanel } from "../../src/components/agenda-room/ProviderDataContractPanel";
import { buildProviderDataContracts } from "../../src/features/agenda-room/provider-data-contracts";

describe("ProviderDataContractPanel", () => {
  it("채널별로 불러오는 데이터와 저장하는 데이터 명세 링크를 보여준다", () => {
    const html = renderToString(createElement(ProviderDataContractPanel, { contracts: buildProviderDataContracts() }));

    expect(html).toContain("불러오는 데이터와 저장하는 데이터");
    expect(html).toContain('href="#search-ad-incoming"');
    expect(html).toContain('href="#smartstore-stored"');
    expect(html).toContain("relKeyword");
    expect(html).toContain("KeywordDemandSnapshot.keyword");
    expect(html).toContain("CommerceAggregateSnapshot.brandKey");
    expect(html).toContain("ShopAggregateSnapshot.brandKey");
    expect(html).toContain("주문 원문 행은 저장하지 않습니다");
  });
});
