import { handleSearchAdDailySyncCron } from "@/server/search-ad/reportDailySyncCronRoute";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return handleSearchAdDailySyncCron(request, "primary");
}
