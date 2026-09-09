-- AUDITORIA-CITACOES-CHATGPT-2026-09-09.md
-- SELECT somente leitura. Executadas em 09/09/2026. Janela fixa.
-- Predicado de externos gerado por externalAccountsSqlCondition('p.email')
-- de lib/internalAccounts.ts, base f1248840. Regenerar se essa fonte mudar.
-- Não publicar IDs, emails ou roteiros de clientes nos resultados.

-- Cadastros por dia BRT; 09/09 parcial até 17h, demais completos.
select (p.created_at at time zone 'America/Sao_Paulo')::date day_brt,
 count(*) all_external,
 count(*) filter(where lower(coalesce(p.utm_source,'')) in ('chatgpt','chatgpt.com')) utm_chatgpt,
 count(*) filter(where lower(coalesce(p.signup_utm_source,'')) in ('chatgpt','chatgpt.com')
   or lower(coalesce(p.signup_referrer,'')) like '%chatgpt.com%') signup_chatgpt
from profiles p
where p.created_at >= '2026-09-03 03:00:00+00'
 and p.created_at < '2026-09-09 20:00:00+00'
 and NOT (lower(p.email) IN ('josephsskaf@gmail.com','josephskaf@hotmail.com','victoriaskaf96@gmail.com','joseph+teste01@gmail.com','teste01@shortsforgeai.com') OR lower(p.email) LIKE 'josephsskaf+%@gmail.com' OR lower(p.email) LIKE 'joseph+%@gmail.com' OR lower(p.email) LIKE '%@theresanaiforthat.com' OR lower(p.email) LIKE 'josephsskaf%' OR lower(p.email) LIKE 'josephskaf%' OR lower(p.email) LIKE '%@shortsforgeai.com' OR lower(p.email) LIKE 'test%' OR lower(p.email) LIKE '%mailinator%' OR lower(p.email) LIKE 'smoketest%')
group by 1 order by 1;

-- Sessões registradas (NÃO pessoas), relógio idêntico 00h–17h BRT.
-- Exclusão de sessões internas identificáveis; anônimos seguem não verificáveis.
with internal_sessions as (
 select distinct e.session_id from events e join profiles p on p.id=e.user_id
 where e.created_at >= '2026-09-03 03:00+00' and e.created_at < '2026-09-09 20:00+00'
 and not (NOT (lower(p.email) IN ('josephsskaf@gmail.com','josephskaf@hotmail.com','victoriaskaf96@gmail.com','joseph+teste01@gmail.com','teste01@shortsforgeai.com') OR lower(p.email) LIKE 'josephsskaf+%@gmail.com' OR lower(p.email) LIKE 'joseph+%@gmail.com' OR lower(p.email) LIKE '%@theresanaiforthat.com' OR lower(p.email) LIKE 'josephsskaf%' OR lower(p.email) LIKE 'josephskaf%' OR lower(p.email) LIKE '%@shortsforgeai.com' OR lower(p.email) LIKE 'test%' OR lower(p.email) LIKE '%mailinator%' OR lower(p.email) LIKE 'smoketest%')) and e.session_id is not null
)
select (e.created_at at time zone 'America/Sao_Paulo')::date day_brt,
 count(*) events,count(distinct e.session_id) sessions,count(distinct e.user_id) identified_users
from events e left join profiles p on p.id=e.user_id
where e.name='landing_session_started'
 and e.created_at >= '2026-09-03 03:00+00' and e.created_at < '2026-09-09 20:00+00'
 and (e.created_at at time zone 'America/Sao_Paulo')::time < '17:00'
 and e.metadata->>'is_bot' is distinct from 'true'
 and (e.user_id is null or (NOT (lower(p.email) IN ('josephsskaf@gmail.com','josephskaf@hotmail.com','victoriaskaf96@gmail.com','joseph+teste01@gmail.com','teste01@shortsforgeai.com') OR lower(p.email) LIKE 'josephsskaf+%@gmail.com' OR lower(p.email) LIKE 'joseph+%@gmail.com' OR lower(p.email) LIKE '%@theresanaiforthat.com' OR lower(p.email) LIKE 'josephsskaf%' OR lower(p.email) LIKE 'josephskaf%' OR lower(p.email) LIKE '%@shortsforgeai.com' OR lower(p.email) LIKE 'test%' OR lower(p.email) LIKE '%mailinator%' OR lower(p.email) LIKE 'smoketest%')))
 and not exists (select 1 from internal_sessions i where i.session_id=e.session_id)
 and (lower(coalesce(e.metadata->>'utm_source','')) in ('chatgpt','chatgpt.com')
   or lower(coalesce(e.metadata->>'referrer_host','')) in ('chatgpt','chatgpt.com')
   or lower(coalesce(e.metadata->>'source',''))='chatgpt')
group by 1 order by 1;

-- Cadastros na janela igual; não dividir por sessões como se fosse coorte.
select (p.created_at at time zone 'America/Sao_Paulo')::date day_brt,
 count(*) filter(where lower(coalesce(p.utm_source,''))='chatgpt') chatgpt,
 count(*) filter(where lower(coalesce(p.utm_source,'')) in ('chatgpt_gpt','assistant_link','paste_page')) other_handoff_labels
from profiles p where p.created_at >= '2026-09-03 03:00+00'
 and p.created_at < '2026-09-09 20:00+00'
 and (p.created_at at time zone 'America/Sao_Paulo')::time < '17:00'
 and NOT (lower(p.email) IN ('josephsskaf@gmail.com','josephskaf@hotmail.com','victoriaskaf96@gmail.com','joseph+teste01@gmail.com','teste01@shortsforgeai.com') OR lower(p.email) LIKE 'josephsskaf+%@gmail.com' OR lower(p.email) LIKE 'joseph+%@gmail.com' OR lower(p.email) LIKE '%@theresanaiforthat.com' OR lower(p.email) LIKE 'josephsskaf%' OR lower(p.email) LIKE 'josephskaf%' OR lower(p.email) LIKE '%@shortsforgeai.com' OR lower(p.email) LIKE 'test%' OR lower(p.email) LIKE '%mailinator%' OR lower(p.email) LIKE 'smoketest%')
group by 1 order by 1;

-- Não converter linhas sem vínculo em pessoas; evidência histórica de testes no diário.
select count(*) rows,count(user_id) linked,count(clicked_at) clicked,
 min(created_at),max(created_at) from gpt_handoffs;
