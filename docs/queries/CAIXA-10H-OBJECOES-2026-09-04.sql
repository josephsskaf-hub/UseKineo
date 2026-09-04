-- SOMENTE SELECT. Janela móvel: conservar measured_at junto ao resultado.
-- Pré-seleção agregada, nunca autorização de contato. Sem e-mails/IDs exportados.
WITH ext AS (SELECT id,created_at FROM auth.users WHERE email IS NOT NULL AND NOT (lower(email) IN ('josephsskaf@gmail.com','josephskaf@hotmail.com','victoriaskaf96@gmail.com','joseph+teste01@gmail.com','teste01@shortsforgeai.com') OR lower(email) LIKE ANY (ARRAY['josephsskaf+%@gmail.com','joseph+%@gmail.com','%@theresanaiforthat.com','josephsskaf%','josephskaf%','%@shortsforgeai.com','test%','%mailinator%','smoketest%'])))
SELECT now() measured_at,e.name,CASE WHEN e.name='checkout_cancel_reason' THEN e.metadata->>'reason' ELSE NULL END reason,
count(DISTINCT e.user_id) people,count(*) events,min(e.created_at) first_at,max(e.created_at) last_at
FROM public.events e JOIN ext ON ext.id=e.user_id
WHERE e.created_at>=now()-interval '7 days' AND e.name IN ('checkout_cancel_reason','checkout_cancel_objection_viewed','checkout_cancelled')
GROUP BY e.name,CASE WHEN e.name='checkout_cancel_reason' THEN e.metadata->>'reason' ELSE NULL END ORDER BY e.name,reason;

