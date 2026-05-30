-- ============================================================
-- KoachApp Weekly Reports
-- One coach-reviewed AI report per client per week (Mon–Sun).
-- ============================================================

CREATE TABLE weekly_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  coach_id uuid NOT NULL REFERENCES profiles(id),
  week_start date NOT NULL,                 -- Monday
  week_end date NOT NULL,                    -- Sunday
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'published')),
  language text NOT NULL DEFAULT 'hr'
    CHECK (language IN ('hr', 'en')),
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  flags jsonb NOT NULL DEFAULT '[]'::jsonb,
  client_summary text,
  coach_summary text,
  coach_note text,
  ai_model text,
  ai_generated_at timestamptz,
  generated_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (client_id, week_start)
);

CREATE INDEX idx_weekly_reports_coach_week
  ON weekly_reports (coach_id, week_start DESC);
CREATE INDEX idx_weekly_reports_client_status
  ON weekly_reports (client_id, status, week_start DESC);

ALTER TABLE weekly_reports ENABLE ROW LEVEL SECURITY;

-- Coach: full access to their clients' reports (all statuses)
CREATE POLICY "Coach manages own client reports"
  ON weekly_reports FOR ALL
  USING (auth.uid() = coach_id)
  WITH CHECK (auth.uid() = coach_id);

-- Client: read only their own PUBLISHED reports
CREATE POLICY "Client reads own published reports"
  ON weekly_reports FOR SELECT
  USING (auth.uid() = client_id AND status = 'published');
