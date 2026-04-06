-- ============================================================
-- KoachApp RLS Policies
-- Run this migration to enable Row Level Security on all tables.
-- This prevents direct Supabase API access from bypassing auth.
-- ============================================================

-- ── Enable RLS on all tables ─────────────────────────────────
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE progress_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE program_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- ── Profiles ─────────────────────────────────────────────────
-- Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Coach can read all profiles
CREATE POLICY "Coach can read all profiles"
  ON profiles FOR SELECT
  USING (auth.uid() = current_setting('app.coach_uuid', true)::uuid);

-- ── Clients ──────────────────────────────────────────────────
-- Clients can read their own row
CREATE POLICY "Clients can read own record"
  ON clients FOR SELECT
  USING (auth.uid() = id);

-- Coach can read/manage their own clients
CREATE POLICY "Coach can read own clients"
  ON clients FOR SELECT
  USING (auth.uid() = coach_id);

CREATE POLICY "Coach can insert clients"
  ON clients FOR INSERT
  WITH CHECK (auth.uid() = coach_id);

CREATE POLICY "Coach can update own clients"
  ON clients FOR UPDATE
  USING (auth.uid() = coach_id);

-- ── Daily Logs ───────────────────────────────────────────────
-- Clients can manage their own logs
CREATE POLICY "Clients can manage own logs"
  ON daily_logs FOR ALL
  USING (auth.uid() = client_id)
  WITH CHECK (auth.uid() = client_id);

-- Coach can read logs of their clients
CREATE POLICY "Coach can read client logs"
  ON daily_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = daily_logs.client_id
        AND clients.coach_id = auth.uid()
    )
  );

-- ── Checkins ─────────────────────────────────────────────────
CREATE POLICY "Clients can manage own checkins"
  ON checkins FOR ALL
  USING (auth.uid() = client_id)
  WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Coach can read client checkins"
  ON checkins FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = checkins.client_id
        AND clients.coach_id = auth.uid()
    )
  );

-- ── Progress Photos ──────────────────────────────────────────
CREATE POLICY "Clients can manage own photos"
  ON progress_photos FOR ALL
  USING (auth.uid() = client_id)
  WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Coach can read client photos"
  ON progress_photos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = progress_photos.client_id
        AND clients.coach_id = auth.uid()
    )
  );

-- ── Workout Programs ─────────────────────────────────────────
-- Clients can read their own programs
CREATE POLICY "Clients can read own programs"
  ON workout_programs FOR SELECT
  USING (auth.uid() = client_id);

-- Coach can manage programs for their clients
CREATE POLICY "Coach can manage client programs"
  ON workout_programs FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = workout_programs.client_id
        AND clients.coach_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = workout_programs.client_id
        AND clients.coach_id = auth.uid()
    )
  );

-- ── Program Days ─────────────────────────────────────────────
-- Accessible if user can access the parent program
CREATE POLICY "Users can access program days via program"
  ON program_days FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM workout_programs wp
      JOIN clients c ON c.id = wp.client_id
      WHERE wp.id = program_days.program_id
        AND (c.id = auth.uid() OR c.coach_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workout_programs wp
      JOIN clients c ON c.id = wp.client_id
      WHERE wp.id = program_days.program_id
        AND c.coach_id = auth.uid()
    )
  );

-- ── Program Exercises ────────────────────────────────────────
CREATE POLICY "Users can access program exercises via day"
  ON program_exercises FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM program_days pd
      JOIN workout_programs wp ON wp.id = pd.program_id
      JOIN clients c ON c.id = wp.client_id
      WHERE pd.id = program_exercises.day_id
        AND (c.id = auth.uid() OR c.coach_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM program_days pd
      JOIN workout_programs wp ON wp.id = pd.program_id
      JOIN clients c ON c.id = wp.client_id
      WHERE pd.id = program_exercises.day_id
        AND c.coach_id = auth.uid()
    )
  );

-- ── Workout Sessions ─────────────────────────────────────────
CREATE POLICY "Clients can manage own sessions"
  ON workout_sessions FOR ALL
  USING (auth.uid() = client_id)
  WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Coach can read client sessions"
  ON workout_sessions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = workout_sessions.client_id
        AND clients.coach_id = auth.uid()
    )
  );

-- ── Exercise Logs ────────────────────────────────────────────
CREATE POLICY "Users can manage exercise logs via session"
  ON exercise_logs FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM workout_sessions ws
      WHERE ws.id = exercise_logs.session_id
        AND ws.client_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workout_sessions ws
      WHERE ws.id = exercise_logs.session_id
        AND ws.client_id = auth.uid()
    )
  );

CREATE POLICY "Coach can read exercise logs"
  ON exercise_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workout_sessions ws
      JOIN clients c ON c.id = ws.client_id
      WHERE ws.id = exercise_logs.session_id
        AND c.coach_id = auth.uid()
    )
  );

-- ── Exercises (shared library) ───────────────────────────────
-- Everyone authenticated can read exercises
CREATE POLICY "Authenticated users can read exercises"
  ON exercises FOR SELECT
  USING (auth.role() = 'authenticated');

-- Only coach can manage exercises
CREATE POLICY "Coach can manage exercises"
  ON exercises FOR ALL
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

-- ── Phases ───────────────────────────────────────────────────
CREATE POLICY "Clients can read own phases"
  ON phases FOR SELECT
  USING (auth.uid() = client_id);

CREATE POLICY "Coach can manage client phases"
  ON phases FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = phases.client_id
        AND clients.coach_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = phases.client_id
        AND clients.coach_id = auth.uid()
    )
  );

-- ── Push Subscriptions ───────────────────────────────────────
CREATE POLICY "Clients can manage own push subscriptions"
  ON push_subscriptions FOR ALL
  USING (auth.uid() = client_id)
  WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Coach can read client push subscriptions"
  ON push_subscriptions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM clients
      WHERE clients.id = push_subscriptions.client_id
        AND clients.coach_id = auth.uid()
    )
  );
