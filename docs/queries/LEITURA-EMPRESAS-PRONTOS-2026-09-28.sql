-- Leitura dos 5 anúncios prontos enviados às empresas (Cowork, 28/09 01:26–01:30 BRT).
-- Corte = 2026-09-28 04:26 UTC (hora do 1º envio). Ler em 30/09 e em 05/10 (7 dias).
-- Relatórios: docs/COWORK-10-ANUNCIOS-2026-09-27.md (produção) e docs/COWORK-ENVIO-5-ANUNCIOS-2026-09-28.md (envio).
-- Os 5 e-mails ficam no banco (profiles), nunca aqui. Contas: b7066286 (eCredit), ca71cf11 (SmartTender),
-- 16aa454a (Tenerife), 163c2455 (RUIS), c2773408 (MadLabs).

-- 1) Visitas às páginas públicas /v/<id> dos 5 filmes (qualquer visitante; separar sonda por ip_hash se preciso).
select split_part(path, '/', 3) video_id, count(*) eventos, count(distinct session_id) sessoes,
       to_char(min(created_at), 'MM-DD HH24:MI') primeira, to_char(max(created_at), 'MM-DD HH24:MI') ultima
from events
where created_at > '2026-09-28 04:26:00+00'::timestamptz
  and path in ('/v/4375f641-164e-4f66-936b-8bf5fd95e915', '/v/33b343e6-9ab6-4fdf-a9f6-9b84b45d6ea4',
               '/v/ddebd142-2353-41b1-9c72-0f05def385eb', '/v/fb441168-44b6-4ce5-b8f8-e83dc9554240',
               '/v/a414e137-4fc3-44fa-948d-156a4303d3b1')
group by 1 order by 1;

-- 2) Visitas a /ads/new vindas do e-mail, por empresa. O Gmail pode entregar o utm codificado (%3D/%26):
--    olhar as duas colunas de campanha (metadata utm_campaign e o path/query cru) — memória duas-colunas-de-campanha-um-zero-falso.
select coalesce(metadata->>'utm_content', substring(path from 'utm_content(?:=|%3D)([a-z]+)')) empresa,
       count(*) eventos, count(distinct session_id) sessoes, count(distinct user_id) pessoas
from events
where created_at > '2026-09-28 04:26:00+00'::timestamptz
  and (metadata->>'utm_campaign' = 'empresas_prontos' or path ilike '%empresas_prontos%')
group by 1 order by 1;

-- 3) Por conta: voltou ao site, fez anúncio, abriu checkout, comprou (7 dias).
select left(p.email, 4) || '…' quem,
       exists (select 1 from events e where e.user_id = p.id and e.name = 'landing_session_started' and e.created_at > '2026-09-28 04:26:00+00'::timestamptz) voltou,
       exists (select 1 from events e where e.user_id = p.id and e.name in ('ads_auto_started', 'ads_link_read') and e.created_at > '2026-09-28 04:26:00+00'::timestamptz) mexeu_no_ads,
       exists (select 1 from events e where e.user_id = p.id and e.name = 'checkout_started' and e.created_at > '2026-09-28 04:26:00+00'::timestamptz) checkout,
       exists (select 1 from events e where e.user_id = p.id and e.name = 'payment_success' and e.created_at > '2026-09-28 04:26:00+00'::timestamptz) pagou
from profiles p
where p.id in ('b7066286-a0a3-41c8-b599-89f2a2d3c263', 'ca71cf11-b801-4f26-9100-d5a27f5e833f', '16aa454a-2ef3-4e6d-bc53-0bece84290d7',
               '163c2455-e627-46c6-a647-62c7f60d4372', 'c2773408-9ff8-4964-9679-0dff213347d7');
