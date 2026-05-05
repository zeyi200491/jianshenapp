import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

export type SecurityEnv = Partial<Record<string, string | undefined>>;

function isProduction(env: SecurityEnv = process.env) {
  return env.NODE_ENV === 'production';
}

function isLocalOrigin(origin: string) {
  return origin.startsWith('http://127.0.0.1:') || origin.startsWith('http://localhost:');
}

function isPlaceholderLike(value: string) {
  const normalized = value.trim().toLowerCase();
  return [
    'replace-with-32-char-jwt-secret',
    'replace-with-32-char-service-token',
    'replace-with-admin-password',
    'change-me',
    'change-me-in-production',
  ].includes(normalized);
}

function requireEnv(name: string, env: SecurityEnv = process.env): string {
  const value = env[name]?.trim();
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

export function getJwtSecret(env: SecurityEnv = process.env) {
  const secret = env.JWT_SECRET?.trim();
  if (!secret) {
    throw new Error('JWT_SECRET is required in all environments');
  }
  if (isProduction(env) && (secret.length < 24 || isPlaceholderLike(secret))) {
    throw new Error('JWT_SECRET must be at least 24 characters and not use a placeholder in production');
  }
  return secret;
}

export function getAiServiceAuthToken(env: SecurityEnv = process.env) {
  const token = env.AI_SERVICE_AUTH_TOKEN?.trim();
  if (!token) {
    throw new Error('AI_SERVICE_AUTH_TOKEN is required in all environments');
  }
  if (isProduction(env) && (token.length < 24 || isPlaceholderLike(token))) {
    throw new Error('AI_SERVICE_AUTH_TOKEN must be at least 24 characters and not use a placeholder in production');
  }
  return token;
}

export function validateCorsOriginConfig(env: SecurityEnv = process.env) {
  if (!isProduction(env)) {
    return;
  }

  const configured = env.CORS_ORIGIN?.split(',').map((item) => item.trim()).filter(Boolean) ?? [];
  if (configured.length === 0) {
    throw new Error('CORS_ORIGIN is required in production');
  }
  if (configured.some((origin) => origin.includes('placeholder.invalid'))) {
    throw new Error('CORS_ORIGIN cannot contain placeholder.invalid in production');
  }
  if (configured.some(isLocalOrigin)) {
    throw new Error('CORS_ORIGIN cannot contain localhost origins in production');
  }
}

export function hashPassword(password: string): string {
  const salt = randomBytes(32).toString('base64');
  const hash = scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 }).toString('base64');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const [salt, hash] = storedHash.split(':');
  if (!salt || !hash) return false;
  const computed = scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 });
  const expected = Buffer.from(hash, 'base64');
  if (computed.length !== expected.length) return false;
  return timingSafeEqual(computed, expected);
}

export function shouldEnableSwagger(env: SecurityEnv = process.env) {
  const configured = env.SWAGGER_ENABLED?.trim().toLowerCase();
  if (configured === 'true') return true;
  if (configured === 'false') return false;
  return false;
}

export function getAdminCredentials(env: SecurityEnv = process.env) {
  const email = requireEnv('ADMIN_EMAIL', env);
  const password = requireEnv('ADMIN_PASSWORD', env);
  if (isProduction(env) && isPlaceholderLike(password)) {
    throw new Error('ADMIN_PASSWORD must not use a placeholder in production');
  }
  return { email, password };
}

export function validateApiSecurityConfig(env: SecurityEnv = process.env) {
  const jwtSecret = getJwtSecret(env);
  const aiServiceAuthToken = getAiServiceAuthToken(env);
  if (jwtSecret === aiServiceAuthToken) {
    throw new Error('AI_SERVICE_AUTH_TOKEN must differ from JWT_SECRET');
  }
  getAdminCredentials(env);
  validateCorsOriginConfig(env);
}
