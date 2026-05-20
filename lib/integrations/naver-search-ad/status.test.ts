import { describe, expect, it } from "vitest";
import { selectSearchAdStatusAccount } from "./status-helpers";

describe("Naver Search Ad sync status", () => {
  it("selects the account attached to the latest sync run", () => {
    const oldAccount = account("account-old", "2026-05-20T04:40:00.000Z");
    const currentAccount = account("account-current", "2026-05-20T04:52:00.000Z");

    expect(
      selectSearchAdStatusAccount([currentAccount, oldAccount], {
        accountId: "account-current",
      }),
    ).toBe(currentAccount);
  });

  it("falls back to the newest account when the latest run has no account", () => {
    const oldAccount = account("account-old", "2026-05-20T04:40:00.000Z");
    const currentAccount = account("account-current", "2026-05-20T04:52:00.000Z");

    expect(
      selectSearchAdStatusAccount([currentAccount, oldAccount], {
        accountId: null,
      }),
    ).toBe(currentAccount);
  });
});

function account(id: string, createdAt: string) {
  return {
    id,
    createdAt: new Date(createdAt),
  };
}
