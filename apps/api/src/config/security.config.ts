import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

export type SecurityEnv = Partial<Record<string, string | undefined>>;

function isProduction(env: SecurityEnv = process.env) {
  return env.NODE_ENV === 'production';
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
  if (isProduction(env) && secret.length < 24) {
    throw new Error('JWT_SECRET must be at least 24 characters in production');
  }
  return secret;
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
  return { email, password };
}

export function validateApiSecurityConfig(env: SecurityEnv = process.env) {
  getJwtSecret(env);
  getAdminCredentials(env);
}
