import { ok } from "@/lib/http";
import { listFeedback } from "@/lib/mock-store";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  return ok(
    listFeedback({
      keyword: searchParams.get("keyword") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      channel: searchParams.get("channel") ?? undefined,
      sentiment: searchParams.get("sentiment") ?? undefined,
    }),
  );
}

