import { dietTemplateSchema } from "@/lib/validation";
import { handleRouteError, ok } from "@/lib/http";
import { createDietTemplate, listDietTemplates } from "@/lib/mock-store";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  return ok(
    listDietTemplates({
      keyword: searchParams.get("keyword") ?? undefined,
      status: (searchParams.get("status") as "draft" | "active" | "inactive" | "all" | null) ?? undefined,
      scene: searchParams.get("scene") ?? undefined,
      goalType: (searchParams.get("goalType") as "cut" | "maintain" | "bulk" | "all" | null) ?? undefined,
    }),
  );
}

export async function POST(request: Request) {
  try {
    const payload = dietTemplateSchema.parse(await request.json());
    return ok(createDietTemplate(payload));
  } catch (error) {
    return handleRouteError(error);
  }
}

