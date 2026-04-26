export function sanitizeInternalPath(value: string | null, fallback: string) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) {
    return fallback;
  }

  try {
    const url = new URL(value, 'http://campusfit.local');
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
