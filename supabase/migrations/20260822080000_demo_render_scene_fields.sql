-- KINEO-DEMO-MONTA-IGUAL-2026-08-22
--
-- O worker de demos (/api/admin/demo-render) montava o filme chamando o
-- /api/compose SEM `scene_engines`, `scene_dialogues` e `scene_narrations` —
-- três campos que o GenerateClient e o cron de resgate sempre enviam.
--
-- O efeito, medido lado a lado em 22/08:
--     Kling 2.5 (produto normal) .... legenda OK
--     H3        (produto normal) .... legenda OK (3 de 4 frames)
--     Kling 3   (worker de demo) .... legenda em 0 de 6 frames
--
-- Sem `scene_engines` toda cena cai no default 'support', então o filme perde
-- a noção de qual cena é o avatar falando. Sem `scene_dialogues` o campo
-- `dialogueLine` nasce vazio — e é dele que sai a legenda quando a transcrição
-- do clipe não vem. Sem texto, o fallback não emite nada.
--
-- O worker roda em PASSADAS separadas (submete numa, compõe noutra), então
-- esses campos precisam sobreviver entre elas: vêm da resposta do
-- /api/generate-video-cinematic e ficam aqui até a hora do compose.
--
-- jsonb como as colunas irmãs (fal_request_ids, fal_models, scene_captions).
alter table public.demo_render_jobs
  add column if not exists scene_engines jsonb,
  add column if not exists scene_narrations jsonb,
  add column if not exists scene_dialogues jsonb,
  add column if not exists scene_seconds jsonb;

comment on column public.demo_render_jobs.scene_engines is
  'Tipo de cada cena (dialogue|cinematic|support|host). O compose usa para saber qual cena é fala do avatar; sem isto tudo vira support.';
comment on column public.demo_render_jobs.scene_dialogues is
  'Fala nativa de cada cena de diálogo. Fonte da legenda quando a transcrição do clipe falha.';
comment on column public.demo_render_jobs.scene_narrations is
  'Texto de TTS por cena (null = só áudio nativo).';
comment on column public.demo_render_jobs.scene_seconds is
  'Duração planejada de cada cena, para o compose montar a timeline igual ao cliente.';
