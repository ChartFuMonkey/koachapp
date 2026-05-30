-- Coach-authored recommendations on a weekly report (filled at review time).
ALTER TABLE weekly_reports
  ADD COLUMN IF NOT EXISTS rec_training text,
  ADD COLUMN IF NOT EXISTS rec_nutrition text,
  ADD COLUMN IF NOT EXISTS rec_general text;
