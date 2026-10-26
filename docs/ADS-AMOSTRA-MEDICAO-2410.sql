-- KINEO-AMOSTRA-ANUNCIO-2410 — SUGESTÃO: SQL somente leitura após aplicar a migration nova e publicar o código.
-- FATO CONFIRMADO/IMPLEMENTADO: actor_id é PK vitalícia, pessoal; is_internal vem do auth+lib/internalAccounts.ts.
-- Resultados só viram EVIDÊNCIA DE PRODUÇÃO quando executados e datados. Nenhuma execução em produção nesta tarefa.

select now() as measured_at_utc,
  count(*) as pessoas_iniciaram,
  count(*) filter(where delivered_at is not null) as pessoas_receberam,
  count(*) filter(where upsell_clicked_at is not null) as pessoas_clicaram_versao_completa,
  count(*) filter(where purchased_at is not null) as pessoas_compraram_em_7d,
  count(*) filter(where delivered_at <= now()-interval '7 days') as pessoas_com_janela_7d_completa,
  count(*) filter(where delivered_at > now()-interval '7 days') as pessoas_ainda_em_observacao
from public.ads_escolha_samples where is_internal = false;

-- Custo RESERVADO estimado, sem estorno de quota após falha/exclusão; não é custo faturado pelo fornecedor.
select request_day as dia_utc, samples as amostras_reservadas, reserved_cents,
  reserved_cents::numeric/100 as custo_estimado_usd, 1000-reserved_cents as teto_restante_cents
from public.ads_escolha_sample_days order by request_day desc;

-- Diagnóstico de duplicatas: os quatro eventos da tarefa têm no máximo uma linha por pessoa.
select e.name, count(*) as eventos, count(distinct e.user_id) as pessoas,
  min(e.created_at) as primeira_data, max(e.created_at) as ultima_data
from public.events e join public.ads_escolha_samples s on s.actor_id=e.user_id
where not s.is_internal and e.metadata->>'sample_version'='KINEO-AMOSTRA-ANUNCIO-2410'
  and e.name in ('ads_sample_started','ads_sample_delivered','ads_sample_upsell_clicked','ads_sample_purchased_7d')
group by e.name order by e.name;

-- A regra do alarme observa as primeiras50 pessoas externas com7 dias completos após receber.
with cohort as (
 select actor_id, delivered_at, purchased_at from public.ads_escolha_samples
 where not is_internal and delivered_at <= now()-interval '7 days'
 order by delivered_at,actor_id limit 50
)
select now() as measured_at_utc,count(*) as pessoas_maduras,
 count(*) filter(where purchased_at is not null) as pessoas_compraram_em_7d,
 count(*)=50 and count(*) filter(where purchased_at is not null)=0 as deve_alertar
from cohort;

select alert_key,measured_at,first_delivered_at,last_delivered_at,claimed_at,sent_at
from public.ads_escolha_sample_alerts;
