-- Bilingual exercises: add English translations (mirrors foods.name_en) so
-- exercise names + setup notes can display per-locale, the same way foods do.
-- Coach-created exercises may leave name_en/notes_en NULL and fall back to name/notes.

alter table public.exercises add column if not exists name_en text;
alter table public.exercises add column if not exists notes_en text;

comment on column public.exercises.name_en is 'English display name. NULL falls back to name (Croatian).';
comment on column public.exercises.notes_en is 'English setup notes. NULL falls back to notes (Croatian).';

-- Backfill the existing seed exercises so they are bilingual too.
update public.exercises set name_en = 'Squat',             notes_en = 'Knees tracking over toes, deep squat.'         where name = 'Čučanj (Squat)';
update public.exercises set name_en = 'Face Pull',         notes_en = 'Elbows high, squeeze the shoulder blades.'      where name = 'Facepull';
update public.exercises set name_en = 'Overhead Press',    notes_en = 'Core tight, no leaning back.'                   where name = 'Overhead Press';
update public.exercises set name_en = 'Bench Press',       notes_en = 'Shoulder blades retracted, controlled descent.' where name = 'Potisak s klupe';
update public.exercises set name_en = 'Romanian Deadlift', notes_en = 'Slight knee bend, feel the hamstring stretch.'   where name = 'Rumunjsko mrtvo dizanje';
update public.exercises set name_en = 'Pull-ups'                                                                       where name = 'Zgibovi';
update public.exercises set name_en = 'Antonio'                                                                        where name = 'Antonio';
