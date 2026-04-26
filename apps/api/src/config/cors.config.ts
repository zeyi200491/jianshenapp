export function resolveAllowedOrigins(env: NodeJS.ProcessEnv = process.env) {
  const configured = env.CORS_ORIGIN?.split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  if (configured && configured.length > 0) {
    return configured;
  }

  return ['http://127.0.0.1:3200', 'http://localhost:3200', 'http://127.0.0.1:3100', 'http://localhost:3100'];
}
