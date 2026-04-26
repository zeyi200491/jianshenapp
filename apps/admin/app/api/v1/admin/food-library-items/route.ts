import { fetchAdminApi, getAdminAuthHeaders } from "@/lib/api-client";
import { handleRouteError } from "@/lib/http";
import { foodLibraryItemCreateSchema } from "@/lib/validation";

const adminFoodLibraryItemsPath = "/admin/food-library-items";

export async function GET(request: Request) {
  try {
    const { search } = new URL(request.url);
    return fetchAdminApi(`${adminFoodLibraryItemsPath}${search}`, {
      headers: {
        ...getAdminAuthHeaders(request),
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: Request) {
  try {
    const payload = foodLibraryItemCreateSchema.parse(await request.json());

    return fetchAdminApi(adminFoodLibraryItemsPath, {
      method: "POST",
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
