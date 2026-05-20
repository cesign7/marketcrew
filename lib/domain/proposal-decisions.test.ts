import { describe, expect, it } from "vitest";
import { getProposalStatusForDecision } from "./proposal-decisions";

describe("proposal decisions", () => {
  it("turns an approval decision into APPROVED", () => {
    expect(getProposalStatusForDecision("approve")).toBe("APPROVED");
  });

  it("turns a hold decision into HELD", () => {
    expect(getProposalStatusForDecision("hold")).toBe("HELD");
  });

  it("turns a rejection decision into REJECTED", () => {
    expect(getProposalStatusForDecision("reject")).toBe("REJECTED");
  });
});
