import { buildAdminApiUrl, getAdminAuthHeaders } from "@/lib/api-client";
import { handleRouteError } from "@/lib/http";

export async function GET(request: Request) {
  try {
    const upstream = await fetch(buildAdminApiUrl("/auth/admin/me"), {
      method: "GET",
      headers: getAdminAuthHeaders(request),
      cache: "no-store",
    });
    const body = await upstream.text();

    return new Response(body, {
      status: upstream.status,
      headers: {
        "Content-Type": upstream.headers.get("content-type") ?? "application/json",
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
