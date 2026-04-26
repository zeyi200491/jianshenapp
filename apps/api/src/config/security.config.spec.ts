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

  it('keeps swagger disabled by default in production', () => {
    expect(shouldEnableSwagger({ NODE_ENV: 'production' })).toBe(false);
    expect(shouldEnableSwagger({ NODE_ENV: 'production', SWAGGER_ENABLED: 'true' })).toBe(true);
    expect(shouldEnableSwagger({ NODE_ENV: 'development' })).toBe(true);
  });

  it('allows a development fallback secret outside production', () => {
    expect(getJwtSecret({ NODE_ENV: 'development' })).toBe('campusfit-dev-secret');
  });
});
