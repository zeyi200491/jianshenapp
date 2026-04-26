import { fetchAdminApi, getAdminAuthHeaders } from "@/lib/api-client";
import { handleRouteError } from "@/lib/http";
import { foodLibraryItemPatchSchema } from "@/lib/validation";

const adminFoodLibraryItemsPath = "/admin/food-library-items";

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    return fetchAdminApi(`${adminFoodLibraryItemsPath}/${encodeURIComponent(id)}`, {
      headers: {
        ...getAdminAuthHeaders(request),
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const payload = foodLibraryItemPatchSchema.parse(await request.json());
    const { id } = await context.params;

    return fetchAdminApi(`${adminFoodLibraryItemsPath}/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...getAdminAuthHeaders(request),
      },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
