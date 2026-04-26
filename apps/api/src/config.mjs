import { loadProjectEnv } from '../../../scripts/lib/env.mjs';

function parsePort(rawValue, fallbackPort) {
  const parsedPort = Number.parseInt(rawValue ?? '', 10);
  return Number.isInteger(parsedPort) && parsedPort > 0 ? parsedPort : fallbackPort;
}

export function getConfig() {
  const { env } = loadProjectEnv({ allowMissing: true });
  const mergedEnv = {
    ...env,
    ...process.env
  };

  return {
    nodeEnv: mergedEnv.NODE_ENV ?? 'development',
    host: mergedEnv.API_HOST ?? '127.0.0.1',
    port: parsePort(mergedEnv.API_PORT, 3000),
    databaseUrl: mergedEnv.DATABASE_URL ?? '',
    postgresHost: mergedEnv.POSTGRES_HOST ?? '127.0.0.1',
    postgresPort: parsePort(mergedEnv.POSTGRES_PORT, 5432),
    postgresDatabase: mergedEnv.POSTGRES_DB ?? 'campusfit_ai'
  };
}
