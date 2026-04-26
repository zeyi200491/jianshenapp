import { fail, ok } from "@/lib/http";
import { getFeedback } from "@/lib/mock-store";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const item = getFeedback(id);

  if (!item) {
    return fail("NOT_FOUND", "反馈不存在", 404);
  }

  return ok(item);
}

