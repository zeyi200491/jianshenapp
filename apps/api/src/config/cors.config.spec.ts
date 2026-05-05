import { resolveAllowedOrigins } from './cors.config';

describe('API cors config', () => {
  it('keeps production cors origins explicit instead of auto-allowing localhost', () => {
    expect(
      resolveAllowedOrigins({
        NODE_ENV: 'production',
        CORS_ORIGIN: 'https://app.example.com,https://admin.example.com',
      } as NodeJS.ProcessEnv),
    ).toEqual(['https://app.example.com', 'https://admin.example.com']);
  });

  it('merges local defaults in non-production environments', () => {
    expect(
      resolveAllowedOrigins({
        NODE_ENV: 'development',
        CORS_ORIGIN: 'https://preview.example.com',
      } as NodeJS.ProcessEnv),
    ).toEqual([
      'https://preview.example.com',
      'http://127.0.0.1:3200',
      'http://localhost:3200',
      'http://127.0.0.1:3100',
      'http://localhost:3100',
    ]);
  });
});
