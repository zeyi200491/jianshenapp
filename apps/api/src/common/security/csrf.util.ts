import { randomBytes } from 'node:crypto';
import type { IncomingHttpHeaders } from 'http';
import { AppException } from '../utils/app.exception';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const CSRF_HEADER = 'x-campusfit-csrf';
const CSRF_COOKIE = 'campusfit_csrf_token';
const CSRF_MAX_AGE_SECONDS = 8 * 60 * 60;

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

function parseCookies(cookieHeader: string | undefined): Map<string, string> {
  const cookies = new Map<string, string>();
  if (!cookieHeader) return cookies;
  for (const segment of cookieHeader.split(';')) {
    const [name, ...rest] = segment.trim().split('=');
    if (name) cookies.set(name, decodeURIComponent(rest.join('=')));
  }
  return cookies;
}

export function generateCsrfToken(): string {
  return randomBytes(32).toString('hex');
}

export function buildCsrfCookieHeader(token: string, nodeEnv?: string): string {
  const parts = [
    `${CSRF_COOKIE}=${encodeURIComponent(token)}`,
    'Path=/',
    `Max-Age=${CSRF_MAX_AGE_SECONDS}`,
    'SameSite=Lax',
  ];
  if (nodeEnv === 'production') {
    parts.push('Secure');
  }
  return parts.join('; ');
}

export function isStateChangingRequest(method = 'GET') {
  return !SAFE_METHODS.has(method.toUpperCase());
}

export function assertCookieCsrfProtection(request: CsrfRequest, allowedOrigins: string[]) {
  if (!isStateChangingRequest(request.method)) {
    return;
  }

  const cookies = parseCookies(request.headers.cookie as string | undefined);
  const cookieToken = cookies.get(CSRF_COOKIE);
  const headerToken = getHeader(request.headers, CSRF_HEADER);

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
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
