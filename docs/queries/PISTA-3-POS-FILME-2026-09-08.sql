-- Baseline executada por SELECT em 08/09/2026; zero linhas de campanha,
-- inclusive antes de filtrar internos/probes. Não mede conversão nem efeito.
-- Reprodução histórica exata. Para futuras leituras, incluir também
-- metadata.is_bot e metadata.client_class; esta versão histórica não os filtra.
with
bounds as (
 select '2026-09-03 16:00:00+00'::timestamptz start_at,
        '2026-09-08 03:59:10+00'::timestamptz end_at
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
matched as (
 select e.id,e.name,e.user_id,e.session_id,e.created_at,p.account_class,
 (coalesce(e.metadata->>'bot','')='true'
 or coalesce(e.metadata->>'ua',e.metadata->>'user_agent','')
    ~* '(curl/|kineo.*(probe|audit)|playwright|smoketest)'
 or exists(
   select 1 from public.gpt_handoffs h join probe_hashes ph using(ip_hash)
   where h.token=e.metadata->>'token'
 )) as known_probe
 from public.events e cross join bounds b
 left join profile_flags p on p.id=e.user_id
 where e.created_at>=b.start_at and e.created_at<b.end_at
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
)
select b.start_at,b.end_at as cutoff_utc,w.name,
 count(m.id) as matching_event_rows,
 count(m.id) filter(where m.account_class='internal') as internal_rows,
 count(m.id) filter(where m.known_probe) as probe_rows,
 count(m.id) filter(where m.account_class='external' and not m.known_probe)
   as external_event_rows,
 count(distinct m.user_id) filter(
   where m.account_class='external' and not m.known_probe)
   as directly_identified_external_people,
 count(m.id) filter(where m.user_id is null and not m.known_probe)
   as anonymous_event_rows,
 count(distinct nullif(m.session_id,'')) filter(
   where m.user_id is null and not m.known_probe)
   as anonymous_sessions_not_people,
 count(m.id) filter(
   where m.user_id is not null
   and (m.account_class is null or m.account_class='unknown_email')
   and not m.known_probe) as unknown_profile_or_email_rows,
 min(m.created_at) filter(
   where m.account_class='external' and not m.known_probe) as first_external_at,
 max(m.created_at) filter(
   where m.account_class='external' and not m.known_probe) as last_external_at
from bounds b cross join wanted w left join matched m on m.name=w.name
group by b.start_at,b.end_at,w.name
order by w.name;
