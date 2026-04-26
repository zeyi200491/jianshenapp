import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';

import { loadProjectEnv } from './lib/env.mjs';
import { ROOT_DIR } from './lib/project.mjs';

const requireFromLocalServices = createRequire(resolve(ROOT_DIR, 'tools/local-services/package.json'));
const { Client } = requireFromLocalServices('pg');

const { env } = loadProjectEnv({ allowMissing: true });
const postgresHost = process.env.POSTGRES_HOST ?? env.POSTGRES_HOST ?? '127.0.0.1';
const postgresPort = Number(process.env.POSTGRES_PORT ?? env.POSTGRES_PORT ?? '5432');
const postgresUser = process.env.POSTGRES_USER ?? env.POSTGRES_USER ?? 'campusfit';
const postgresPassword = process.env.POSTGRES_PASSWORD ?? env.POSTGRES_PASSWORD ?? 'campusfit_dev';
const postgresDatabase = process.env.POSTGRES_DB ?? env.POSTGRES_DB ?? 'campusfit_ai';

const extensionsSql = readFileSync(resolve(ROOT_DIR, 'infra/postgres/init/001_extensions.sql'), 'utf8');
const baseSchemaSql = readFileSync(resolve(ROOT_DIR, 'infra/postgres/init/010_schema.sql'), 'utf8');
const patchSql = `
CREATE TABLE IF NOT EXISTS auth_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider VARCHAR(32) NOT NULL,
  open_id VARCHAR(128) NOT NULL,
  union_id VARCHAR(128),
  session_key_digest VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (provider, open_id)
);

CREATE TABLE IF NOT EXISTS body_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  weight_kg NUMERIC(5, 2) NOT NULL,
  body_fat_rate NUMERIC(5, 2),
  source VARCHAR(32) NOT NULL,
  measured_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS weekly_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  week_start_date DATE NOT NULL,
  week_end_date DATE NOT NULL,
  plan_days INT NOT NULL,
  checked_in_days INT NOT NULL,
  avg_diet_completion_rate INT NOT NULL,
  avg_training_completion_rate INT NOT NULL,
  weight_change_kg NUMERIC(5, 2) NOT NULL,
  highlights JSONB NOT NULL DEFAULT '[]'::jsonb,
  risks JSONB NOT NULL DEFAULT '[]'::jsonb,
  recommendations JSONB NOT NULL DEFAULT '[]'::jsonb,
  narrative_text TEXT NOT NULL,
  generation_version VARCHAR(32) NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, week_start_date)
);

CREATE TABLE IF NOT EXISTS meal_intake_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  daily_plan_id UUID NOT NULL REFERENCES daily_plans(id) ON DELETE CASCADE,
  meal_type VARCHAR(16) NOT NULL,
  source VARCHAR(32) NOT NULL DEFAULT 'food_library',
  food_code VARCHAR(64) NOT NULL,
  food_name_snapshot VARCHAR(128) NOT NULL,
  portion_size VARCHAR(16) NOT NULL,
  calories INT NOT NULL,
  protein_g INT NOT NULL,
  carb_g INT NOT NULL,
  fat_g INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (daily_plan_id, meal_type)
);

CREATE TABLE IF NOT EXISTS food_library_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code VARCHAR(64) NOT NULL UNIQUE,
  name VARCHAR(128) NOT NULL,
  aliases JSONB NOT NULL DEFAULT '[]'::jsonb,
  scene_tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  suggested_meal_types JSONB NOT NULL DEFAULT '[]'::jsonb,
  calories INT NOT NULL,
  protein_g INT NOT NULL,
  carb_g INT NOT NULL,
  fat_g INT NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'active',
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE users ALTER COLUMN avatar_url DROP NOT NULL;
ALTER TABLE users ALTER COLUMN avatar_url DROP DEFAULT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS training_cycle_start_focus VARCHAR(16);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS training_cycle_reset_at TIMESTAMPTZ;
ALTER TABLE check_ins ALTER COLUMN note DROP NOT NULL;
ALTER TABLE check_ins ALTER COLUMN note DROP DEFAULT;
`;

const client = new Client({
  host: postgresHost,
  port: postgresPort,
  user: postgresUser,
  password: postgresPassword,
  database: postgresDatabase,
});

async function main() {
  await client.connect();
  await client.query(extensionsSql);
  await client.query(baseSchemaSql);
  await client.query(patchSql);
  console.log('[CampusFit DB] 本机数据库 Schema 已同步。');
}

main()
  .catch((error) => {
    console.error('[CampusFit DB] Schema 同步失败。');
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(async () => {
    await client.end().catch(() => undefined);
  });
