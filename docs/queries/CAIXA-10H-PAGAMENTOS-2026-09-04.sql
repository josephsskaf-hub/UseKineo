-- SOMENTE SELECT. Histórico do webhook; não é MRR atual nem receita bancária reconciliada.
-- Consulta 1: cobertura dos campos, pessoas canônicas externas; grupos podem se sobrepor.
WITH ext AS (SELECT id,created_at FROM auth.users WHERE email IS NOT NULL AND NOT (lower(email) IN ('josephsskaf@gmail.com','josephskaf@hotmail.com','victoriaskaf96@gmail.com','joseph+teste01@gmail.com','teste01@shortsforgeai.com') OR lower(email) LIKE ANY (ARRAY['josephsskaf+%@gmail.com','joseph+%@gmail.com','%@theresanaiforthat.com','josephsskaf%','josephskaf%','%@shortsforgeai.com','test%','%mailinator%','smoketest%'])))
SELECT now() measured_at,coalesce(e.metadata->>'source','missing') source,coalesce(e.metadata->>'checkout_mode','missing') checkout_mode,coalesce(e.metadata->>'tier','missing') tier,
count(*) events,count(DISTINCT e.user_id) people,count(DISTINCT e.metadata->>'stripe_session_id') stripe_sessions,
count(*) FILTER(WHERE nullif(e.metadata->>'stripe_subscription_id','') IS NOT NULL) with_subscription_id,
count(*) FILTER(WHERE CASE WHEN e.metadata->>'amount_total' ~ '^[0-9]+$' THEN (e.metadata->>'amount_total')::numeric>0 ELSE false END) with_positive_amount,
min(e.created_at) first_at,max(e.created_at) last_at
FROM public.events e JOIN ext ON ext.id=e.user_id WHERE e.name='payment_success'
GROUP BY e.metadata->>'source',e.metadata->>'checkout_mode',e.metadata->>'tier' ORDER BY first_at;

-- Consulta 2: faixa de filmes ANTES da primeira assinatura B2C registrada, por pessoa.
-- Não calcular taxa causal com não pagantes observados por prazos diferentes.
WITH ext AS (SELECT id,created_at FROM auth.users WHERE email IS NOT NULL AND NOT (lower(email) IN ('josephsskaf@gmail.com','josephskaf@hotmail.com','victoriaskaf96@gmail.com','joseph+teste01@gmail.com','teste01@shortsforgeai.com') OR lower(email) LIKE ANY (ARRAY['josephsskaf+%@gmail.com','joseph+%@gmail.com','%@theresanaiforthat.com','josephsskaf%','josephskaf%','%@shortsforgeai.com','test%','%mailinator%','smoketest%']))), paid AS (
SELECT DISTINCT ON(e.metadata->>'stripe_session_id') e.user_id,e.created_at,e.metadata
FROM public.events e JOIN ext ON ext.id=e.user_id WHERE e.name='payment_success'
AND e.metadata->>'source'='stripe_webhook' AND nullif(e.metadata->>'stripe_session_id','') IS NOT NULL
AND CASE WHEN e.metadata->>'amount_total' ~ '^[0-9]+$' THEN (e.metadata->>'amount_total')::numeric>0 ELSE false END
ORDER BY e.metadata->>'stripe_session_id',e.created_at),
first_sub AS (SELECT user_id,min(created_at) paid_at FROM paid
WHERE metadata->>'checkout_mode'='subscription' AND nullif(metadata->>'stripe_subscription_id','') IS NOT NULL
AND metadata->>'tier' IN ('starter','basic','pro','creator','studio') GROUP BY user_id),
film_counts AS (SELECT f.user_id,f.paid_at,(SELECT count(*) FROM public.videos v WHERE v.user_id=f.user_id AND v.status='completed' AND v.created_at<f.paid_at) films_before FROM first_sub f)
SELECT now() measured_at,CASE WHEN films_before=0 THEN '0' WHEN films_before=1 THEN '1' WHEN films_before BETWEEN 2 AND 3 THEN '2-3' ELSE '4+' END films_before_first_subscription,count(*) first_b2c_subscribers,min(paid_at) first_at,max(paid_at) last_at
FROM film_counts GROUP BY 2 ORDER BY 2;

