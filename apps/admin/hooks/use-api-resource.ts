"use client";

import { useCallback, useEffect, useState } from "react";

import { apiRequest } from "@/lib/api-client";

function describeAdminError(error: unknown): string {
  if (error instanceof Error) {
    if (error.message.includes("UNAUTHORIZED") || error.message.includes("401")) return "请先登录后台";
    if (error.message.includes("FORBIDDEN") || error.message.includes("403")) return "当前账号没有操作权限";
    if (error.message.includes("NOT_FOUND") || error.message.includes("404")) return "请求的资源不存在";
    if (error.message.includes("TOO_MANY_REQUESTS") || error.message.includes("429")) return "请求过于频繁，请稍后重试";
    if (error.message.includes("fetch")) return "网络请求失败，请检查网络连接";
  }
  return "加载失败，请重试";
}

type UseApiResourceResult<T> = {
  data: T | null;
  error: string | null;
  isLoading: boolean;
  reload: () => Promise<void>;
};

export function useApiResource<T>(url: string): UseApiResourceResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await apiRequest<T>(url);
      setData(result);
    } catch (fetchError) {
      setError(describeAdminError(fetchError));
    } finally {
      setIsLoading(false);
    }
  }, [url]);

  useEffect(() => {
    void load();
  }, [load]);

  return { data, error, isLoading, reload: load };
}

