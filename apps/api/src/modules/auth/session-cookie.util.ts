export const ACCESS_TOKEN_COOKIE = 'campusfit_access_token';
export const REFRESH_TOKEN_COOKIE = 'campusfit_refresh_token';
export const LEGACY_ADMIN_SESSION_COOKIE = 'campusfit_admin_session';

const ACCESS_TOKEN_MAX_AGE_SECONDS = 7 * 24 * 60 * 60;
const REFRESH_TOKEN_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

type CookieEnv = {
  nodeEnv?: string;
};

type TokenPair = {
  accessToken: string;
  refreshToken: string;
};

function shouldUseSecureCookie(options: CookieEnv = {}) {
  return (options.nodeEnv ?? process.env.NODE_ENV) === 'production';
}

function serializeCookie(name: string, value: string, maxAgeSeconds: number, options: CookieEnv = {}) {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    'Path=/',
    `Max-Age=${maxAgeSeconds}`,
    'HttpOnly',
    'SameSite=Lax',
  ];

  if (shouldUseSecureCookie(options)) {
    parts.push('Secure');
  }

  return parts.join('; ');
}

export function buildSessionCookieHeaders(tokens: TokenPair, options: CookieEnv = {}) {
  return [
    serializeCookie(ACCESS_TOKEN_COOKIE, tokens.accessToken, ACCESS_TOKEN_MAX_AGE_SECONDS, options),
    serializeCookie(REFRESH_TOKEN_COOKIE, tokens.refreshToken, REFRESH_TOKEN_MAX_AGE_SECONDS, options),
  ];
}

export function clearSessionCookieHeaders(options: CookieEnv = {}) {
  return [
    serializeCookie(ACCESS_TOKEN_COOKIE, '', 0, options),
    serializeCookie(REFRESH_TOKEN_COOKIE, '', 0, options),
  ];
}

function parseCookieHeader(cookieHeader: string | undefined) {
  const cookies = new Map<string, string>();
  if (!cookieHeader) {
    return cookies;
  }

  for (const segment of cookieHeader.split(';')) {
    const [rawName, ...rawValue] = segment.trim().split('=');
    if (!rawName) {
      continue;
    }
    cookies.set(rawName, decodeURIComponent(rawValue.join('=')));
  }

  return cookies;
}

export function extractAccessTokenFromHeaders(headers: {
  authorization?: string | string[];
  cookie?: string;
}) {
  const authorization = Array.isArray(headers.authorization) ? headers.authorization[0] : headers.authorization;
  const bearerToken = authorization?.match(/^Bearer\s+(.+)$/i)?.[1]?.trim();
  if (bearerToken) {
    return bearerToken;
  }

  const cookies = parseCookieHeader(headers.cookie);
  return cookies.get(ACCESS_TOKEN_COOKIE) ?? cookies.get(LEGACY_ADMIN_SESSION_COOKIE) ?? null;
}
