-- ============================================================================
-- Seed: public.foods  —  Shodamania Aesthetics Nutrition Database import
-- ----------------------------------------------------------------------------
-- Source CSV: "Shodamania Aesthetics Nutrition Database.csv" (~310 real rows).
-- All values stored PER 100 g.  Croatian `name` + English `name_en`.
-- is_preset = true ; created_by = '6d23b92f-99c2-40a9-9014-2dcd417250a2'.
--
-- Normalisation applied:
--   * g/ml @ 100 amount      -> macros copied as-is.
--   * g/ml @ other amount    -> macros x (100 / amount), rounded to 1 decimal
--                              (NO.255 canned tuna 112 g).
--   * per-piece staples converted to /100 g at standard weights:
--       bread roll/pecivo 50 g (NO.58), English muffin 60 g (NO.59),
--       Weetabix 19 g (NO.66), rice cake 9 g (NO.67), corn cake 9 g (NO.157).
--
-- Categories assigned by what each food IS (not the CSV PRO/CHO/FAT tag),
-- matching the existing library taxonomy:
--   'Meso/Riba','Jaja','Mliječni','Mahunarke','Povrće','Voće',
--   'Žitarice','Masti/Ulja','Ostalo'
--
-- Excluded (see migration notes / PR description):
--   * 60 foods already in the library (exact / obvious-duplicate names).
--   * 23 per-piece items held back (protein bars, puddings, deli slices,
--     branded single pieces, and all ready-made "obrok" meals).
--   * within-CSV duplicate names collapsed to a single row.
--
-- Trailing comment markers (-- NO.x) reference the source CSV row.
-- ============================================================================

insert into foods
  (name, name_en, category, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, is_preset, created_by)
values
-- ── Meso / Riba (meat, poultry, fish, seafood, organ & deli meats) ──────────
  ('Pileća prsa (kuhana)', 'Chicken breast (cooked)', 'Meso/Riba', 145, 32, 0, 1.9, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),        -- NO.1
  ('Pileća prsa (sirova)', 'Chicken breast (raw)', 'Meso/Riba', 106, 24, 0, 1.1, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),           -- NO.2
  ('Mljevena nemasna govedina (kuhana)', 'Lean ground beef (cooked)', 'Meso/Riba', 137, 24.7, 0, 4.2, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),  -- NO.3
  ('Mljevena nemasna govedina (sirova)', 'Lean ground beef (raw)', 'Meso/Riba', 125, 21.9, 0, 4.2, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),      -- NO.4
  ('Losos (kuhani)', 'Salmon (cooked)', 'Meso/Riba', 239, 24.6, 0, 15.6, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                   -- NO.5
  ('Losos (sirovi)', 'Salmon (raw)', 'Meso/Riba', 179, 22.1, 0, 10.1, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                      -- NO.6
  ('File odrezak (kuhani)', 'Beef fillet steak (cooked)', 'Meso/Riba', 188, 29.1, 0, 8, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),    -- NO.7
  ('File odrezak (sirovi)', 'Beef fillet steak (raw)', 'Meso/Riba', 140, 21.2, 0, 6.1, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),     -- NO.8
  ('Bakalar (kuhani)', 'Cod (cooked)', 'Meso/Riba', 106, 24.6, 0, 0.8, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                     -- NO.9
  ('Bakalar (sirovi)', 'Cod (raw)', 'Meso/Riba', 75, 17.5, 0, 0.6, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                         -- NO.10
  ('Bahnja (kuhana)', 'White fish (cooked)', 'Meso/Riba', 98, 23.9, 0, 0.3, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                -- NO.11
  ('Bahon (sirova)', 'White fish (raw)', 'Meso/Riba', 75, 17.8, 0, 0.4, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                    -- NO.12
  ('Razice (kuhane)', 'Crab (cooked)', 'Meso/Riba', 70, 15.4, 0, 0.9, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                      -- NO.13
  ('Razice (sirove)', 'Crab (raw)', 'Meso/Riba', 62, 14.1, 0, 0.5, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                         -- NO.14
  ('Tunjevina', 'Tuna', 'Meso/Riba', 109, 25, 0, 1, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                                        -- NO.15
  ('Pureća prsa (kuhana)', 'Turkey breast (cooked)', 'Meso/Riba', 155, 35, 0, 1.7, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),         -- NO.33
  ('Pureća prsa (sirova)', 'Turkey breast (raw)', 'Meso/Riba', 105, 22.6, 0, 1.6, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),          -- NO.34
  ('Goveđa jetra', 'Beef liver', 'Meso/Riba', 175, 26, 3, 5, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                               -- NO.208
  ('Pileća jetrica', 'Chicken liver', 'Meso/Riba', 165, 24, 3, 7, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                          -- NO.209
  ('Svinjska jetrica', 'Pork liver', 'Meso/Riba', 169, 21, 3, 9, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                           -- NO.210
  ('Janjeća jetrica', 'Lamb liver', 'Meso/Riba', 168, 27, 3, 6, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                            -- NO.211
  ('Patka', 'Duck', 'Meso/Riba', 337, 16.5, 0, 29.5, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                                       -- NO.213
  ('Srnetina', 'Venison', 'Meso/Riba', 158, 33, 0, 3, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                                      -- NO.214
  ('Zec', 'Rabbit', 'Meso/Riba', 173, 21.5, 0, 9, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                                          -- NO.215
  ('Emu', 'Emu', 'Meso/Riba', 100, 22, 0, 1, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                                               -- NO.216
  ('Guska', 'Goose', 'Meso/Riba', 238, 27.3, 0, 14, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                                        -- NO.217
  ('Noj', 'Ostrich', 'Meso/Riba', 112, 22, 0, 1, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                                           -- NO.218
  ('Lignje', 'Squid', 'Meso/Riba', 92, 18, 3, 1, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                                           -- NO.219
  ('Hobotnica', 'Octopus', 'Meso/Riba', 164, 24, 3, 8, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                                     -- NO.220
  ('Školjke', 'Clams', 'Meso/Riba', 148, 24, 4, 2, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                                         -- NO.221
  ('Dagnje', 'Mussels', 'Meso/Riba', 172, 24, 3, 6, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                                        -- NO.222
  ('Oslić', 'Hake', 'Meso/Riba', 90, 16.6, 0.5, 2.4, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                                       -- NO.235
  ('Tuna Sonnenblumenol', 'Tuna (in sunflower oil)', 'Meso/Riba', 245, 33.6, 0, 11.5, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),       -- NO.237
  ('Dimcek', 'Smoked deli meat', 'Meso/Riba', 94, 17, 2.7, 1, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                              -- NO.242
  ('Juneći but', 'Beef round (leg)', 'Meso/Riba', 142, 21.5, 0, 5, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                         -- NO.243
  ('Tuna u konzervi (Ocean)', 'Canned tuna (Ocean)', 'Meso/Riba', 108.9, 25.9, 0, 0.5, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),     -- NO.255 (112 g -> /100 g)
  ('Pureće mljeveno meso (Vindon)', 'Ground turkey (Vindon)', 'Meso/Riba', 118, 21, 0, 3.8, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),  -- NO.257
  ('File norveškog lososa (Blue Bay Kaufland)', 'Norwegian salmon fillet (Blue Bay Kaufland)', 'Meso/Riba', 208, 20, 0, 14, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),  -- NO.261
  ('Pureća šunka (Deluxe)', 'Turkey ham (Deluxe)', 'Meso/Riba', 108, 20, 3.5, 1.5, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),         -- NO.269
  ('Pileći zabatak (bez kože)', 'Chicken thigh (skinless)', 'Meso/Riba', 125, 19, 0, 4.5, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),  -- NO.279
  ('Dimljeni losos kare', 'Smoked salmon loin', 'Meso/Riba', 163, 40, 0.5, 0.08, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),           -- NO.297
  ('Ramstek', 'Rump steak', 'Meso/Riba', 243, 27, 0, 14, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                                   -- NO.299
-- ── Mliječni (dairy, cheese, protein powders & protein drinks) ──────────────
  ('Grčki jogurt (cijeli)', 'Greek yogurt (full-fat)', 'Mliječni', 117, 9.8, 3.8, 7, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),       -- NO.19
  ('Protein sirutke', 'Whey protein', 'Mliječni', 379, 90, 1.4, 1.5, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                       -- NO.21
  ('Veganski protein', 'Vegan protein powder', 'Mliječni', 358, 66, 10.3, 6.1, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),             -- NO.22
  ('Sojin protein', 'Soy protein powder', 'Mliječni', 387, 88, 1.4, 3.3, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                   -- NO.23
  ('Kazein bjelančevine', 'Casein protein powder', 'Mliječni', 377, 90, 1.4, 1.3, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),          -- NO.24
  ('Proteinsko mlijeko od vanilije', 'Protein milk (vanilla)', 'Mliječni', 50, 5.4, 4.8, 1, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),  -- NO.35
  ('Čokoladno proteinsko mlijeko', 'Chocolate protein milk', 'Mliječni', 53, 5.4, 5.7, 1, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),    -- NO.36
  ('Gold proteinsko mlijeko', 'Gold protein milk', 'Mliječni', 59, 6.6, 5.8, 1, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),            -- NO.37
  ('Proteinsko mlijeko od borovnice', 'Protein milk (blueberry)', 'Mliječni', 51, 5.4, 5.1, 1, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),  -- NO.38
  ('Proteinsko mlijeko', 'Protein milk', 'Mliječni', 49, 5.1, 4.8, 1, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                      -- NO.39
  ('Slimline mlijeko', 'Slimline milk (skimmed)', 'Mliječni', 39, 3.8, 5.3, 0.3, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),           -- NO.40
  ('Mlijeko s niskim udjelom masti', 'Low-fat milk', 'Mliječni', 42, 3.3, 5, 1, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),            -- NO.41
  ('Punomasno mlijeko', 'Whole milk', 'Mliječni', 64, 3.4, 4.9, 3.5, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                       -- NO.42
  ('Ispareno mlijeko', 'Evaporated milk', 'Mliječni', 133, 7.5, 10.5, 7.5, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                  -- NO.196
  ('Kondenzirano mlijeko', 'Condensed milk', 'Mliječni', 321, 7.5, 55, 8.5, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                -- NO.197
  ('Obrano mlijeko u prahu', 'Skimmed milk powder', 'Mliječni', 362, 34, 52, 1, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),            -- NO.198
  ('Punomasno mlijeko u prahu', 'Whole milk powder', 'Mliječni', 496, 26, 39, 26, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),          -- NO.199
  ('Kondenzirano mlijeko u prahu', 'Condensed milk powder', 'Mliječni', 486, 19, 50, 26, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),   -- NO.200
  ('Esencijalne aminokiseline', 'Essential amino acids (EAA)', 'Mliječni', 168, 42, 0, 0, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),  -- NO.130
  ('Sir', 'Cheese', 'Mliječni', 416, 25.4, 0.1, 34.9, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                                      -- NO.94
  ('Whey protein', 'Whey protein', 'Mliječni', 387, 73, 11.8, 5.3, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                         -- NO.227
  ('Zrnati sir k plus', 'Cottage cheese (K-Plus)', 'Mliječni', 92, 13, 1, 4, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),               -- NO.241
  ('Grčki jogurt', 'Greek yogurt', 'Mliječni', 136, 4, 5.8, 11, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                            -- NO.250
  ('Gauda sir', 'Gouda cheese', 'Mliječni', 356, 25, 2, 27, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                                -- NO.256
  ('Proteinski napitak (Vindija)', 'Protein drink (Vindija)', 'Mliječni', 62, 10, 4.9, 0.2, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),  -- NO.268
  ('Posni sir (Protein k Plus)', 'Low-fat quark (Protein K-Plus)', 'Mliječni', 64, 12, 3.6, 0.2, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),  -- NO.278
  ('Whey Isolate', 'Whey protein isolate', 'Mliječni', 375, 88, 1.9, 1.2, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                  -- NO.298
  ('Grčki jogurt despar 0%mm.', 'Greek yogurt 0% (Despar)', 'Mliječni', 55, 10, 3.8, 0, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),     -- NO.301
  ('High Protein jogurt Milbona Lidl', 'High-protein yogurt (Milbona, Lidl)', 'Mliječni', 65, 10, 6, 0.3, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),  -- NO.302
  ('Feta sir (President)', 'Feta cheese (President)', 'Mliječni', 270, 16.4, 0.4, 22.5, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),     -- NO.310
  ('Bjelanjak Elcon', 'Egg whites (Elcon)', 'Jaja', 43, 8.8, 1.1, 0.4, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                     -- NO.252
-- ── Mahunarke (beans, lentils, chickpeas, tofu, tempeh, whole soy) ──────────
  ('Leća', 'Lentils (raw)', 'Mahunarke', 103, 8.8, 15.4, 0.7, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                              -- NO.25
  ('Slanutak', 'Chickpeas (raw)', 'Mahunarke', 114, 7.2, 14.7, 2.9, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                        -- NO.26
  ('Miješani grah', 'Mixed beans', 'Mahunarke', 104, 7.3, 16.2, 1.1, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                       -- NO.27
  ('Cannellini grah', 'Cannellini beans', 'Mahunarke', 79, 5.2, 13.3, 0.6, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                 -- NO.28
  ('Maslac grah', 'Butter beans', 'Mahunarke', 93, 7.4, 14.4, 0.6, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                         -- NO.29
  ('Grah', 'Beans (raw)', 'Mahunarke', 102, 8.4, 16, 0.5, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                                  -- NO.30
  ('Tofu', 'Tofu', 'Mahunarke', 83, 8.1, 2, 4.8, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                                           -- NO.31
  ('Crni grah', 'Black beans', 'Mahunarke', 341, 22.5, 62, 1.2, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                            -- NO.185
  ('Pinto grah', 'Pinto beans', 'Mahunarke', 347, 21, 62, 1.2, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                             -- NO.186
  ('Teget grah', 'Navy beans', 'Mahunarke', 347, 21.5, 63.1, 0.9, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                          -- NO.187
  ('Grah brusnica', 'Cranberry (borlotti) beans', 'Mahunarke', 337, 20, 64, 0.9, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),           -- NO.188
  ('Crvena leća', 'Red lentils', 'Mahunarke', 358, 25, 59, 1, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                              -- NO.189
  ('Zelena leća', 'Green lentils', 'Mahunarke', 353, 24, 60, 1, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                            -- NO.190
  ('Smeđa leća', 'Brown lentils', 'Mahunarke', 347, 23, 59, 1, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                             -- NO.191
  ('Francusko zelena leća', 'French green (Puy) lentils', 'Mahunarke', 352, 24, 60, 1, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),      -- NO.192
  ('Crveni grah (Bonduelle)', 'Red kidney beans (Bonduelle)', 'Mahunarke', 71, 5.6, 13.8, 0.5, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),  -- NO.258
  ('Tempeh', 'Tempeh', 'Mahunarke', 180, 18, 1.3, 10, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                                      -- NO.304
-- ── Povrće (vegetables, potato, mushrooms, pickles, tomato/passata/sauce) ───
  ('Mediteranski mix (Ledo)', 'Mediterranean vegetable mix (Ledo)', 'Povrće', 78, 1.4, 3.8, 6, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),  -- NO.20
  ('Bijeli krumpir', 'White potato', 'Povrće', 80, 1.9, 17.9, 0.1, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                         -- NO.55
  ('Slatki krumpir', 'Sweet potato', 'Povrće', 86, 1.2, 19.7, 0.3, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                         -- NO.56
  ('Seosko povrće', 'Mixed country vegetables', 'Povrće', 36, 2.7, 4.9, 0.6, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),               -- NO.108
  ('Paprika', 'Bell pepper', 'Povrće', 26, 1, 4.8, 0.3, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                                    -- NO.109
  ('Mekana stabljika brokule', 'Tenderstem broccoli', 'Povrće', 33, 4.4, 1.8, 0.9, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),         -- NO.111
  ('Cvjetača', 'Cauliflower', 'Povrće', 31, 2.5, 4.4, 0.4, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                                 -- NO.112
  ('Mahune', 'Green beans', 'Povrće', 24, 2.1, 3, 0.4, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                                     -- NO.113
  ('Šparoge', 'Asparagus', 'Povrće', 25, 2.9, 2, 0.6, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                                      -- NO.114
  ('Prokulice', 'Brussels sprouts', 'Povrće', 43, 3.5, 4, 1.4, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                             -- NO.115
  ('Grašak', 'Peas', 'Povrće', 68, 5.3, 10, 0.7, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                                           -- NO.117
  ('Passata od rajčice', 'Tomato passata', 'Povrće', 26, 1.7, 4.3, 0.2, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                    -- NO.121
  ('Maslac tikva', 'Butternut squash', 'Povrće', 37, 1.1, 7.9, 0.1, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                        -- NO.122
  ('Pastrnjak', 'Parsnip', 'Povrće', 64, 1.8, 11.7, 1.1, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                                   -- NO.123
  ('Cikla', 'Beetroot', 'Povrće', 37, 1.7, 7.2, 0.1, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                                       -- NO.124
  ('Gljive', 'Mushrooms', 'Povrće', 22, 2.1, 2.6, 0.4, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                                     -- NO.125
  ('Mješavina za prženje', 'Stir-fry vegetable mix', 'Povrće', 89, 2.2, 10.6, 4.2, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),         -- NO.126
  ('Klice graha', 'Bean sprouts', 'Povrće', 31, 2.9, 3.8, 0.5, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                             -- NO.127
  ('Kiseli krastavci', 'Pickles', 'Povrće', 13, 0.8, 2.5, 0, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                               -- NO.212
  ('Meksički miks (smrznuto)', 'Mexican vegetable mix (frozen)', 'Povrće', 79, 3.4, 11, 1.5, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),  -- NO.228
  ('Paradajz sos', 'Tomato sauce', 'Povrće', 25, 1, 5.3, 0.1, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                              -- NO.234
  ('Cherry rajčice', 'Cherry tomatoes', 'Povrće', 21, 1.5, 4.4, 0.3, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                       -- NO.246
  ('Zelena salata', 'Lettuce', 'Povrće', 14, 1.4, 3, 0.2, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                                  -- NO.247
  ('Kukuruz u konzervi (K plus)', 'Canned corn (K-Plus)', 'Povrće', 107, 2.8, 19, 1.5, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),     -- NO.253
  ('Crvena paprika', 'Red bell pepper', 'Povrće', 34, 0.8, 7, 0.8, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                         -- NO.259
  ('Svježi krastavci', 'Fresh cucumber', 'Povrće', 14, 0, 1.8, 0, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                          -- NO.260
  ('Kupus', 'Cabbage', 'Povrće', 25, 5.8, 0.1, 1.2, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                                        -- NO.263
  ('Grašak i mrkva (smrznuto)', 'Peas and carrots (frozen)', 'Povrće', 74, 3.7, 11, 0.5, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),   -- NO.311
-- ── Voće (fruit incl. dried & frozen berries) ───────────────────────────────
  ('Smrznuto miješano bobičasto voće', 'Frozen mixed berries', 'Voće', 33, 1, 6.5, 0.3, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),    -- NO.96
  ('Ananas', 'Pineapple', 'Voće', 43, 0.4, 9.9, 0.2, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                                       -- NO.97
  ('Passion voće', 'Passion fruit', 'Voće', 37, 2.6, 5.7, 0.4, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                             -- NO.101
  ('Grožđe', 'Grapes', 'Voće', 69, 0.7, 16.1, 0.2, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                                         -- NO.102
  ('Datulje', 'Dates', 'Voće', 287, 3.3, 68, 0.2, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                                          -- NO.103
  ('Kruška', 'Pear', 'Voće', 45, 0.3, 10.8, 0.1, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                                           -- NO.105
  ('Maline', 'Raspberries', 'Voće', 27, 1.4, 4.6, 0.3, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                                     -- NO.106
  ('Šumsko voće', 'Forest fruits (mixed berries)', 'Voće', 46, 3.5, 6.6, 0.5, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),              -- NO.229
  ('Višnje smrznute (Ledo)', 'Frozen sour cherries (Ledo)', 'Voće', 41, 0.8, 10.2, 0, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),      -- NO.277
  ('Sušene marelice', 'Dried apricots', 'Voće', 268, 2, 67, 1.2, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                           -- NO.307
  ('Grožđice', 'Raisins', 'Voće', 321, 2, 76, 0.4, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                                         -- NO.308
  ('Sušene brusnice (Nutrigold)', 'Dried cranberries (Nutrigold)', 'Voće', 358, 0.7, 83, 1, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),  -- NO.309
-- ── Žitarice (grains, rice, pasta, bread, cereal, crackers, flours) ─────────
  ('Jasmin riža', 'Jasmine rice', 'Žitarice', 349, 7.5, 78, 0.7, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                           -- NO.51
  ('Smeđa riža', 'Brown rice', 'Žitarice', 343, 10, 70, 2.5, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                               -- NO.52
  ('Tjestenina', 'Pasta', 'Žitarice', 338, 11.9, 68, 2, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                                    -- NO.53 (NO.231 collapsed)
  ('Tjestenina od cjelovitog brašna', 'Wholemeal pasta', 'Žitarice', 322, 13.3, 61, 2.8, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),   -- NO.54
  ('Zob', 'Oats', 'Žitarice', 374, 10.9, 64, 8.1, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                                          -- NO.57
  ('Obična peciva', 'Plain bread roll', 'Žitarice', 448, 17, 87.6, 2.4, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                    -- NO.58 (1 pecivo 50 g -> /100 g)
  ('Engleski kolač', 'English muffin', 'Žitarice', 263.3, 10, 50, 1.8, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                     -- NO.59 (1 muffin 60 g -> /100 g)
  ('Krema od riže', 'Cream of rice', 'Žitarice', 362, 7.9, 80.5, 0.1, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                      -- NO.62
  ('Baby riža', 'Baby rice cereal', 'Žitarice', 384, 7.7, 86, 1.2, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                         -- NO.63
  ('Kokos Pops', 'Coco Pops (cereal)', 'Žitarice', 378, 6.3, 84, 1.9, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                      -- NO.64
  ('Rice Krispies', 'Rice Krispies (cereal)', 'Žitarice', 383, 7, 86, 1.2, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                 -- NO.65
  ('Weetabix', 'Weetabix', 'Žitarice', 357.9, 12.1, 68.4, 2.1, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                             -- NO.66 (1 biscuit 19 g -> /100 g)
  ('Rižini kolači', 'Rice cakes', 'Žitarice', 333.3, 6.7, 70, 2.2, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                         -- NO.67 (9 g -> /100 g; NO.156 collapsed)
  ('Kukuruzni kolač', 'Corn cakes', 'Žitarice', 288.9, 5.6, 61.1, 1.1, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                     -- NO.157 (9 g -> /100 g; NO.68 collapsed)
  ('Scotch palačinke', 'Scotch pancakes', 'Žitarice', 270, 5.6, 40, 9.6, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                   -- NO.73
  ('Bijeli kruh od kiselog tijesta', 'White sourdough bread', 'Žitarice', 279, 11.8, 54, 1.8, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),  -- NO.74
  ('Smeđi soda kruh', 'Brown soda bread', 'Žitarice', 215, 8.9, 37, 3.5, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                   -- NO.75
  ('Tortilla wrap', 'Tortilla wrap', 'Žitarice', 279, 7.8, 49, 5.7, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                        -- NO.76
  ('Rezanci s jajima', 'Egg noodles', 'Žitarice', 330, 12, 66, 2, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                          -- NO.77
  ('Brioche pecivo', 'Brioche roll', 'Žitarice', 316, 8.8, 49, 9.5, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                        -- NO.78
  ('Musli crunchy w/ jagoda (Kaufland)', 'Crunchy muesli with strawberry (Kaufland)', 'Žitarice', 449, 8.2, 67, 15, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),  -- NO.91
  ('Kvinoja', 'Quinoa', 'Žitarice', 355, 12.2, 62.4, 6, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                                    -- NO.131
  ('Proso', 'Millet', 'Žitarice', 378, 11, 73.9, 3.1, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                                      -- NO.132
  ('Heljda', 'Buckwheat', 'Žitarice', 343, 13.3, 71.5, 3.4, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                                -- NO.133
  ('Ječam', 'Barley', 'Žitarice', 354, 9.9, 77.7, 1.2, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                                     -- NO.134
  ('Farro', 'Farro', 'Žitarice', 349, 15, 70, 2, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                                           -- NO.135
  ('Bulgur', 'Bulgur', 'Žitarice', 342, 12.3, 75.9, 0.2, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                                   -- NO.136
  ('Bijeli kruh', 'White bread', 'Žitarice', 265, 8.7, 50.6, 2.5, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                          -- NO.137
  ('Kruh od cjelovite pšenice', 'Whole wheat bread', 'Žitarice', 247, 11, 47.6, 2.8, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),       -- NO.138
  ('Raženi kruh', 'Rye bread', 'Žitarice', 256, 6.5, 51.8, 1.7, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                            -- NO.139
  ('Bezglutenski kruh', 'Gluten-free bread', 'Žitarice', 248, 3.4, 47.1, 3.6, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),              -- NO.140
  ('Pita kruh', 'Pita bread', 'Žitarice', 275, 9.2, 55.4, 1.1, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                             -- NO.141
  ('Kruh od kiselog tijesta', 'Sourdough bread', 'Žitarice', 274, 11.8, 54, 1.8, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),           -- NO.142
  ('Kroasan', 'Croissant', 'Žitarice', 406, 7.9, 42.9, 24.8, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                               -- NO.143
  ('Baguette', 'Baguette', 'Žitarice', 275, 9.2, 55, 1.1, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                                  -- NO.144
  ('Ciabatta', 'Ciabatta', 'Žitarice', 250, 9.2, 49.3, 1.2, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                                -- NO.145
  ('Pumpernickel kruh', 'Pumpernickel bread', 'Žitarice', 250, 6.5, 48.5, 1.6, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),             -- NO.146
  ('Kokice', 'Popcorn', 'Žitarice', 387, 8.1, 78.2, 4.6, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                                   -- NO.153
  ('Tortilla čips', 'Tortilla chips', 'Žitarice', 497, 7.7, 63.5, 24.7, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                    -- NO.154
  ('Čips od krumpira', 'Potato crisps', 'Žitarice', 536, 6.7, 52.3, 32.5, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                  -- NO.155
  ('Palačinke', 'Pancakes', 'Žitarice', 227, 4.9, 26, 12.3, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                                -- NO.162
  ('Vafli', 'Waffles', 'Žitarice', 291, 5, 37, 14.3, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                                       -- NO.163
  ('Francuski tost', 'French toast', 'Žitarice', 273, 9.8, 29.1, 12.9, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                     -- NO.164
  ('Kukuruzne pahuljice', 'Corn flakes', 'Žitarice', 379, 7.7, 85, 0.4, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                    -- NO.165
  ('Mekinje s grožđicama', 'Raisin bran', 'Žitarice', 351, 6.1, 83.1, 1.6, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                 -- NO.166
  ('Mljevena pšenica', 'Shredded wheat', 'Žitarice', 344, 12.6, 76.3, 1.6, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                 -- NO.168
  ('Mekinje pahuljice', 'Bran flakes', 'Žitarice', 319, 12.5, 72.4, 1.4, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                   -- NO.169
  ('Granola (Sante)', 'Granola (Sante)', 'Žitarice', 441, 9.5, 65, 15, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                     -- NO.170
  ('Kukuruzno brašno', 'Corn flour', 'Žitarice', 381, 6.9, 91.3, 0.1, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                      -- NO.171
  ('Arrowroot', 'Arrowroot flour', 'Žitarice', 357, 0.3, 88.1, 0.1, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                        -- NO.172
  ('Tapioka brašno', 'Tapioca flour', 'Žitarice', 358, 0.2, 88.7, 0.1, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                     -- NO.173
  ('Rižino brašno', 'Rice flour', 'Žitarice', 366, 6.7, 81.4, 1.1, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                         -- NO.174
  ('Brašno od slanutka', 'Chickpea flour', 'Žitarice', 387, 22.3, 57.8, 6.7, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),               -- NO.175
  ('Sojino brašno', 'Soy flour', 'Žitarice', 375, 34.6, 30.8, 20.6, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                        -- NO.176
  ('Krumpir brašno', 'Potato flour', 'Žitarice', 340, 5, 83.6, 0.1, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                        -- NO.177
  ('Heljdino brašno', 'Buckwheat flour', 'Žitarice', 335, 13.3, 67.5, 3.1, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                 -- NO.178
  ('Brašno od batata', 'Sweet potato flour', 'Žitarice', 332, 7.3, 85.7, 0.5, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),              -- NO.179
  ('Kestenovo brašno', 'Chestnut flour', 'Žitarice', 381, 4.5, 84.8, 2.2, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                  -- NO.182
  ('Kokosovo brašno', 'Coconut flour', 'Žitarice', 420, 19.3, 58.2, 12.6, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                  -- NO.183
  ('Biser ječam', 'Pearl barley', 'Žitarice', 352, 9.9, 78.9, 1.3, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                         -- NO.184
  ('Couscous', 'Couscous', 'Žitarice', 112, 3.8, 23.2, 0.2, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                                -- NO.193
  ('Riža', 'Rice', 'Žitarice', 351, 7.5, 77, 1.2, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                                          -- NO.223
  ('Cornflakes', 'Cornflakes', 'Žitarice', 375, 9.4, 81, 0.8, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                              -- NO.225
  ('Rižin griz', 'Rice semolina', 'Žitarice', 371, 6, 75, 0.5, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                             -- NO.230
  ('Njoki', 'Gnocchi', 'Žitarice', 155, 3.1, 35, 0.4, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                                      -- NO.232
  ('Tortilja Kaufland', 'Tortilla (Kaufland)', 'Žitarice', 308, 10.2, 51, 6.6, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),             -- NO.238
  ('Tost k plus butter', 'Toast bread with butter (K-Plus)', 'Žitarice', 294, 8.4, 55.4, 3.6, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),  -- NO.240
  ('Rižini krekeri', 'Rice crackers', 'Žitarice', 387, 8.2, 82, 2.8, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                       -- NO.262
  ('Dvopek integralni (Mulino Bianco - konzum)', 'Wholegrain rusks (Mulino Bianco)', 'Žitarice', 387, 14, 72, 7.4, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),  -- NO.267
  ('Hajdina kaša', 'Buckwheat groats', 'Žitarice', 343, 9.1, 71, 1.7, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                      -- NO.273
  ('Kus kus (Kaufland)', 'Couscous (Kaufland)', 'Žitarice', 351, 15, 70.8, 2.1, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),            -- NO.275
  ('Pirovi krekeri', 'Spelt crackers', 'Žitarice', 365, 16, 65, 3, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                         -- NO.276
  ('Integralni tost', 'Wholegrain toast bread', 'Žitarice', 247, 9.5, 43, 3, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),               -- NO.296
  ('Čokolino Protein Power', 'Čokolino Protein Power (cereal)', 'Žitarice', 398, 17, 66, 6, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),  -- NO.300
  ('Krekeri raženog brašna', 'Rye flour crackers', 'Žitarice', 350, 10, 61, 2.6, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),           -- NO.305
-- ── Masti / Ulja (oils, butter, nuts, seeds, nut butters, avocado) ──────────
  ('Tamna čokolada (85%)', 'Dark chocolate (85%)', 'Ostalo', 586, 8, 32.5, 50, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),             -- NO.79  (chocolate -> Ostalo)
  ('Badem maslac', 'Almond butter', 'Masti/Ulja', 579, 20.7, 7, 52, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                        -- NO.81
  ('Maslac od kikirikija', 'Peanut butter', 'Masti/Ulja', 606, 22.8, 12.2, 52, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),            -- NO.82
  ('Makadamija ulje', 'Macadamia nut oil', 'Masti/Ulja', 375, 0, 0, 93.3, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                  -- NO.85
  ('Kikiriki', 'Peanuts', 'Masti/Ulja', 602, 24.7, 15.5, 49, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                               -- NO.86
  ('Pecan', 'Pecans', 'Masti/Ulja', 731, 10.1, 5.2, 72, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                                     -- NO.87
  ('Pistacije', 'Pistachios', 'Masti/Ulja', 601, 17.9, 7.7, 55, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                            -- NO.88
  ('Indijski oraščići', 'Cashews', 'Masti/Ulja', 571, 17.7, 16.7, 48, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                      -- NO.92
  ('Organski maslac', 'Organic butter', 'Masti/Ulja', 745, 0.6, 0.6, 82, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                   -- NO.93
  ('Sjemenke suncokreta', 'Sunflower seeds', 'Masti/Ulja', 584, 20.8, 20, 51.5, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),            -- NO.147
  ('Sjemenke bundeve', 'Pumpkin seeds', 'Masti/Ulja', 559, 29.8, 10.7, 46.4, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),               -- NO.148
  ('Chia sjemenke', 'Chia seeds', 'Masti/Ulja', 486, 16.5, 42.1, 30.7, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                     -- NO.149
  ('Sjemenke lana', 'Flax seeds', 'Masti/Ulja', 534, 18.3, 28.9, 42.2, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                     -- NO.150
  ('Sjemenke sezama', 'Sesame seeds', 'Masti/Ulja', 573, 17.7, 25.7, 48.9, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                 -- NO.151
  ('Sjemenke konoplje', 'Hemp seeds', 'Masti/Ulja', 553, 31.6, 9.2, 47.2, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                  -- NO.152
  ('Bademov maslac Nutrigold', 'Almond butter (Nutrigold)', 'Masti/Ulja', 645, 24, 10, 54, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),  -- NO.167
  ('Bademovo brašno', 'Almond flour', 'Masti/Ulja', 579, 21.1, 21.4, 50, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                   -- NO.180
  ('Lješnjakovo brašno', 'Hazelnut flour', 'Masti/Ulja', 634, 14.1, 16.7, 60.8, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),            -- NO.181
  ('Kikiriki maslac (Nutrigold)', 'Peanut butter (Nutrigold)', 'Masti/Ulja', 597, 29.5, 7, 50, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),  -- NO.226
  ('Bučino ulje', 'Pumpkin seed oil', 'Masti/Ulja', 900, 0, 0, 99, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                         -- NO.264
-- ── Ostalo (sweeteners, chocolate, condiments, plant milks, supplements) ────
  ('Zobeno mlijeko', 'Oat milk', 'Ostalo', 44, 1, 6.6, 1.5, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                                -- NO.43
  ('Zobeno mlijeko (nezaslađeno)', 'Oat milk (unsweetened)', 'Ostalo', 36, 1, 6.3, 0.7, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),    -- NO.44
  ('Sojino mlijeko', 'Soy milk', 'Ostalo', 26, 2.4, 0.5, 1.6, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                              -- NO.45
  ('Sojino mlijeko (zaslađeno)', 'Soy milk (sweetened)', 'Ostalo', 44, 3.1, 2.5, 2.4, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),      -- NO.46
  ('Badem mlijeko', 'Almond milk', 'Ostalo', 21, 0.5, 2.4, 1.1, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                            -- NO.47
  ('Bademovo mlijeko (Nutrigold)', 'Almond milk (Nutrigold)', 'Ostalo', 16, 0.5, 0.6, 1.4, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),  -- NO.48
  ('Mlijeko od indijskih oraščića', 'Cashew milk', 'Ostalo', 22, 0.5, 2.6, 1.1, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),            -- NO.49
  ('Mlijeko od lješnjaka', 'Hazelnut milk', 'Ostalo', 30, 0.6, 0.3, 2.9, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                   -- NO.50
  ('Sirup od datulja', 'Date syrup', 'Ostalo', 285, 1.2, 70, 0.2, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                          -- NO.61
  ('Džem', 'Jam', 'Ostalo', 274, 0.3, 66, 0.1, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                                             -- NO.70 (NO.159 collapsed)
  ('Javorov sirup', 'Maple syrup', 'Ostalo', 260, 0, 65, 0.2, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                              -- NO.71 (NO.160 collapsed)
  ('Kokosovo mlijeko', 'Coconut milk', 'Ostalo', 230, 2, 5.5, 23, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                          -- NO.194
  ('Kokosovo vrhnje', 'Coconut cream', 'Ostalo', 330, 3, 6, 34, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                            -- NO.195
  ('Kokosov šećer', 'Coconut sugar', 'Ostalo', 375, 0, 92, 0, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                              -- NO.201
  ('Nektar agave', 'Agave nectar', 'Ostalo', 310, 0, 76, 0, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                                -- NO.202
  ('Javorov šećer', 'Maple sugar', 'Ostalo', 354, 0, 88, 0, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                                -- NO.203
  ('Stevija', 'Stevia', 'Ostalo', 0, 0, 0, 0, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                                              -- NO.204
  ('Ksilitol', 'Xylitol', 'Ostalo', 240, 0, 100, 0, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                                        -- NO.205
  ('Eritritol', 'Erythritol', 'Ostalo', 0, 0, 0, 0, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                                        -- NO.206
  ('Monk Fruit', 'Monk fruit sweetener', 'Ostalo', 0, 0, 0, 0, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                             -- NO.207
  ('Kreatin monohidrat', 'Creatine monohydrate', 'Ostalo', 0, 0, 0, 0, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                     -- NO.128
  ('Visoko razgranati ciklički dekstrin', 'Highly branched cyclic dextrin (HBCD)', 'Ostalo', 381, 0, 97, 0, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),  -- NO.129
  ('Ketchup blagi (Zvijezda)', 'Ketchup (mild, Zvijezda)', 'Ostalo', 104, 1.3, 23, 0.5, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),    -- NO.254
  ('Senf Estragon (Podravka)', 'Tarragon mustard (Podravka)', 'Ostalo', 100, 5.5, 4.1, 5.7, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),  -- NO.283
  ('Maltodekstrin', 'Maltodextrin', 'Ostalo', 380, 0, 95, 0, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                               -- NO.295
  ('Marmelada marelica', 'Apricot marmalade', 'Ostalo', 256, 0, 64, 0, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2'),                     -- NO.303
  ('Mlijeko (Lagano Jutro 1,5%)', 'Milk (Lagano Jutro 1.5%)', 'Mliječni', 46, 3.4, 4.6, 1.5, true, '6d23b92f-99c2-40a9-9014-2dcd417250a2');  -- NO.272 (dairy milk)
