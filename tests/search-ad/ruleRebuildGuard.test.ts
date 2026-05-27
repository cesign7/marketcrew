import { describe, expect, it } from "vitest";
import { getRuleRebuildBackfillGuard } from "@/server/search-ad/ruleRebuildGuard";
import type { SearchAdBackfillRunRecord } from "@/lib/persistence/searchAdRepository";

describe("rule rebuild guard", () => {
  it("최근 갱신된 백필 실행 중에는 규칙 재계산을 차단한다", () => {
    const guard = getRuleRebuildBackfillGuard(
      run({
        status: "running",
        updatedAt: "2026-05-27T05:30:00.000Z",
      }),
      Date.parse("2026-05-27T05:35:00.000Z"),
    );

    expect(guard).toMatchObject({
      ageSeconds: 300,
      blocked: true,
    });
    expect(guard.message).toContain("백필이 아직 진행 중");
  });

  it("완료된 백필 뒤에는 규칙 재계산을 허용한다", () => {
    expect(
      getRuleRebuildBackfillGuard(
        run({
          status: "completed",
          updatedAt: "2026-05-27T05:30:00.000Z",
        }),
        Date.parse("2026-05-27T05:31:00.000Z"),
      ),
    ).toMatchObject({
      blocked: false,
      message: "규칙 결과를 재계산할 수 있습니다.",
    });
  });

  it("자동 대기 중이고 다음 확인 시간이 남아 있으면 재계산을 차단한다", () => {
    const guard = getRuleRebuildBackfillGuard(
      run({
        resultJson: {
          job: {
            nextAttemptAt: "2026-05-27T05:50:00.000Z",
          },
        },
        status: "waiting",
        updatedAt: "2026-05-27T05:20:00.000Z",
      }),
      Date.parse("2026-05-27T05:40:00.000Z"),
    );

    expect(guard).toMatchObject({
      blocked: true,
      nextAttemptAt: "2026-05-27T05:50:00.000Z",
    });
  });
});

function run(overrides: Partial<SearchAdBackfillRunRecord>): SearchAdBackfillRunRecord {
  return {
    createdAt: "2026-05-27T05:00:00.000Z",
    id: "run-1",
    inputJson: {},
    status: "running",
    updatedAt: "2026-05-27T05:00:00.000Z",
    ...overrides,
  };
}
