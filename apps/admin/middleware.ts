import { NextResponse, type NextRequest } from "next/server";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function forbidden() {
  return NextResponse.json({ code: "FORBIDDEN", message: "请求来源校验失败", data: null }, { status: 403 });
}

function isStateChangingRequest(method: string) {
  return !SAFE_METHODS.has(method.toUpperCase());
}

export function middleware(request: NextRequest) {
  if (!isStateChangingRequest(request.method)) {
    return NextResponse.next();
  }

  if (request.headers.get("X-CampusFit-CSRF") !== "1") {
    return forbidden();
  }

  if (request.headers.get("sec-fetch-site") === "cross-site") {
    return forbidden();
  }

  const origin = request.headers.get("origin");
  if (origin && origin !== request.nextUrl.origin) {
    return forbidden();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/v1/admin/:path*"],
};
