-- Enable Supabase Realtime broadcast for coach<->client messages.
-- RLS already restricts delivery (client sees own thread; coach sees all),
-- so no policy changes are needed. Replica identity DEFAULT is sufficient:
-- INSERT/UPDATE payloads carry the new row, which is all the client needs.
alter publication supabase_realtime add table public.messages;
