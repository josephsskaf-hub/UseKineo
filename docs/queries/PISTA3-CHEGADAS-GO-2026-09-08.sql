-- SELECT historica executada em 08/09/2026, janela fixa abaixo.
-- Pousos gravados no servidor, nao visitantes unicos nem pessoas externas.
-- O caller nao passa userId; signed_in nao identifica uma pessoa.
-- Sonda conhecida e ligada pelo token ao IP do CRIADOR do handoff, nao do visitante.
-- Dedupe do emissor: nome + sessao por 30 min; sem sessao nao aplica esse dedupe.
-- Resultado desta janela: 2 linhas de sondas conhecidas; todas as outras classes zero.
with bounds as (
 select '2026-09-08 15:32:56.985+00'::timestamptz start_at,
        '2026-09-08 16:40:02.842+00'::timestamptz end_at
), probe_hashes(ip_hash) as (
 values
 ('67fc14c5443b51680991b631ce1a7ec3aa53386b95a5c76a4e386f6d77321e0d'),
 ('04b852318d49a58963ac5a5303af0e4cbf8725197864c53dc9df553730410625')
), classes(class) as (
 values ('known_probe'),('bot'),
        ('user_id_present'),('unidentified_nonbot')
), base as (
 select e.id,e.user_id,e.session_id,e.created_at,
        e.metadata->>'token' as token,
        e.metadata->>'signed_in' as signed_in,
        (
          coalesce(e.metadata->>'bot','')='true'
          or coalesce(e.metadata->>'is_bot','')='true'
          or coalesce(e.metadata->>'client_class','')='bot'
        ) as bot,
        (
          coalesce(e.metadata->>'ua',e.metadata->>'user_agent','')
            ~* '(curl/|kineo.*(probe|audit)|playwright|smoketest)'
          or exists(select 1 from probe_hashes p
                    where p.ip_hash=e.metadata->>'ip_hash')
          or exists(select 1 from public.gpt_handoffs h
                    join probe_hashes p using(ip_hash)
                    where h.token=e.metadata->>'token')
        ) as known_probe,
        (
          e.metadata->>'bot' is null
          and e.metadata->>'is_bot' is null
          and coalesce(e.metadata->>'client_class','unknown')='unknown'
        ) as bot_signal_missing
 from public.events e cross join bounds b
 where e.name='gpt_landing_viewed'
   and e.created_at>=b.start_at and e.created_at<b.end_at
), classified as (
 select *,case when known_probe then 'known_probe'
               when bot then 'bot'
               when user_id is not null then 'user_id_present'
               else 'unidentified_nonbot' end as class
 from base
)
select b.start_at,b.end_at,c.class,
 count(m.id) as event_rows,
 count(distinct m.user_id) as reported_user_ids,
 count(distinct nullif(m.session_id,'')) as sessions_not_people,
 count(distinct m.token) as tokens_not_people,
 count(m.id) filter(where m.signed_in='true') as signed_in_true_rows,
 count(m.id) filter(where m.signed_in='false') as signed_in_false_rows,
 count(m.id) filter(where coalesce(m.signed_in,'') not in ('true','false'))
   as signed_in_unknown_rows,
 count(m.id) filter(where nullif(m.session_id,'') is null)
   as missing_session_rows,
 count(m.id) filter(where m.bot_signal_missing) as missing_bot_signal_rows,
 min(m.created_at) as first_at,max(m.created_at) as last_at
from bounds b cross join classes c
left join classified m on m.class=c.class
group by b.start_at,b.end_at,c.class
order by c.class;
