import { trainingTemplateSchema } from "@/lib/validation";
import { fail, handleRouteError, ok } from "@/lib/http";
import { getTrainingTemplate, updateTrainingTemplate } from "@/lib/mock-store";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const item = getTrainingTemplate(id);

  if (!item) {
    return fail("NOT_FOUND", "训练模板不存在", 404);
  }

  return ok(item);
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const payload = trainingTemplateSchema.parse(await request.json());
    const { id } = await context.params;
    const item = updateTrainingTemplate(id, payload);

    if (!item) {
      return fail("NOT_FOUND", "训练模板不存在", 404);
    }

    return ok(item);
  } catch (error) {
    return handleRouteError(error);
  }
}

