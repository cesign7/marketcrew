import { describe, expect, it } from "vitest";
import { parseSpecialDayApiResponse } from "@/lib/integrations/korea/holidays";

describe("korean public holidays", () => {
  it("공공데이터 특일 API JSON 응답에서 공공기관 휴일만 읽는다", () => {
    const holidays = parseSpecialDayApiResponse(
      JSON.stringify({
        response: {
          body: {
            items: {
              item: [
                { dateName: "부처님오신날", isHoliday: "Y", locdate: 20260524 },
                { dateName: "기념일", isHoliday: "N", locdate: 20260525 },
              ],
            },
          },
        },
      }),
    );

    expect(holidays).toEqual([
      { date: "2026-05-24", isHoliday: true, name: "부처님오신날", source: "official" },
      { date: "2026-05-25", isHoliday: false, name: "기념일", source: "official" },
    ]);
  });

  it("공공데이터 특일 API XML 응답도 읽는다", () => {
    const holidays = parseSpecialDayApiResponse(`
      <response>
        <body>
          <items>
            <item>
              <dateName>대체공휴일</dateName>
              <isHoliday>Y</isHoliday>
              <locdate>20260525</locdate>
            </item>
          </items>
        </body>
      </response>
    `);

    expect(holidays).toEqual([{ date: "2026-05-25", isHoliday: true, name: "대체공휴일", source: "official" }]);
  });
});
