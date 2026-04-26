import { ok } from "@/lib/http";
import { getDashboardMetrics } from "@/lib/mock-store";

export async function GET() {
  return ok(getDashboardMetrics());
}

