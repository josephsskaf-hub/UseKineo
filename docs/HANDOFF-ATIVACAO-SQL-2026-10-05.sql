-- HANDOFF-ATIVACAO-SQL-2026-10-05 — consultas de MEDIÇÃO da branch codex/nuvem-ativacao-previa-br-0310.
-- Todas são SÓ LEITURA. A sessão CEO roda e cola os números em docs/HANDOFF-ATIVACAO-2026-10-05.md.
-- Cada consulta diz: o que mede · qual decisão alimenta · resultado esperado se a hipótese estiver certa.
-- As marcadas "JÁ MEDIDA 03/10" rodaram antes da ordem de não usar o conector; o número está no handoff. Rodar de novo
-- só para atualizar.

-- ═══ SQL #1 (JÁ MEDIDA 03/10) — Ativação em 24 h por grupo de país, antes × depois da saída B ═══════════════════════
-- Mede: % de cadastros com filme 'completed' em até 24 h, por grupo (lista / BR / fora), antes e depois de 29/09 15:00 UTC.
-- Decisão: confirma que a queda é da política (e não de motor) e serve de linha de base da prévia e do BR.
-- Esperado: lista estável (~65%); BR e fora ~0% depois de 29/09. Medido em 03/10: lista 67,4% → 65,4%; BR 62,5% → 0%;
-- fora 57,3% → 0%.
with s as (
  select p.id, p.created_at, p.signup_country c,
    exists(select 1 from videos v where v.user_id = p.id and v.status = 'completed' and v.created_at < p.created_at + interval '24 hours') f24
  from profiles p where p.created_at >= '2026-08-30' and p.signup_country is not null
)
select case when created_at < '2026-09-29 15:00+00' then 'a_antes' else 'b_depois' end janela,
  case when c = 'BR' then 'BR'
       when c in ('US','CA','GB','IE','AU','NZ','AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE','NO','IS','LI','CH','JP','KR','SG','HK','TW','AE','SA','QA','KW','BH','OM','IL') then 'lista'
       else 'fora' end grupo,
  count(*) cadastros, count(*) filter (where f24) com_filme_24h, round(100.0 * count(*) filter (where f24) / nullif(count(*), 0), 1) pct
from s group by 1, 2 order by 1, 2;

-- ═══ SQL #2 (JÁ MEDIDA 03/10) — Pagantes BR na história ═══════════════════════════════════════════════════════════
-- Mede: pagamentos (payment_success) de quem tem signup_country='BR' ou pagou em BRL. metadata.customer_country vem nulo;
-- os sinais confiáveis são profiles.signup_country (preenchido nos 21 pagantes) e metadata.currency.
-- Decisão: Brasil de volta (Entrega 2) — o Brasil já pagou?
-- Esperado: ≥ 1. Medido em 03/10: 3 pessoas / 4 eventos (2 em jun/jul sem moeda; 1 Starter em BRL R$ 49,90 em 10/09).
select date(e.created_at) dia, lower(coalesce(e.metadata->>'currency', '?')) moeda, e.metadata->>'tier' tier,
  e.metadata->>'amount_total' valor, p.signup_country
from events e join profiles p on p.id = e.user_id
where e.name = 'payment_success' and (p.signup_country = 'BR' or lower(coalesce(e.metadata->>'currency', '')) = 'brl')
order by 1;

-- ═══ SQL #3 (JÁ MEDIDA 03/10) — Contas BR region_paid_only a recreditar ═══════════════════════════════════════════
-- Mede: contas que o GET /api/admin/br-recredit listaria (BR, region_paid_only, sem pagar).
-- Decisão: DECISÃO DO FUNDADOR PENDENTE — aplicar o recrédito (POST ?confirm=APPLY)?
-- Esperado: poucas (≈ 6 em 4 dias). Medido em 03/10: 6 contas → 60 créditos, no máximo 6 filmes de 15 s.
select count(distinct e.user_id) contas
from events e join profiles p on p.id = e.user_id
where e.name = 'trial_region_excluded' and e.metadata->>'country' = 'BR'
  and p.trial_status = 'region_paid_only' and coalesce(p.has_paid, false) = false;

-- ═══ SQL #4 (JÁ MEDIDA 03/10) — Uso real da cota semanal (o custo do BR depende dela) ═════════════════════════════
-- Mede: admissões e recargas da cota semanal (1 Seedance 15 s) desde 29/09; cadastros BR do último mês antes da saída B.
-- Decisão: custo mensal estimado da cota BR (Entrega 2).
-- Esperado: uso baixo. Medido em 03/10: 0 admissões no total; 4 recargas em 7 d; 56 cadastros BR em 30 d.
select 'admitidas_total' k, count(*) v from events where name = 'free_weekly_film_admitted'
union all select 'recargas_7d', count(*) from events where name = 'free_weekly_film_granted' and created_at > now() - interval '7 days'
union all select 'cadastros_BR_30d_antes_29_09', count(*) from profiles where signup_country = 'BR' and created_at between '2026-08-30' and '2026-09-29 15:00+00';

-- ═══ SQL #5 (DEPOIS DO DEPLOY) — Funil da prévia das cenas, por PESSOA ════════════════════════════════════════════
-- Mede: desviadas (routed) → viram a prévia (shown) → clicaram "Transformar em filme" → pagaram (payment_success depois
-- da prévia). Também as recusas por motivo.
-- Decisão: manter PREVIA_CENAS_PUBLIC=true e os tetos (1/dia, 3 no total, 200/dia global).
-- Esperado (hipótese do fundador): ≥ 50% das desviadas veem a prévia; ≥ 1 pagante em 7 dias entre quem viu.
with r as (select distinct user_id from events where name = 'scene_preview_routed'),
     v as (select user_id, min(created_at) t from events where name = 'scene_preview_shown' group by 1),
     c as (select distinct user_id from events where name = 'scene_preview_cta_clicked'),
     p as (select user_id, min(created_at) t from events where name = 'payment_success' group by 1)
select (select count(*) from r) desviadas, (select count(*) from v) viram, (select count(*) from c) clicaram,
       (select count(*) from v join p using (user_id) where p.t > v.t) pagaram_depois_da_previa;
select metadata->>'reason' motivo, count(*) from events where name = 'scene_preview_refused' group by 1 order by 2 desc;

-- ═══ SQL #6 (DEPOIS DO DEPLOY) — Custo medível da prévia ══════════════════════════════════════════════════════════
-- Mede: prévias mostradas, imagens e megapixels FLUX schnell, chamadas de roteiro (gravados em scene_preview_shown).
-- Decisão: custo por prévia (hoje DESCONHECIDO em US$): dividir a fatura da fal (fal-ai/flux/schnell) e da OpenAI
-- (gpt-4o) do período por estas contagens.
-- Esperado: ~4 imagens e ~2,4 MP por prévia.
select count(*) previas, sum((metadata->>'image_calls')::int) imagens, sum((metadata->>'image_megapixels')::numeric) megapixels,
  sum((metadata->>'script_calls')::int) roteiros
from events where name = 'scene_preview_shown';

-- ═══════════════════════════════ TAREFA 2 — ITEM A (o grupo de dentro) ═══════════════════════════════════════════════
-- As medições de base (30 d, países da lista, 206 pessoas) foram feitas em 03/10 antes da ordem de não usar o conector;
-- os números estão no handoff. As seguintes AGUARDAM SQL (depois do deploy).

-- ═══ SQL #7 — A ideia chega ao Studio novo depois do login? ═══════════════════════════════════════════════════════
-- Mede: de quem saiu do callback com idea_to_studio=true, quantos chegaram ao /studio com a ideia em até 1 h.
-- Decisão: manter IDEIA_POUSA_NO_STUDIO=true (lib/growth/ideiaPousaNoStudio.ts).
-- Esperado: ≥ 95%.
select count(distinct a.user_id) sairam_com_ideia, count(distinct s.user_id) chegaram_com_ideia
from events a
left join events s on s.user_id = a.user_id and s.name = 'studio_idea_arrived_v1'
  and s.metadata->>'has_prompt' = 'true' and s.created_at < a.created_at + interval '1 hour'
where a.name = 'auth_callback_completed' and a.metadata->>'idea_to_studio' = 'true';

-- ═══ SQL #8 — Geração em 1 h e pagantes entre quem digitou ideia: 14 d antes × 14 d depois do deploy ═════════════════
-- Mede: o efeito de trocar o auto-start pelo Studio preenchido (a 1 clique). Troque :deploy pela data do deploy.
-- Decisão: manter ou desligar IDEIA_POUSA_NO_STUDIO.
-- Esperado: filme em 1 h cai de 74% para 55–65%; a FRAÇÃO de pagantes não cai (auto-start pagou 0,6% × à mão 2,1% em 60 d).
with coh as (
  select p.id, p.created_at, p.has_paid, p.created_at >= timestamptz :'deploy' depois
  from profiles p
  where p.created_at between timestamptz :'deploy' - interval '14 days' and timestamptz :'deploy' + interval '14 days'
    and exists (select 1 from events e where e.user_id = p.id and e.name in ('auth_callback_completed', 'email_signup_completed') and e.metadata->>'has_prompt' = 'true')
)
select depois, count(*) pessoas,
  count(*) filter (where exists (select 1 from videos v where v.user_id = coh.id and v.created_at < coh.created_at + interval '1 hour')) filme_1h,
  count(*) filter (where has_paid) pagantes
from coh group by 1 order by 1;

-- ═══ SQL #9 — Contas sem crédito que recebiam a promessa "seu primeiro filme é grátis" ═══════════════════════════════
-- Mede: region_paid_only/blocked com activation_nudge_sent_at desde 29/09 (antes do conserto em 1934e4c1).
-- Decisão: confirmar que pular essas contas no lembrete vale a pena.
-- Esperado: > 0 (havia 39 contas region_paid_only em 30 d).
select count(*) from profiles
where trial_status in ('region_paid_only', 'blocked') and activation_nudge_sent_at > greatest('2026-09-29'::timestamptz, now() - interval '30 days');

-- ═══ SQL #10 — Cadastro Google que pousava no /studio ficava sem origem/conversão? ════════════════════════════════
-- Mede: novos cadastros do callback com destino /studio e signup_country nulo (o trackSignupSource não rodava lá).
-- Decisão: confirmar o bug antigo consertado de carona (StudioIdeaArrival no /studio).
-- Esperado: fração de signup_country nulo acima da média dos outros destinos.
select e.metadata->>'destination_path' destino, count(*) filter (where p.signup_country is null) sem_pais, count(*) total
from events e join profiles p on p.id = e.user_id
where e.name = 'auth_callback_completed' and e.metadata->>'is_new_user' = 'true'
group by 1 order by 3 desc limit 10;

-- ═══ SQL #11 — O lembrete com a ideia faz efeito? ═════════════════════════════════════════════════════════════════
-- Mede: lembretes enviados com/sem ideia e filme em até 48 h depois do envio, por pessoa.
-- Decisão: ligar LEMBRETE_COM_IDEIA='live' (lib/lifecycle/lembreteComIdeia.ts) — hoje 'dry_run'.
-- Esperado: com ideia, acima dos 10,6% de hoje (5 de 47 fizeram filme em 48 h depois do lembrete).
select n.metadata->>'with_idea' com_ideia, count(distinct n.user_id) pessoas,
  count(distinct n.user_id) filter (where exists (select 1 from videos v where v.user_id = n.user_id and v.created_at between n.created_at and n.created_at + interval '48 hours')) filme_48h
from events n where n.name = 'activation_nudge_sent' group by 1;

-- ═══════════════════════════ TAREFA 2 — ITEM C (afiliados) e TAREFA 3 (Kineo Partners) ════════════════════════════
-- As medições de base do item C (30 d) foram feitas em 03/10 antes da ordem; as consultas completas estão em
-- docs/queries/AFILIADOS-30D-2026-10-03.sql. As seguintes AGUARDAM SQL.

-- ═══ SQL #12 — O trial de cadastro libera mesmo 1 filme? ═══════════════════════════════════════════════════════════
-- Mede: trial_status e créditos do trial das contas novas de 7 dias.
-- Decisão: a copy nova da /partners ("os créditos de cadastro pagam 1 Seedance 1.5 de 15 s") é verdadeira.
-- Esperado: maioria 'active' com 10; o resto 'region_paid_only' com 0 (BR passa a 'active' depois do deploy).
select trial_status, count(*), round(avg(trial_credits_granted)) from profiles where created_at > now() - interval '7 days' group by 1;

-- ═══ SQL #13 — Remendos manuais de cortesia em uso ═════════════════════════════════════════════════════════════════
-- Mede: contas com plano *_trial trocado à mão (sem assinatura), que o /admin contava como "trial de $1".
-- Decisão: migrar essas contas para courtesy_grants (com fim e plano anterior) depois da migration 20261003120000.
-- Esperado: algumas contas, todas sem stripe_subscription_id.
select plan, count(*) from profiles where plan like '%\_trial' and stripe_subscription_id is null group by 1;

-- ═══ SQL #14 — Custo de dar a etapa 1 do pacote a quem já é afiliado ═══════════════════════════════════════════════
-- Mede: afiliados ativos com conta grátis (excluída a casa) — elegíveis ao pacote de demonstração.
-- Decisão: DECISÃO DO FUNDADOR PENDENTE — ligar PARTNER_PACK_LIVE (lib/partnerPack.ts) e o custo (25 a 50 cr por pessoa).
-- Esperado: perto de 20.
select count(*) from affiliates a join profiles p on p.id = a.user_id
where a.status = 'active' and coalesce(p.plan, 'free') = 'free'
  and not (a.email ilike '%josephsskaf%' or a.email ilike '%usekineo%' or a.email ilike '%shortsforge%');

-- ═══ SQL #15 — Cliques de afiliado sem robô e cadastros atribuídos (repetir em 7 dias) ═════════════════════════════
-- Mede: cliques humanos (os robôs declarados deixam de contar a partir do deploy) e perfis carimbados com afiliado.
-- Decisão: onde a cadeia rompe — hoje é clique → cadastro (0 cadastros em 30 d, 42 cliques humanos).
-- Esperado: cliques humanos ≈ cliques totais depois do deploy; cadastros atribuídos ≥ 1 se o kit do parceiro sair.
select count(*) cliques, count(*) filter (where created_at > now() - interval '7 days') cliques_7d from affiliate_clicks where created_at > now() - interval '30 days';
select count(*) perfis_com_afiliado from profiles where created_at > now() - interval '30 days' and affiliate_id is not null;
