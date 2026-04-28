CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nickname VARCHAR(64) NOT NULL,
  avatar_url TEXT NOT NULL DEFAULT '',
  status VARCHAR(32) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS data_deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status VARCHAR(32) NOT NULL DEFAULT 'pending',
  reason TEXT,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_data_deletion_requests_user_status
  ON data_deletion_requests(user_id, status);

CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  gender VARCHAR(16) NOT NULL,
  birth_year INT NOT NULL,
  height_cm NUMERIC(5, 2) NOT NULL,
  current_weight_kg NUMERIC(5, 2) NOT NULL,
  target_type VARCHAR(16) NOT NULL,
  activity_level VARCHAR(32) NOT NULL,
  training_experience VARCHAR(32) NOT NULL,
  training_days_per_week INT NOT NULL,
  diet_scene VARCHAR(32) NOT NULL,
  diet_preferences JSONB NOT NULL DEFAULT '[]'::jsonb,
  diet_restrictions JSONB NOT NULL DEFAULT '[]'::jsonb,
  supplement_opt_in BOOLEAN NOT NULL DEFAULT FALSE,
  onboarding_completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS daily_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_date DATE NOT NULL,
  calorie_target INT NOT NULL,
  protein_target_g INT NOT NULL,
  carb_target_g INT NOT NULL,
  fat_target_g INT NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'active',
  generation_source VARCHAR(32) NOT NULL DEFAULT 'rule_engine',
  generation_version VARCHAR(32) NOT NULL DEFAULT 'v0',
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, plan_date)
);

CREATE TABLE IF NOT EXISTS diet_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_plan_id UUID NOT NULL UNIQUE REFERENCES daily_plans(id) ON DELETE CASCADE,
  scene VARCHAR(32) NOT NULL,
  summary TEXT NOT NULL,
  supplement_notes JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS diet_plan_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  diet_plan_id UUID NOT NULL REFERENCES diet_plans(id) ON DELETE CASCADE,
  meal_type VARCHAR(16) NOT NULL,
  title VARCHAR(128) NOT NULL,
  target_calories INT NOT NULL,
  protein_g INT NOT NULL,
  carbs_g INT NOT NULL,
  fat_g INT NOT NULL,
  suggestion_text TEXT NOT NULL,
  alternatives JSONB NOT NULL DEFAULT '[]'::jsonb,
  display_order INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS training_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_plan_id UUID NOT NULL UNIQUE REFERENCES daily_plans(id) ON DELETE CASCADE,
  split_type VARCHAR(32) NOT NULL,
  title VARCHAR(128) NOT NULL,
  duration_minutes INT NOT NULL,
  intensity_level VARCHAR(16) NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS training_plan_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  training_plan_id UUID NOT NULL REFERENCES training_plans(id) ON DELETE CASCADE,
  exercise_code VARCHAR(64) NOT NULL,
  exercise_name VARCHAR(128) NOT NULL,
  sets INT NOT NULL,
  reps VARCHAR(32) NOT NULL,
  rest_seconds INT NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  display_order INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_training_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(128) NOT NULL,
  status VARCHAR(32) NOT NULL DEFAULT 'active',
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_training_templates_user_status_enabled
  ON user_training_templates(user_id, status, is_enabled);

CREATE INDEX IF NOT EXISTS idx_user_training_templates_user_default
  ON user_training_templates(user_id, is_default);

CREATE TABLE IF NOT EXISTS user_training_template_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES user_training_templates(id) ON DELETE CASCADE,
  weekday VARCHAR(16) NOT NULL,
  day_type VARCHAR(16) NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  day_index INT NOT NULL,
  split_type VARCHAR(32),
  title VARCHAR(128) NOT NULL,
  duration_minutes INT,
  intensity_level VARCHAR(16),
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (template_id, weekday)
);

CREATE INDEX IF NOT EXISTS idx_user_training_template_days_template_sort
  ON user_training_template_days(template_id, sort_order);

CREATE TABLE IF NOT EXISTS user_training_template_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_day_id UUID NOT NULL REFERENCES user_training_template_days(id) ON DELETE CASCADE,
  exercise_code VARCHAR(64) NOT NULL,
  exercise_name VARCHAR(128) NOT NULL,
  sets INT NOT NULL,
  reps VARCHAR(32) NOT NULL,
  rest_seconds INT NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  display_order INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS daily_training_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  daily_plan_id UUID NOT NULL REFERENCES daily_plans(id) ON DELETE CASCADE,
  status VARCHAR(32) NOT NULL DEFAULT 'active',
  source_weekday VARCHAR(16),
  source_template_id UUID REFERENCES user_training_templates(id) ON DELETE SET NULL,
  source_template_day_id UUID REFERENCES user_training_template_days(id) ON DELETE SET NULL,
  split_type VARCHAR(32) NOT NULL,
  title VARCHAR(128) NOT NULL,
  duration_minutes INT NOT NULL,
  intensity_level VARCHAR(16) NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_daily_training_overrides_user_plan_status
  ON daily_training_overrides(user_id, daily_plan_id, status);

CREATE INDEX IF NOT EXISTS idx_daily_training_overrides_plan_status
  ON daily_training_overrides(daily_plan_id, status);

CREATE TABLE IF NOT EXISTS daily_training_override_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_training_override_id UUID NOT NULL REFERENCES daily_training_overrides(id) ON DELETE CASCADE,
  source_template_item_id UUID REFERENCES user_training_template_items(id) ON DELETE SET NULL,
  exercise_code VARCHAR(64) NOT NULL,
  exercise_name VARCHAR(128) NOT NULL,
  sets INT NOT NULL,
  reps VARCHAR(32) NOT NULL,
  rest_seconds INT NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  display_order INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS check_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  daily_plan_id UUID NOT NULL REFERENCES daily_plans(id) ON DELETE CASCADE,
  checkin_date DATE NOT NULL,
  diet_completion_rate INT NOT NULL,
  training_completion_rate INT NOT NULL,
  water_intake_ml INT,
  step_count INT,
  weight_kg NUMERIC(5, 2),
  energy_level INT NOT NULL,
  satiety_level INT NOT NULL,
  fatigue_level INT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, checkin_date)
);

CREATE TABLE IF NOT EXISTS product_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(64) NOT NULL,
  slug VARCHAR(64) NOT NULL UNIQUE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES product_categories(id) ON DELETE CASCADE,
  name VARCHAR(128) NOT NULL,
  subtitle VARCHAR(255) NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  target_tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  scene_tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  price_cents INT NOT NULL,
  cover_image_url TEXT NOT NULL DEFAULT '',
  detail_images JSONB NOT NULL DEFAULT '[]'::jsonb,
  status VARCHAR(32) NOT NULL DEFAULT 'active',
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(128) NOT NULL DEFAULT '',
  context JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ai_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES ai_conversations(id) ON DELETE CASCADE,
  role VARCHAR(16) NOT NULL,
  content TEXT NOT NULL,
  citations JSONB NOT NULL DEFAULT '[]'::jsonb,
  trace JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
