import { NextResponse } from "next/server";
import { ZodError } from "zod";

import type { ApiResponse } from "@/lib/contracts";

export function ok<T>(data: T) {
  const body: ApiResponse<T> = {
    code: "OK",
    message: "success",
    data,
  };

  return NextResponse.json(body);
}

export function fail(code: ApiResponse<null>["code"], message: string, status = 400) {
  const body: ApiResponse<null> = {
    code,
    message,
    data: null,
    requestId: crypto.randomUUID(),
  };

  return NextResponse.json(body, { status });
}

export function handleRouteError(error: unknown) {
  if (error instanceof ZodError) {
    return fail("VALIDATION_ERROR", error.issues[0]?.message ?? "参数校验失败", 422);
  }

  if (error instanceof Error) {
    return fail("INTERNAL_ERROR", error.message, 500);
  }

  return fail("INTERNAL_ERROR", "服务内部异常", 500);
}

