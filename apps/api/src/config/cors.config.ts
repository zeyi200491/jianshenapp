export function resolveAllowedOrigins(env: NodeJS.ProcessEnv = process.env) {
  const defaultOrigins = [
    'http://127.0.0.1:3200',
    'http://localhost:3200',
    'http://127.0.0.1:3100',
    'http://localhost:3100',
    'https://xiaojianweb.netlify.app',
  ];
  const configured = env.CORS_ORIGIN?.split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  if (configured && configured.length > 0) {
    return Array.from(new Set([...configured, ...defaultOrigins]));
  }

  return defaultOrigins;
}
