-- ============================================================
-- KoachApp Meal Plan Schema
-- Creates tables for foods, meals, meal plans + RLS + seed data
-- ============================================================

-- ── Foods (ingredient library, macros per 100g) ─────────────
CREATE TABLE foods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  calories_per_100g numeric(7,2) NOT NULL DEFAULT 0,
  protein_per_100g numeric(7,2) NOT NULL DEFAULT 0,
  carbs_per_100g numeric(7,2) NOT NULL DEFAULT 0,
  fat_per_100g numeric(7,2) NOT NULL DEFAULT 0,
  category text,
  is_preset boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ── Meals (named meal templates) ────────────────────────────
CREATE TABLE meals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  notes text,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ── Meal Foods (ingredients in a meal) ──────────────────────
CREATE TABLE meal_foods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_id uuid NOT NULL REFERENCES meals(id) ON DELETE CASCADE,
  food_id uuid NOT NULL REFERENCES foods(id) ON DELETE RESTRICT,
  quantity_g numeric(7,2) NOT NULL,
  sort_order int NOT NULL DEFAULT 0
);

-- ── Meal Plans (7-day template per client) ──────────────────
CREATE TABLE meal_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT false,
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ── Meal Plan Entries (meal assigned to day + slot) ─────────
CREATE TABLE meal_plan_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_plan_id uuid NOT NULL REFERENCES meal_plans(id) ON DELETE CASCADE,
  day_of_week int NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
  slot_number int NOT NULL,
  meal_id uuid NOT NULL REFERENCES meals(id) ON DELETE RESTRICT,
  UNIQUE (meal_plan_id, day_of_week, slot_number)
);

-- ── Meal Plan Overrides (date-specific slot overrides) ──────
CREATE TABLE meal_plan_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  override_date date NOT NULL,
  slot_number int NOT NULL,
  meal_id uuid NOT NULL REFERENCES meals(id) ON DELETE RESTRICT,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  UNIQUE (client_id, override_date, slot_number)
);

-- ── Alter daily_logs ────────────────────────────────────────
ALTER TABLE daily_logs ADD COLUMN IF NOT EXISTS followed_meal_plan boolean;

-- ── Indexes ─────────────────────────────────────────────────
CREATE INDEX idx_foods_category ON foods(category);
CREATE INDEX idx_meal_foods_meal_id ON meal_foods(meal_id);
CREATE INDEX idx_meal_plan_entries_plan_day ON meal_plan_entries(meal_plan_id, day_of_week);
CREATE INDEX idx_meal_plan_overrides_client_date ON meal_plan_overrides(client_id, override_date);
CREATE INDEX idx_meal_plans_client_active ON meal_plans(client_id, is_active);

-- ── Enable RLS ──────────────────────────────────────────────
ALTER TABLE foods ENABLE ROW LEVEL SECURITY;
ALTER TABLE meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_foods ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_plan_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_plan_overrides ENABLE ROW LEVEL SECURITY;

-- ── RLS: Foods ──────────────────────────────────────────────
-- All authenticated users can read foods
CREATE POLICY "Authenticated users can read foods"
  ON foods FOR SELECT
  USING (auth.role() = 'authenticated');

-- Coach can manage foods
CREATE POLICY "Coach can manage foods"
  ON foods FOR ALL
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

-- ── RLS: Meals ──────────────────────────────────────────────
-- All authenticated users can read meals
CREATE POLICY "Authenticated users can read meals"
  ON meals FOR SELECT
  USING (auth.role() = 'authenticated');

-- Coach can manage meals
CREATE POLICY "Coach can manage meals"
  ON meals FOR ALL
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

-- ── RLS: Meal Foods ─────────────────────────────────────────
-- Accessible if user can access the parent meal
CREATE POLICY "Users can read meal foods via meal"
  ON meal_foods FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM meals
      WHERE meals.id = meal_foods.meal_id
        AND auth.role() = 'authenticated'
    )
  );

-- Coach can manage meal foods via meal ownership
CREATE POLICY "Coach can manage meal foods"
  ON meal_foods FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM meals
      WHERE meals.id = meal_foods.meal_id
        AND meals.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM meals
      WHERE meals.id = meal_foods.meal_id
        AND meals.created_by = auth.uid()
    )
  );

-- ── RLS: Meal Plans ─────────────────────────────────────────
-- Clients can read their own meal plans
CREATE POLICY "Clients can read own meal plans"
  ON meal_plans FOR SELECT
  USING (auth.uid() = client_id);

-- Coach can manage meal plans for their clients
CREATE POLICY "Coach can manage client meal plans"
  ON meal_plans FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = meal_plans.client_id
        AND clients.coach_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = meal_plans.client_id
        AND clients.coach_id = auth.uid()
    )
  );

-- ── RLS: Meal Plan Entries ──────────────────────────────────
-- Accessible if user can access the parent meal plan
CREATE POLICY "Users can access meal plan entries via plan"
  ON meal_plan_entries FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM meal_plans mp
      JOIN clients c ON c.id = mp.client_id
      WHERE mp.id = meal_plan_entries.meal_plan_id
        AND (c.id = auth.uid() OR c.coach_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM meal_plans mp
      JOIN clients c ON c.id = mp.client_id
      WHERE mp.id = meal_plan_entries.meal_plan_id
        AND c.coach_id = auth.uid()
    )
  );

-- ── RLS: Meal Plan Overrides ────────────────────────────────
-- Clients can read their own overrides
CREATE POLICY "Clients can read own meal plan overrides"
  ON meal_plan_overrides FOR SELECT
  USING (auth.uid() = client_id);

-- Coach can manage overrides for their clients
CREATE POLICY "Coach can manage client meal plan overrides"
  ON meal_plan_overrides FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = meal_plan_overrides.client_id
        AND clients.coach_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = meal_plan_overrides.client_id
        AND clients.coach_id = auth.uid()
    )
  );

-- ============================================================
-- Seed Data: ~60 common foods (per 100g)
-- created_by = coach UUID
-- ============================================================

DO $$
DECLARE
  coach_id uuid := '6d23b92f-99c2-40a9-9014-2dcd417250a2';
BEGIN

-- ── Meso / Riba (Meat / Fish) ───────────────────────────────
INSERT INTO foods (name, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, category, is_preset, created_by) VALUES
('Piletina prsa', 165, 31, 0, 3.6, 'Meso/Riba', true, coach_id),
('Piletina batak', 209, 26, 0, 10.9, 'Meso/Riba', true, coach_id),
('Puretina prsa', 135, 30, 0, 1, 'Meso/Riba', true, coach_id),
('Govedina mljevena (10% masti)', 176, 20, 0, 10, 'Meso/Riba', true, coach_id),
('Govedina biftek', 271, 26, 0, 18, 'Meso/Riba', true, coach_id),
('Svinjetina file', 143, 26, 0, 3.5, 'Meso/Riba', true, coach_id),
('Tuna (konzerva u vodi)', 116, 26, 0, 0.8, 'Meso/Riba', true, coach_id),
('Losos', 208, 20, 0, 13, 'Meso/Riba', true, coach_id),
('Bijela riba (oslić)', 90, 18, 0, 1.3, 'Meso/Riba', true, coach_id),
('Škampi', 99, 24, 0, 0.3, 'Meso/Riba', true, coach_id);

-- ── Jaja (Eggs) ─────────────────────────────────────────────
INSERT INTO foods (name, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, category, is_preset, created_by) VALUES
('Jaja (cijela)', 155, 13, 1.1, 11, 'Jaja', true, coach_id),
('Bjelanjak', 52, 11, 0.7, 0.2, 'Jaja', true, coach_id);

-- ── Mliječni (Dairy) ────────────────────────────────────────
INSERT INTO foods (name, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, category, is_preset, created_by) VALUES
('Mlijeko (1.5%)', 47, 3.4, 4.8, 1.5, 'Mliječni', true, coach_id),
('Jogurt (prirodni)', 61, 3.5, 4.7, 3.3, 'Mliječni', true, coach_id),
('Skyr', 63, 11, 4, 0.2, 'Mliječni', true, coach_id),
('Sir cottage', 98, 11, 3.4, 4.3, 'Mliječni', true, coach_id),
('Sir gauda', 356, 25, 2.2, 27, 'Mliječni', true, coach_id),
('Mozzarella', 280, 28, 3.1, 17, 'Mliječni', true, coach_id),
('Whey protein (prah)', 400, 80, 8, 6, 'Mliječni', true, coach_id),
('Grčki jogurt (0%)', 59, 10, 3.6, 0.4, 'Mliječni', true, coach_id);

-- ── Žitarice (Grains) ──────────────────────────────────────
INSERT INTO foods (name, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, category, is_preset, created_by) VALUES
('Riža bijela (kuhana)', 130, 2.7, 28, 0.3, 'Žitarice', true, coach_id),
('Riža smeđa (kuhana)', 123, 2.6, 26, 0.9, 'Žitarice', true, coach_id),
('Zobene pahuljice', 379, 13.2, 67, 6.5, 'Žitarice', true, coach_id),
('Kruh integralni', 250, 9, 43, 3.5, 'Žitarice', true, coach_id),
('Tjestenina (kuhana)', 131, 5, 25, 1.1, 'Žitarice', true, coach_id),
('Kuskus (kuhan)', 112, 3.8, 23, 0.2, 'Žitarice', true, coach_id),
('Kinoa (kuhana)', 120, 4.4, 21, 1.9, 'Žitarice', true, coach_id),
('Tortilja (pšenična)', 312, 8.5, 52, 8, 'Žitarice', true, coach_id);

-- ── Mahunarke (Legumes) ─────────────────────────────────────
INSERT INTO foods (name, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, category, is_preset, created_by) VALUES
('Leća (kuhana)', 116, 9, 20, 0.4, 'Mahunarke', true, coach_id),
('Grah (kuhan)', 127, 8.7, 23, 0.5, 'Mahunarke', true, coach_id),
('Slanutak (kuhan)', 164, 8.9, 27, 2.6, 'Mahunarke', true, coach_id),
('Edamame', 121, 11.9, 8.6, 5.2, 'Mahunarke', true, coach_id);

-- ── Voće (Fruit) ────────────────────────────────────────────
INSERT INTO foods (name, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, category, is_preset, created_by) VALUES
('Banana', 89, 1.1, 23, 0.3, 'Voće', true, coach_id),
('Jabuka', 52, 0.3, 14, 0.2, 'Voće', true, coach_id),
('Naranča', 47, 0.9, 12, 0.1, 'Voće', true, coach_id),
('Jagode', 32, 0.7, 7.7, 0.3, 'Voće', true, coach_id),
('Borovnice', 57, 0.7, 14, 0.3, 'Voće', true, coach_id),
('Kivi', 61, 1.1, 15, 0.5, 'Voće', true, coach_id);

-- ── Povrće (Vegetables) ─────────────────────────────────────
INSERT INTO foods (name, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, category, is_preset, created_by) VALUES
('Brokula', 34, 2.8, 7, 0.4, 'Povrće', true, coach_id),
('Špinat', 23, 2.9, 3.6, 0.4, 'Povrće', true, coach_id),
('Rajčica', 18, 0.9, 3.9, 0.2, 'Povrće', true, coach_id),
('Krastavac', 15, 0.7, 3.6, 0.1, 'Povrće', true, coach_id),
('Paprika (crvena)', 31, 1, 6, 0.3, 'Povrće', true, coach_id),
('Mrkva', 41, 0.9, 10, 0.2, 'Povrće', true, coach_id),
('Krumpir', 77, 2, 17, 0.1, 'Povrće', true, coach_id),
('Batat', 86, 1.6, 20, 0.1, 'Povrće', true, coach_id),
('Tikvice', 17, 1.2, 3.1, 0.3, 'Povrće', true, coach_id),
('Luk', 40, 1.1, 9.3, 0.1, 'Povrće', true, coach_id);

-- ── Masti / Ulja (Fats / Oils) ──────────────────────────────
INSERT INTO foods (name, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, category, is_preset, created_by) VALUES
('Maslinovo ulje', 884, 0, 0, 100, 'Masti/Ulja', true, coach_id),
('Maslac', 717, 0.9, 0.1, 81, 'Masti/Ulja', true, coach_id),
('Bademi', 579, 21, 22, 49, 'Masti/Ulja', true, coach_id),
('Kikiriki maslac', 588, 25, 20, 50, 'Masti/Ulja', true, coach_id),
('Avokado', 160, 2, 9, 15, 'Masti/Ulja', true, coach_id),
('Orasi', 654, 15, 14, 65, 'Masti/Ulja', true, coach_id),
('Kokosovo ulje', 862, 0, 0, 100, 'Masti/Ulja', true, coach_id);

-- ── Ostalo (Other) ──────────────────────────────────────────
INSERT INTO foods (name, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, category, is_preset, created_by) VALUES
('Med', 304, 0.3, 82, 0, 'Ostalo', true, coach_id),
('Tamna čokolada (70%)', 598, 7.8, 46, 43, 'Ostalo', true, coach_id),
('Hummus', 166, 7.9, 14, 9.6, 'Ostalo', true, coach_id),
('Majoneza', 680, 1, 0.6, 75, 'Ostalo', true, coach_id);

END $$;
