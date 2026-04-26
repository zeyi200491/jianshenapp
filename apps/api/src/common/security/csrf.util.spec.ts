import { AppException } from '../utils/app.exception';
import { assertCookieCsrfProtection } from './csrf.util';

describe('CSRF protection for cookie authenticated requests', () => {
  const allowedOrigins = ['http://127.0.0.1:3200', 'http://localhost:3100'];

  it('allows safe HTTP methods without CSRF headers', () => {
    expect(() =>
      assertCookieCsrfProtection(
        {
          method: 'GET',
          headers: {
            cookie: 'campusfit_access_token=token',
          },
        },
        allowedOrigins,
      ),
    ).not.toThrow();
  });

  it('rejects cookie authenticated mutations without the CSRF marker header', () => {
    expect(() =>
      assertCookieCsrfProtection(
        {
          method: 'POST',
          headers: {
            cookie: 'campusfit_access_token=token',
            origin: 'http://127.0.0.1:3200',
          },
        },
        allowedOrigins,
      ),
    ).toThrow(AppException);
  });

  it('rejects cross-site browser requests even when a marker header is present', () => {
    expect(() =>
      assertCookieCsrfProtection(
        {
          method: 'PATCH',
          headers: {
            cookie: 'campusfit_access_token=token',
            origin: 'http://evil.example',
            'sec-fetch-site': 'cross-site',
            'x-campusfit-csrf': '1',
          },
        },
        allowedOrigins,
      ),
    ).toThrow(AppException);
  });

  it('allows same-site cookie authenticated mutations with a trusted origin and CSRF marker', () => {
    expect(() =>
      assertCookieCsrfProtection(
        {
          method: 'DELETE',
          headers: {
            cookie: 'campusfit_access_token=token',
            origin: 'http://127.0.0.1:3200',
            'sec-fetch-site': 'same-site',
            'x-campusfit-csrf': '1',
          },
        },
        allowedOrigins,
      ),
    ).not.toThrow();
  });
});
