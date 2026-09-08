-- Consulta historica executada em 08/09/2026 com corte fixo abaixo.
-- Coorte de pessoas externas expostas; eventos posteriores por qualquer superficie.
-- NAO e atribuicao causal nem exige clique anterior ao pagamento.
-- Resultado: 1 pessoa exposta; todos os quatro nomes posteriores retornaram zero linhas.
-- Nao soma receita nem classifica renovacao. Valores/contratos nulos permanecem desconhecidos.
-- Se houver dinheiro em leitura futura, reconciliar conflitos por Session/invoice e contrato
-- antes de classificar trial USD1, assinatura direta, primeira fatura ou renovacao.
-- Snapshot historico de continuidade por pessoa exposta. Nao e atribuicao causal.
with
bounds as (
 select '2026-09-08 15:32:56.985+00'::timestamptz start_at,
        '2026-09-08 17:01:33.171+00'::timestamptz cutoff_utc
),
wanted(name) as (
 values ('pista3_creator_offer_viewed')
),
probe_hashes(ip_hash) as (
 values ('67fc14c5443b51680991b631ce1a7ec3aa53386b95a5c76a4e386f6d77321e0d'),
        ('04b852318d49a58963ac5a5303af0e4cbf8725197864c53dc9df553730410625')
),
profile_flags as (
 select p.id,
 case when nullif(trim(p.email),'') is null then 'unknown_email'
 when lower(trim(p.email)) = any(array[
 'josephsskaf@gmail.com','josephskaf@hotmail.com','victoriaskaf96@gmail.com',
 'joseph+teste01@gmail.com','teste01@shortsforgeai.com'])
 or lower(trim(p.email)) like any(array[
 'josephsskaf+%@gmail.com','joseph+%@gmail.com','%@theresanaiforthat.com',
 'josephsskaf%','josephskaf%','%@shortsforgeai.com','test%','%mailinator%',
 'smoketest%','%josephsskaf%','%usekineo%','%kineo.local%'])
 then 'internal' else 'external' end as account_class
 from public.profiles p
),
matched as materialized (
 select e.id,e.name,e.user_id,e.session_id,e.created_at,p.account_class,
 case when e.metadata->>'surface' in ('gpt_handoff','history_film')
      then e.metadata->>'surface'
      when e.metadata->>'intent_campaign'='pista3_next_film_v1_gpt_handoff'
      then 'gpt_handoff'
      when e.metadata->>'intent_campaign'='pista3_next_film_v1_history_film'
      then 'history_film' else 'unknown' end as surface,
 (coalesce(e.metadata->>'bot','')='true'
 or coalesce(e.metadata->>'is_bot','')='true'
 or coalesce(e.metadata->>'client_class','')='bot'
 or coalesce(e.metadata->>'ua',e.metadata->>'user_agent','')
    ~* '(curl/|kineo.*(probe|audit)|playwright|smoketest)'
 or exists(select 1 from probe_hashes ph
           where ph.ip_hash=e.metadata->>'ip_hash')
 or exists(select 1 from public.gpt_handoffs h
           join probe_hashes ph using(ip_hash)
           where h.token=e.metadata->>'token')) as known_probe,
 (e.metadata->>'is_bot' is null
  and e.metadata->>'bot' is null
  and coalesce(e.metadata->>'client_class','unknown')='unknown') as bot_signal_missing,
 coalesce(e.metadata->>'visible_ratio'='0.5'
          and e.metadata->>'visible_ms'='1000',false) as exposure_contract
 from public.events e cross join bounds b
 left join profile_flags p on p.id=e.user_id
 where e.created_at>=b.start_at and e.created_at<b.cutoff_utc
 and e.name in (select name from wanted)
 and (
   e.metadata->>'version'='pista3_next_film_v1'
   or exists(
     select 1 from (values(e.metadata->>'intent_campaign'),
                          (e.metadata->>'utm_campaign')) c(v)
     where c.v in ('pista3_next_film_v1',
                   'pista3_next_film_v1_gpt_handoff',
                   'pista3_next_film_v1_history_film')
   )
 )
),
exposures as (
 select user_id,surface,min(created_at) as exposed_at
 from matched where name='pista3_creator_offer_viewed'
   and account_class='external' and not known_probe and exposure_contract
 group by user_id,surface
)
,
cohort as (
 select user_id,min(exposed_at) exposed_at from exposures group by user_id
), next_names(name) as (
 values ('checkout_cta_clicked'),('checkout_started'),('payment_success'),('subscription_invoice_paid')
), subsequent as (
 select e.id,e.name,e.user_id,e.metadata
 from cohort c join public.events e on e.user_id=c.user_id
 cross join bounds b
 where e.created_at>=c.exposed_at and e.created_at<b.cutoff_utc
 and e.name in (select name from next_names)
)
select b.start_at,b.cutoff_utc,
 (select count(*) from cohort) as exposed_people,
 n.name,count(s.id) as event_rows,count(distinct s.user_id) as people,
 count(distinct nullif(s.metadata->>'stripe_session_id','')) as sessions_not_people,
 count(distinct nullif(s.metadata->>'stripe_invoice_id','')) as invoices_not_people,
 jsonb_agg(distinct jsonb_build_object(
  'amount_total',s.metadata->>'amount_total','amount_paid',s.metadata->>'amount_paid',
  'currency',s.metadata->>'currency','card_trial',s.metadata->>'card_trial',
  'checkout_mode',coalesce(s.metadata->>'mode',s.metadata->>'checkout_mode'),
  'trial_conversion',s.metadata->>'trial_conversion','pack_id',s.metadata->>'pack_id'
 )) filter (where s.name in ('payment_success','subscription_invoice_paid')) as money_contracts
from bounds b cross join next_names n left join subsequent s on s.name=n.name
group by b.start_at,b.cutoff_utc,n.name order by n.name;
