import { NextResponse, type NextRequest } from "next/server";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function unauthorized() {
  return NextResponse.json({ code: "UNAUTHORIZED", message: "请先登录后台", data: null }, { status: 401 });
}

function forbidden() {
  return NextResponse.json({ code: "FORBIDDEN", message: "请求来源校验失败", data: null }, { status: 403 });
}

function isStateChangingRequest(method: string) {
  return !SAFE_METHODS.has(method.toUpperCase());
}

function extractToken(request: NextRequest): string | null {
  const auth = request.headers.get("authorization");
  if (auth) {
    const match = auth.match(/^Bearer\s+(.+)$/i);
    if (match) return match[1].trim();
  }
  const cookies = request.headers.get("cookie") ?? "";
  for (const segment of cookies.split(";")) {
    const [name, ...rest] = segment.trim().split("=");
    if (name === "campusfit_access_token" || name === "campusfit_admin_session") {
      return rest.join("=").trim() || null;
    }
  }
  return null;
}

export function middleware(request: NextRequest) {
  const token = extractToken(request);
  if (!token) {
    return unauthorized();
  }

  if (isStateChangingRequest(request.method)) {
    const csrfCookie = request.cookies.get("campusfit_csrf_token")?.value;
    const csrfHeader = request.headers.get("X-CampusFit-CSRF");
    if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
      return forbidden();
    }

    if (request.headers.get("sec-fetch-site") === "cross-site") {
      return forbidden();
    }

    const origin = request.headers.get("origin");
    if (origin && origin !== request.nextUrl.origin) {
      return forbidden();
    }
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("Authorization", `Bearer ${token}`);

  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: ["/api/v1/admin/:path*"],
};
