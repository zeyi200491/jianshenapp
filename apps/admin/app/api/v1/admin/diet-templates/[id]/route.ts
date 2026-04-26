import { dietTemplateSchema } from "@/lib/validation";
import { fail, handleRouteError, ok } from "@/lib/http";
import { getDietTemplate, updateDietTemplate } from "@/lib/mock-store";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const item = getDietTemplate(id);

  if (!item) {
    return fail("NOT_FOUND", "饮食模板不存在", 404);
  }

  return ok(item);
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const payload = dietTemplateSchema.parse(await request.json());
    const { id } = await context.params;
    const item = updateDietTemplate(id, payload);

    if (!item) {
      return fail("NOT_FOUND", "饮食模板不存在", 404);
    }

    return ok(item);
  } catch (error) {
    return handleRouteError(error);
  }
}

