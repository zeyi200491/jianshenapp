import {
  ACCESS_TOKEN_COOKIE,
  REFRESH_TOKEN_COOKIE,
  buildSessionCookieHeaders,
  clearSessionCookieHeaders,
  extractAccessTokenFromHeaders,
} from './session-cookie.util';

describe('session cookie utilities', () => {
  it('builds HttpOnly secure production cookies for access and refresh tokens', () => {
    const headers = buildSessionCookieHeaders(
      {
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      },
      {
        nodeEnv: 'production',
      },
    );

    expect(headers).toHaveLength(2);
    expect(headers[0]).toContain(`${ACCESS_TOKEN_COOKIE}=access-token`);
    expect(headers[0]).toContain('HttpOnly');
    expect(headers[0]).toContain('Secure');
    expect(headers[0]).toContain('SameSite=Lax');
    expect(headers[0]).toContain('Path=/');
    expect(headers[1]).toContain(`${REFRESH_TOKEN_COOKIE}=refresh-token`);
    expect(headers[1]).toContain('HttpOnly');
    expect(headers[1]).toContain('Secure');
  });

  it('clears both session cookies with expired headers', () => {
    const headers = clearSessionCookieHeaders({ nodeEnv: 'production' });

    expect(headers).toHaveLength(2);
    expect(headers[0]).toContain(`${ACCESS_TOKEN_COOKIE}=`);
    expect(headers[0]).toContain('Max-Age=0');
    expect(headers[1]).toContain(`${REFRESH_TOKEN_COOKIE}=`);
    expect(headers[1]).toContain('Max-Age=0');
  });

  it('prefers bearer auth and falls back to the HttpOnly access cookie', () => {
    expect(
      extractAccessTokenFromHeaders({
        authorization: 'Bearer header-token',
        cookie: `${ACCESS_TOKEN_COOKIE}=cookie-token`,
      }),
    ).toBe('header-token');

    expect(
      extractAccessTokenFromHeaders({
        cookie: `theme=dark; ${ACCESS_TOKEN_COOKIE}=cookie-token; other=value`,
      }),
    ).toBe('cookie-token');
  });
});
