import { weeklyTrainingTemplateSchema } from "@/lib/validation";
import { handleRouteError, ok } from "@/lib/http";
import { createWeeklyTrainingTemplate, listWeeklyTrainingTemplates } from "@/lib/mock-store";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  return ok(
    listWeeklyTrainingTemplates({
      keyword: searchParams.get("keyword") ?? undefined,
      status: (searchParams.get("status") as "draft" | "active" | "inactive" | "all" | null) ?? undefined,
      goalType: (searchParams.get("goalType") as "cut" | "maintain" | "bulk" | "all" | null) ?? undefined,
      experienceLevel: searchParams.get("experienceLevel") ?? undefined,
    }),
  );
}

export async function POST(request: Request) {
  try {
    const payload = weeklyTrainingTemplateSchema.parse(await request.json());
    return ok(createWeeklyTrainingTemplate(payload));
  } catch (error) {
    return handleRouteError(error);
  }
}
