import { productSchema } from "@/lib/validation";
import { fail, handleRouteError, ok } from "@/lib/http";
import { getProduct, updateProduct } from "@/lib/mock-store";

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const item = getProduct(id);

  if (!item) {
    return fail("NOT_FOUND", "商品不存在", 404);
  }

  return ok(item);
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const payload = productSchema.parse(await request.json());
    const { id } = await context.params;
    const item = updateProduct(id, payload);

    if (!item) {
      return fail("NOT_FOUND", "商品不存在", 404);
    }

    return ok(item);
  } catch (error) {
    return handleRouteError(error);
  }
}

