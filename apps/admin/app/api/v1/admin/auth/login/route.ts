import { buildAdminApiUrl } from "@/lib/api-client";
import { handleRouteError } from "@/lib/http";
import { loginSchema } from "@/lib/validation";

function appendSetCookie(headers: Headers, setCookie: string | null) {
  if (!setCookie) {
    return;
  }

  for (const cookie of setCookie.split(/,\s*(?=campusfit_(?:access|refresh)_token=)/)) {
    headers.append("Set-Cookie", cookie);
  }
}

export async function POST(request: Request) {
  try {
    const payload = loginSchema.parse(await request.json());
    const upstream = await fetch(buildAdminApiUrl("/auth/admin/login"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });
    const body = await upstream.text();
    const headers = new Headers({
      "Content-Type": upstream.headers.get("content-type") ?? "application/json",
    });
    appendSetCookie(headers, upstream.headers.get("set-cookie"));

    return new Response(body, {
      status: upstream.status,
      headers,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
