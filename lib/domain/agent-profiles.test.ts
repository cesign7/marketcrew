import { describe, expect, it } from "vitest";
import { getAgentProfile } from "./agent-profiles";

describe("agent profiles", () => {
  it("returns the planned character for bid optimization", () => {
    expect(getAgentProfile("BID_OPTIMIZER")).toMatchObject({
      characterName: "비디",
      roleName: "입찰 최적화 AI",
      defaultMood: "calm",
      uiInitial: "비",
    });
  });

  it("returns the planned character for margin analysis", () => {
    expect(getAgentProfile("MARGIN_ANALYST")).toMatchObject({
      characterName: "마루",
      roleName: "마진 분석 AI",
      defaultMood: "worried",
      uiInitial: "마",
    });
  });
});
