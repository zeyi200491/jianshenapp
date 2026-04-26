const DEVELOPMENT_JWT_SECRET = 'campusfit-dev-secret';

export type SecurityEnv = Partial<Record<string, string | undefined>>;

function isProduction(env: SecurityEnv = process.env) {
  return env.NODE_ENV === 'production';
}

function isBlank(value: string | undefined) {
  return !value || value.trim().length === 0;
}

export function getJwtSecret(env: SecurityEnv = process.env) {
  const configuredSecret = env.JWT_SECRET?.trim();
  if (configuredSecret) {
    return configuredSecret;
  }

  if (isProduction(env)) {
    throw new Error('JWT_SECRET is required in production');
  }

  return DEVELOPMENT_JWT_SECRET;
}

export function shouldEnableSwagger(env: SecurityEnv = process.env) {
  const configured = env.SWAGGER_ENABLED?.trim().toLowerCase();
  if (configured === 'true') {
    return true;
  }
  if (configured === 'false') {
    return false;
  }
  return !isProduction(env);
}

export function getAdminCredentials(env: SecurityEnv = process.env) {
  const email = env.ADMIN_EMAIL?.trim();
  const password = env.ADMIN_PASSWORD?.trim();

  if (isProduction(env)) {
    if (isBlank(email)) {
      throw new Error('ADMIN_EMAIL is required in production');
    }
    if (isBlank(password)) {
      throw new Error('ADMIN_PASSWORD is required in production');
    }
  }

  return {
    email: email || 'ops@campusfit.ai',
    password: password || 'CampusFit123',
  };
}

export function validateApiSecurityConfig(env: SecurityEnv = process.env) {
  const jwtSecret = getJwtSecret(env);

  if (isProduction(env) && jwtSecret === DEVELOPMENT_JWT_SECRET) {
    throw new Error('JWT_SECRET must not use the development fallback in production');
  }

  if (isProduction(env) && jwtSecret.length < 24) {
    throw new Error('JWT_SECRET must be at least 24 characters in production');
  }

  getAdminCredentials(env);
}
