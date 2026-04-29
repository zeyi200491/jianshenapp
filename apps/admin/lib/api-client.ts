import type { ApiResponse } from "@/lib/contracts";

const defaultApiBaseUrl = "http://127.0.0.1:3050/api/v1";

export function getAdminApiBaseUrl() {
  return (process.env.NEXT_PUBLIC_API_BASE_URL ?? defaultApiBaseUrl).replace(/\/$/, "");
}

export function buildAdminApiUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${getAdminApiBaseUrl()}${normalizedPath}`;
}

function isStateChangingRequest(method?: string) {
  return !["GET", "HEAD", "OPTIONS"].includes((method ?? "GET").toUpperCase());
}

function getCsrfToken(): string | null {
  for (const segment of document.cookie.split(";")) {
    const [name, ...rest] = segment.trim().split("=");
    if (name === "campusfit_csrf_token") {
      return decodeURIComponent(rest.join("="));
    }
  }
  return null;
}

function getCookieValue(cookieHeader: string | null, name: string) {
  if (!cookieHeader) {
    return null;
  }

  for (const segment of cookieHeader.split(";")) {
    const [rawName, ...rawValue] = segment.trim().split("=");

    if (rawName === name) {
      return rawValue.join("=");
    }
  }

  return null;
}

export function getAdminAuthHeaders(request: Request): Record<string, string> {
  const inboundAuthorization = request.headers.get("authorization");
  const cookieHeader = request.headers.get("cookie");
  const sessionToken =
    getCookieValue(cookieHeader, "campusfit_access_token") ?? getCookieValue(cookieHeader, "campusfit_admin_session");
  const bearerToken = inboundAuthorization?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  const token = bearerToken || sessionToken?.trim();

  if (!token) {
    return {};
  }

  return {
    Authorization: `Bearer ${token}`,
  };
}

export async function apiRequest<T>(input: string, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(isStateChangingRequest(init?.method) ? { "X-CampusFit-CSRF": getCsrfToken() ?? "" } : {}),
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });

  const body = (await response.json()) as ApiResponse<T>;

  if (!response.ok || body.code !== "OK" || body.data === null) {
    throw new Error(body.message || "请求失败");
  }

  return body.data;
}

export function fetchAdminApi(path: string, init?: RequestInit) {
  return fetch(buildAdminApiUrl(path), {
    ...init,
    credentials: "include",
    headers: {
      ...(isStateChangingRequest(init?.method) ? { "X-CampusFit-CSRF": getCsrfToken() ?? "" } : {}),
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
}
