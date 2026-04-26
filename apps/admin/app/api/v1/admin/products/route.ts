import { productSchema } from "@/lib/validation";
import { handleRouteError, ok } from "@/lib/http";
import { createProduct, listProducts } from "@/lib/mock-store";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  return ok(
    listProducts({
      keyword: searchParams.get("keyword") ?? undefined,
      status: (searchParams.get("status") as "draft" | "active" | "inactive" | "all" | null) ?? undefined,
      category: searchParams.get("category") ?? undefined,
      sceneTag: searchParams.get("sceneTag") ?? undefined,
      targetTag: searchParams.get("targetTag") ?? undefined,
    }),
  );
}

export async function POST(request: Request) {
  try {
    const payload = productSchema.parse(await request.json());
    return ok(createProduct(payload));
  } catch (error) {
    return handleRouteError(error);
  }
}

