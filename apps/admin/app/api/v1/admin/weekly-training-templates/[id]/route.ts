import { fail, handleRouteError, ok } from "@/lib/http";
import { getWeeklyTrainingTemplate, updateWeeklyTrainingTemplate } from "@/lib/mock-store";
import { weeklyTrainingTemplateSchema } from "@/lib/validation";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const item = getWeeklyTrainingTemplate(id);

  if (!item) {
    return fail("NOT_FOUND", "周训练模板不存在", 404);
  }

  return ok(item);
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const payload = weeklyTrainingTemplateSchema.parse(await request.json());
    const { id } = await context.params;
    const item = updateWeeklyTrainingTemplate(id, payload);

    if (!item) {
      return fail("NOT_FOUND", "周训练模板不存在", 404);
    }

    return ok(item);
  } catch (error) {
    return handleRouteError(error);
  }
}
