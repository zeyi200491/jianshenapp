import {
  getAiServiceAuthToken,
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
        AI_SERVICE_AUTH_TOKEN: 'service-token-prod-service-token',
        CORS_ORIGIN: 'https://app.example.com',
      }),
    ).toThrow(/ADMIN_EMAIL/);
  });

  it('rejects placeholder production secrets even when they satisfy length checks', () => {
    expect(() =>
      validateApiSecurityConfig({
        NODE_ENV: 'production',
        JWT_SECRET: 'replace-with-32-char-jwt-secret',
        AI_SERVICE_AUTH_TOKEN: 'service-token-prod-service-token',
        ADMIN_EMAIL: 'ops@example.com',
        ADMIN_PASSWORD: 'replace-with-admin-password',
        CORS_ORIGIN: 'https://app.example.com',
      }),
    ).toThrow(/JWT_SECRET|ADMIN_PASSWORD/);

    expect(() =>
      validateApiSecurityConfig({
        NODE_ENV: 'production',
        JWT_SECRET: 'prod-secret-prod-secret-prod-secret',
        AI_SERVICE_AUTH_TOKEN: 'replace-with-32-char-service-token',
        ADMIN_EMAIL: 'ops@example.com',
        ADMIN_PASSWORD: 'strong-production-password',
        CORS_ORIGIN: 'https://app.example.com',
      }),
    ).toThrow(/AI_SERVICE_AUTH_TOKEN/);
  });

  it('requires a dedicated ai-service token in all environments', () => {
    expect(() => getAiServiceAuthToken({ NODE_ENV: 'development' })).toThrow(/AI_SERVICE_AUTH_TOKEN/);
    expect(
      getAiServiceAuthToken({
        NODE_ENV: 'development',
        AI_SERVICE_AUTH_TOKEN: 'service-token-value',
      }),
    ).toBe('service-token-value');
  });

  it('rejects missing production cors configuration', () => {
    expect(() =>
      validateApiSecurityConfig({
        NODE_ENV: 'production',
        JWT_SECRET: 'prod-secret-prod-secret-prod-secret',
        AI_SERVICE_AUTH_TOKEN: 'service-token-prod-service-token',
        ADMIN_EMAIL: 'ops@example.com',
        ADMIN_PASSWORD: 'strong-production-password',
      }),
    ).toThrow(/CORS_ORIGIN/);
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

  it('accepts explicit production security configuration', () => {
    expect(() =>
      validateApiSecurityConfig({
        NODE_ENV: 'production',
        JWT_SECRET: 'prod-secret-prod-secret-prod-secret',
        AI_SERVICE_AUTH_TOKEN: 'service-token-prod-service-token',
        ADMIN_EMAIL: 'ops@example.com',
        ADMIN_PASSWORD: 'strong-production-password',
        CORS_ORIGIN: 'https://app.example.com',
      }),
    ).not.toThrow();
  });
});
