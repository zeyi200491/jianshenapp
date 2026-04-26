import { trainingTemplateSchema } from "@/lib/validation";
import { handleRouteError, ok } from "@/lib/http";
import { createTrainingTemplate, listTrainingTemplates } from "@/lib/mock-store";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  return ok(
    listTrainingTemplates({
      keyword: searchParams.get("keyword") ?? undefined,
      status: (searchParams.get("status") as "draft" | "active" | "inactive" | "all" | null) ?? undefined,
      splitType: searchParams.get("splitType") ?? undefined,
      experienceLevel: searchParams.get("experienceLevel") ?? undefined,
    }),
  );
}

export async function POST(request: Request) {
  try {
    const payload = trainingTemplateSchema.parse(await request.json());
    return ok(createTrainingTemplate(payload));
  } catch (error) {
    return handleRouteError(error);
  }
}

