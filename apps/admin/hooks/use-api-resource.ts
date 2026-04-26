"use client";

import { useCallback, useEffect, useState } from "react";

import { apiRequest } from "@/lib/api-client";

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
      setError(fetchError instanceof Error ? fetchError.message : "加载失败");
    } finally {
      setIsLoading(false);
    }
  }, [url]);

  useEffect(() => {
    void load();
  }, [load]);

  return { data, error, isLoading, reload: load };
}

