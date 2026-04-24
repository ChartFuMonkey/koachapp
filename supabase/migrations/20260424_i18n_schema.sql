-- supabase/migrations/20260424_i18n_schema.sql
alter table profiles
  add column if not exists language text not null default 'hr'
  check (language in ('hr','en'));

alter table foods
  add column if not exists name_en text;

comment on column profiles.language is 'UI language for this user. hr | en.';
comment on column foods.name_en is 'English display name for pre-seeded foods. NULL for coach-created foods (fall back to name).';
