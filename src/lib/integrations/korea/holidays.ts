import type { SearchAdHoliday } from "@/features/search-ad/domain/operationCalendar";

const SPECIAL_DAY_API_BASE_URL = "https://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/getRestDeInfo";

type HolidayApiEnv = Partial<
  Record<"KOREA_PUBLIC_HOLIDAY_SERVICE_KEY" | "KOREA_HOLIDAY_API_KEY" | "DATA_GO_KR_SERVICE_KEY", string>
>;

type PublicHolidayItem = {
  dateName?: string;
  isHoliday?: string;
  locdate?: number | string;
};

export async function fetchKoreanPublicHolidaysForDate(date: string, env: HolidayApiEnv = process.env as HolidayApiEnv): Promise<SearchAdHoliday[]> {
  const serviceKey = getHolidayServiceKey(env);
  if (!serviceKey || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return [];
  }

  const year = date.slice(0, 4);
  const holidays = await fetchKoreanPublicHolidaysForYear(year, serviceKey);
  return holidays.filter((holiday) => holiday.date === date && holiday.isHoliday);
}

async function fetchKoreanPublicHolidaysForYear(year: string, serviceKey: string): Promise<SearchAdHoliday[]> {
  const query = new URLSearchParams({
    _type: "json",
    numOfRows: "100",
    pageNo: "1",
    solYear: year,
  });
  const encodedServiceKey = serviceKey.includes("%") ? serviceKey : encodeURIComponent(serviceKey);
  const response = await fetch(`${SPECIAL_DAY_API_BASE_URL}?serviceKey=${encodedServiceKey}&${query.toString()}`, {
    cache: "no-store",
    headers: { accept: "application/json, application/xml, text/xml, */*" },
  });
  if (!response.ok) {
    return [];
  }

  const text = await response.text();
  return parseSpecialDayApiResponse(text);
}

export function parseSpecialDayApiResponse(text: string): SearchAdHoliday[] {
  const trimmed = text.trim();
  if (!trimmed) {
    return [];
  }

  if (trimmed.startsWith("{")) {
    return parseSpecialDayJson(trimmed);
  }

  return parseSpecialDayXml(trimmed);
}

function parseSpecialDayJson(text: string) {
  try {
    const payload = JSON.parse(text) as {
      response?: {
        body?: {
          items?: {
            item?: PublicHolidayItem | PublicHolidayItem[];
          };
        };
      };
    };
    return toHolidayItems(payload.response?.body?.items?.item);
  } catch {
    return [];
  }
}

function parseSpecialDayXml(text: string) {
  const items: PublicHolidayItem[] = [];
  for (const match of text.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const itemText = match[1] ?? "";
    items.push({
      dateName: readXmlTag(itemText, "dateName"),
      isHoliday: readXmlTag(itemText, "isHoliday"),
      locdate: readXmlTag(itemText, "locdate"),
    });
  }

  return toHolidayItems(items);
}

function toHolidayItems(item: PublicHolidayItem | PublicHolidayItem[] | undefined): SearchAdHoliday[] {
  const items = Array.isArray(item) ? item : item ? [item] : [];
  return items
    .map((row): SearchAdHoliday | undefined => {
      const date = normalizeLocdate(row.locdate);
      if (!date) {
        return undefined;
      }

      return {
        date,
        isHoliday: String(row.isHoliday ?? "").toUpperCase() === "Y",
        name: String(row.dateName ?? "공휴일"),
        source: "official",
      };
    })
    .filter((holiday): holiday is SearchAdHoliday => Boolean(holiday));
}

function normalizeLocdate(value: string | number | undefined) {
  const raw = String(value ?? "").replace(/[^0-9]/g, "");
  if (raw.length !== 8) {
    return undefined;
  }

  return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
}

function readXmlTag(text: string, tag: string) {
  const match = text.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`));
  return match?.[1]?.replace(/^<!\[CDATA\[/, "").replace(/\]\]>$/, "").trim();
}

function getHolidayServiceKey(env: HolidayApiEnv) {
  return env.KOREA_PUBLIC_HOLIDAY_SERVICE_KEY ?? env.KOREA_HOLIDAY_API_KEY ?? env.DATA_GO_KR_SERVICE_KEY;
}
