-- SELECT historica executada em 08/09/2026; janela fixa abaixo.
-- Resultado: zero linhas com marcador da variante em todos os nomes consultados.
-- Usar o resultado para registrar ausencia de exposicao observada nesta janela.
-- NAO e um funil financeiro: pagamento/checkout podem nao carregar o marcador.
-- Continuacoes reais exigem vincular a pessoa exposta aos contratos de pagamento.
-- Zero exposicoes nao prova zero visitas: depende de JS, visibilidade e persistencia.
with
bounds as (
 select '2026-09-08 15:32:56.985+00'::timestamptz start_at,
        '2026-09-08 15:41:01+00'::timestamptz cutoff_utc
),
wanted(name) as (
 values ('pista3_creator_offer_viewed'),('checkout_cta_clicked'),
        ('checkout_started'),('payment_success')
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
select b.start_at,b.cutoff_utc,w.name,
 count(m.id) as matching_event_rows,
 count(m.id) filter(where m.account_class='internal') as internal_rows,
 count(m.id) filter(where m.known_probe) as bot_or_probe_rows,
 count(m.id) filter(where m.account_class='external' and not m.known_probe)
   as external_event_rows,
 count(distinct m.user_id) filter(
   where m.account_class='external' and not m.known_probe)
   as identified_external_people,
 count(distinct m.user_id) filter(
   where m.account_class='external' and not m.known_probe
   and m.surface='gpt_handoff') as gpt_handoff_people,
 count(distinct m.user_id) filter(
   where m.account_class='external' and not m.known_probe
   and m.surface='history_film') as history_film_people,
 count(distinct m.user_id) filter(
   where m.account_class='external' and not m.known_probe
   and exists(select 1 from exposures x
              where x.user_id=m.user_id and x.surface=m.surface
                and x.exposed_at<=m.created_at))
   as identified_people_with_prior_or_same_visible_exposure,
 count(m.id) filter(where m.user_id is null and not m.known_probe)
   as anonymous_event_rows,
 count(distinct nullif(m.session_id,'')) filter(
   where m.user_id is null and not m.known_probe)
   as anonymous_sessions_not_people,
 count(m.id) filter(
   where m.user_id is not null
   and (m.account_class is null or m.account_class='unknown_email')
   and not m.known_probe) as unknown_profile_or_email_rows,
 count(m.id) filter(
   where m.account_class='external' and not m.known_probe
   and m.bot_signal_missing) as external_rows_without_bot_signal,
 count(m.id) filter(
   where m.name='pista3_creator_offer_viewed' and not m.exposure_contract)
   as exposure_rows_missing_visibility_contract,
 min(m.created_at) filter(
   where m.account_class='external' and not m.known_probe) as first_external_at,
 max(m.created_at) filter(
   where m.account_class='external' and not m.known_probe) as last_external_at
from bounds b cross join wanted w left join matched m on m.name=w.name
group by b.start_at,b.cutoff_utc,w.name
order by w.name;
