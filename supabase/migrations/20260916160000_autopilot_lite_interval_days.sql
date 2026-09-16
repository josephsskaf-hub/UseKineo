-- KINEO-AUTOPILOT-LITE-2026-09-16 — cadência SEMANAL para o plano Autopilot Lite (fundador 16/09:
-- "vamos fazer esse Autopilot Lite… um vídeo por semana"). O Autopilot de $299 continua diário.
-- interval_days: 1 = diário (todos os planos de hoje), 7 = semanal (Autopilot Lite). O cron e a API
-- só aceitam 1 ou 7 (normalizeIntervalDays em lib/autopilot/config.ts); o check abaixo espelha isso.
alter table public.autopilot_schedules
  add column if not exists interval_days smallint not null default 1;
alter table public.autopilot_schedules
  drop constraint if exists autopilot_schedules_interval_days_check;
alter table public.autopilot_schedules
  add constraint autopilot_schedules_interval_days_check check (interval_days in (1, 7));
