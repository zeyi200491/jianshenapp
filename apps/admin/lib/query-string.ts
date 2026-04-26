export function queryString(values: Record<string, string>) {
  const params = new URLSearchParams();

  Object.entries(values).forEach(([key, value]) => {
    if (value && value !== "all") {
      params.set(key, value);
    }
  });

  const result = params.toString();
  return result ? `?${result}` : "";
}
