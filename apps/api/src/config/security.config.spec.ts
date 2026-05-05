import {
  getJwtSecret,
  shouldEnableSwagger,
  validateApiSecurityConfig,
} from './security.config';

describe('API security config', () => {
  it('rejects missing or default JWT secrets in production', () => {
    expect(() => validateApiSecurityConfig({ NODE_ENV: 'production' })).toThrow(/JWT_SECRET/);
    expect(() =>
      validateApiSecurityConfig({
        NODE_ENV: 'production',
        JWT_SECRET: 'campusfit-dev-secret',
      }),
    ).toThrow(/JWT_SECRET/);
  });

  it('requires admin credentials in production', () => {
    expect(() =>
      validateApiSecurityConfig({
        NODE_ENV: 'production',
        JWT_SECRET: 'prod-secret-prod-secret-prod-secret',
      }),
    ).toThrow(/ADMIN_EMAIL/);
  });

  it('keeps swagger disabled by default unless explicitly enabled', () => {
    expect(shouldEnableSwagger({ NODE_ENV: 'production' })).toBe(false);
    expect(shouldEnableSwagger({ NODE_ENV: 'production', SWAGGER_ENABLED: 'true' })).toBe(true);
    expect(shouldEnableSwagger({ NODE_ENV: 'development' })).toBe(false);
  });

  it('requires JWT secrets in development too', () => {
    expect(() => getJwtSecret({ NODE_ENV: 'development' })).toThrow(/JWT_SECRET/);
    expect(getJwtSecret({ NODE_ENV: 'development', JWT_SECRET: 'dev-secret-value' })).toBe(
      'dev-secret-value',
    );
  });
});
