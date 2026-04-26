INSERT INTO users (id, nickname, avatar_url, status)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  '演示用户',
  'https://example.com/avatar-demo.png',
  'active'
)
ON CONFLICT (id) DO UPDATE
SET nickname = EXCLUDED.nickname,
    avatar_url = EXCLUDED.avatar_url,
    status = EXCLUDED.status,
    updated_at = NOW();

INSERT INTO user_profiles (
  id,
  user_id,
  gender,
  birth_year,
  height_cm,
  current_weight_kg,
  target_type,
  activity_level,
  training_experience,
  training_days_per_week,
  diet_scene,
  diet_preferences,
  diet_restrictions,
  supplement_opt_in,
  onboarding_completed_at
)
VALUES (
  '10000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'male',
  2004,
  175.00,
  72.00,
  'cut',
  'moderate',
  'beginner',
  3,
  'canteen',
  '["high_protein"]'::jsonb,
  '["peanut"]'::jsonb,
  TRUE,
  NOW()
)
ON CONFLICT (id) DO UPDATE
SET gender = EXCLUDED.gender,
    birth_year = EXCLUDED.birth_year,
    height_cm = EXCLUDED.height_cm,
    current_weight_kg = EXCLUDED.current_weight_kg,
    target_type = EXCLUDED.target_type,
    activity_level = EXCLUDED.activity_level,
    training_experience = EXCLUDED.training_experience,
    training_days_per_week = EXCLUDED.training_days_per_week,
    diet_scene = EXCLUDED.diet_scene,
    diet_preferences = EXCLUDED.diet_preferences,
    diet_restrictions = EXCLUDED.diet_restrictions,
    supplement_opt_in = EXCLUDED.supplement_opt_in,
    onboarding_completed_at = EXCLUDED.onboarding_completed_at,
    updated_at = NOW();

INSERT INTO daily_plans (
  id,
  user_id,
  plan_date,
  calorie_target,
  protein_target_g,
  carb_target_g,
  fat_target_g,
  status,
  generation_source,
  generation_version,
  generated_at
)
VALUES (
  '20000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  CURRENT_DATE,
  2100,
  140,
  220,
  60,
  'active',
  'rule_engine',
  'seed-v1',
  NOW()
)
ON CONFLICT (id) DO UPDATE
SET plan_date = EXCLUDED.plan_date,
    calorie_target = EXCLUDED.calorie_target,
    protein_target_g = EXCLUDED.protein_target_g,
    carb_target_g = EXCLUDED.carb_target_g,
    fat_target_g = EXCLUDED.fat_target_g,
    status = EXCLUDED.status,
    generation_source = EXCLUDED.generation_source,
    generation_version = EXCLUDED.generation_version,
    generated_at = EXCLUDED.generated_at,
    updated_at = NOW();

INSERT INTO diet_plans (
  id,
  daily_plan_id,
  scene,
  summary,
  supplement_notes
)
VALUES (
  '30000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001',
  'canteen',
  '食堂减脂日方案，优先高蛋白低油脂搭配。',
  '["乳清蛋白 1 勺"]'::jsonb
)
ON CONFLICT (id) DO UPDATE
SET scene = EXCLUDED.scene,
    summary = EXCLUDED.summary,
    supplement_notes = EXCLUDED.supplement_notes,
    updated_at = NOW();

DELETE FROM diet_plan_items
WHERE diet_plan_id = '30000000-0000-0000-0000-000000000001';

INSERT INTO diet_plan_items (
  id,
  diet_plan_id,
  meal_type,
  title,
  target_calories,
  protein_g,
  carbs_g,
  fat_g,
  suggestion_text,
  alternatives,
  display_order
)
VALUES
  (
    '31000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000001',
    'breakfast',
    '早餐：鸡蛋 + 玉米 + 无糖豆浆',
    450,
    30,
    45,
    12,
    '优先保证蛋白质，主食控制在一拳头以内。',
    '["全麦面包", "低糖酸奶"]'::jsonb,
    1
  ),
  (
    '31000000-0000-0000-0000-000000000002',
    '30000000-0000-0000-0000-000000000001',
    'lunch',
    '午餐：鸡胸肉 + 米饭 + 两份蔬菜',
    700,
    45,
    75,
    18,
    '食堂优先选择清蒸或少油档口。',
    '["瘦牛肉", "鱼排"]'::jsonb,
    2
  ),
  (
    '31000000-0000-0000-0000-000000000003',
    '30000000-0000-0000-0000-000000000001',
    'dinner',
    '晚餐：牛肉片 + 南瓜 + 青菜',
    650,
    45,
    60,
    20,
    '晚餐控制脂肪，避免夜宵。',
    '["鸡腿去皮", "虾仁"]'::jsonb,
    3
  );

INSERT INTO training_plans (
  id,
  daily_plan_id,
  split_type,
  title,
  duration_minutes,
  intensity_level,
  notes
)
VALUES (
  '40000000-0000-0000-0000-000000000001',
  '20000000-0000-0000-0000-000000000001',
  'full_body',
  '全身训练 A',
  60,
  'medium',
  '先热身 10 分钟，再完成主训练。'
)
ON CONFLICT (id) DO UPDATE
SET split_type = EXCLUDED.split_type,
    title = EXCLUDED.title,
    duration_minutes = EXCLUDED.duration_minutes,
    intensity_level = EXCLUDED.intensity_level,
    notes = EXCLUDED.notes,
    updated_at = NOW();

DELETE FROM training_plan_items
WHERE training_plan_id = '40000000-0000-0000-0000-000000000001';

INSERT INTO training_plan_items (
  id,
  training_plan_id,
  exercise_code,
  exercise_name,
  sets,
  reps,
  rest_seconds,
  notes,
  display_order
)
VALUES
  (
    '41000000-0000-0000-0000-000000000001',
    '40000000-0000-0000-0000-000000000001',
    'goblet_squat',
    '高脚杯深蹲',
    4,
    '10-12',
    90,
    '保持核心收紧，避免膝盖内扣。',
    1
  ),
  (
    '41000000-0000-0000-0000-000000000002',
    '40000000-0000-0000-0000-000000000001',
    'push_up',
    '俯卧撑',
    4,
    '8-12',
    60,
    '全程控制下降速度。',
    2
  ),
  (
    '41000000-0000-0000-0000-000000000003',
    '40000000-0000-0000-0000-000000000001',
    'dumbbell_row',
    '哑铃划船',
    4,
    '10-12',
    75,
    '发力时先收肩胛，再拉肘。',
    3
  );

INSERT INTO product_categories (id, name, slug, sort_order)
VALUES
  ('50000000-0000-0000-0000-000000000001', '补剂推荐', 'supplement', 1),
  ('50000000-0000-0000-0000-000000000002', '便捷轻食', 'ready-meal', 2)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    slug = EXCLUDED.slug,
    sort_order = EXCLUDED.sort_order,
    updated_at = NOW();

INSERT INTO products (
  id,
  category_id,
  name,
  subtitle,
  description,
  target_tags,
  scene_tags,
  price_cents,
  cover_image_url,
  detail_images,
  status,
  sort_order
)
VALUES
  (
    '60000000-0000-0000-0000-000000000001',
    '50000000-0000-0000-0000-000000000001',
    '乳清蛋白基础款',
    '适合训练后补充',
    '适合减脂和增肌阶段的基础蛋白补充。',
    '["cut", "maintain", "bulk"]'::jsonb,
    '["canteen", "dorm"]'::jsonb,
    12900,
    'https://example.com/product/protein.png',
    '["https://example.com/product/protein-detail.png"]'::jsonb,
    'active',
    1
  ),
  (
    '60000000-0000-0000-0000-000000000002',
    '50000000-0000-0000-0000-000000000002',
    '高蛋白鸡胸便当',
    '适合晚自习前快速补餐',
    '低油低脂，适合校园场景的快速正餐。',
    '["cut", "maintain"]'::jsonb,
    '["dorm", "library"]'::jsonb,
    2590,
    'https://example.com/product/meal.png',
    '["https://example.com/product/meal-detail.png"]'::jsonb,
    'active',
    2
  )
ON CONFLICT (id) DO UPDATE
SET category_id = EXCLUDED.category_id,
    name = EXCLUDED.name,
    subtitle = EXCLUDED.subtitle,
    description = EXCLUDED.description,
    target_tags = EXCLUDED.target_tags,
    scene_tags = EXCLUDED.scene_tags,
    price_cents = EXCLUDED.price_cents,
    cover_image_url = EXCLUDED.cover_image_url,
    detail_images = EXCLUDED.detail_images,
    status = EXCLUDED.status,
    sort_order = EXCLUDED.sort_order,
    updated_at = NOW();
