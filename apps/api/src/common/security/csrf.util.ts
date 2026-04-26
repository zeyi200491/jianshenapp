import type { IncomingHttpHeaders } from 'http';
import { AppException } from '../utils/app.exception';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const CSRF_HEADER = 'x-campusfit-csrf';

type CsrfRequest = {
  method?: string;
  headers: IncomingHttpHeaders;
};

function firstHeaderValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getHeader(headers: IncomingHttpHeaders, name: string) {
  return firstHeaderValue(headers[name.toLowerCase()]);
}

function normalizeOrigin(value: string) {
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function getRequestOrigin(headers: IncomingHttpHeaders) {
  const origin = getHeader(headers, 'origin');
  if (origin) {
    return normalizeOrigin(origin);
  }

  const referer = getHeader(headers, 'referer');
  return referer ? normalizeOrigin(referer) : null;
}

function rejectCsrf() {
  throw new AppException('FORBIDDEN', '请求来源校验失败，请刷新页面后重试', 403);
}

export function isStateChangingRequest(method = 'GET') {
  return !SAFE_METHODS.has(method.toUpperCase());
}

export function assertCookieCsrfProtection(request: CsrfRequest, allowedOrigins: string[]) {
  if (!isStateChangingRequest(request.method)) {
    return;
  }

  const csrfMarker = getHeader(request.headers, CSRF_HEADER);
  if (csrfMarker !== '1') {
    rejectCsrf();
  }

  const fetchSite = getHeader(request.headers, 'sec-fetch-site');
  if (fetchSite === 'cross-site') {
    rejectCsrf();
  }

  const requestOrigin = getRequestOrigin(request.headers);
  if (!requestOrigin) {
    return;
  }

  const trustedOrigins = new Set(allowedOrigins.map(normalizeOrigin).filter((origin): origin is string => Boolean(origin)));
  if (!trustedOrigins.has(requestOrigin)) {
    rejectCsrf();
  }
}
