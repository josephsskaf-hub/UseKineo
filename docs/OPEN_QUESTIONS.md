# OPEN_QUESTIONS.md — O que ainda não se sabe, e como descobrir

**Data:** 2026-07-27 · Nenhuma destas foi executada. **Todas exigem autorização do fundador.**
🔑 = precisa de credencial (Supabase, Stripe ou painel Vercel)

Ordenadas por **valor de decisão**, não por esforço.

---

## BLOCO A — Segurança e integridade (respondem primeiro porque mudam a ordem de tudo)

### ~~Q-A1 `CRON_SECRET` está setada na Vercel?~~ ✅ **RESPONDIDA 2026-07-27 — SIM**

Confirmado pelo Joseph no painel da Vercel.

**Consequência:** o fail-open `if (!cronSecret) return true` **nunca dispara em produção**. Os 4 endpoints de e-mail **não estão públicos**. Riscos S1 e S2 de `ARCHITECTURE_AND_INTEGRATIONS.md` estão **fechados na prática**.

Continua valendo corrigir as 4 linhas — vira seguro barato contra a env ser removida ou renomeada um dia — mas **saiu da fila de urgência**.

---

### ~~Q-A1b A conta Vercel é Pro ou Hobby?~~ ✅ **RESPONDIDA 2026-07-27 — PRO**

Confirmado pelo Joseph. **Os três contornos de Hobby no código estão vencidos** e podem ser desfeitos:
1. O refund sweep pode sair da carona do `send-reminders` e ter cron próprio → **mata o ponto único de falha R2**
2. `send-activation-nudge` pode voltar de 30h para a janela de 6h que foi desenhada
3. Há espaço para agendar os 3 crons órfãos

Contexto original abaixo, mantido para rastreabilidade:

| Evidência de Pro | Evidência de Hobby (comentários no código) |
|---|---|
| `vercel.json:17` tem cron **horário** (`0 * * * *`) — Hobby só permite diário | `send-reminders/route.ts:40` — *"Vercel Hobby silently rejects deploys when cron limits are exceeded"* |
| `vercel.json` tem **4** crons — Hobby permite 2 | `send-activation-nudge/route.ts:101` — *"Window widened from 6h → 30h because Vercel Hobby only allows DAILY"* |
| `send-reminders/route.ts:16` — *"30 → 300 (**Vercel Pro**)"*, e `maxDuration = 300` | |

**Os dois comentários contraditórios estão no mesmo arquivo.**

**Se for Pro (o que a evidência indica):**
1. O refund sweep não precisa mais ficar de carona no `send-reminders` — pode ter cron próprio, o que remove o ponto único de falha do risco R2.
2. `send-activation-nudge` pode voltar à janela de 6h em vez de 30h.
3. Há espaço para agendar os 3 crons órfãos corretamente.

**Como:** painel Vercel → Settings → General (o plano aparece no topo).

### Q-A2 🔑 As 3 migrations de `migrations_pending/` foram aplicadas?
**Por quê:** decide se `/revive` está morto e se o SKU de $99 pode cobrar.
**Estado da contradição, já apurado em 27/07:**

| Arquivo | O arquivo diz | O commit HEAD diz | Veredito |
|---|---|---|---|
| `022_revive.sql:17` | "⚠️ NÃO APLICADA" | nada | **provavelmente pendente** → `/revive/<handle>` mostra "temporarily unavailable" para todo handle |
| `023_channels_lockdown.sql` | não declara pendência | "Aplicado em producao e conferido: grants de anon/authenticated vazios" | **aplicada** — sem exposição de token |
| `2026-07-26_autopilot_pilot_plan_expiry.sql` | "⚠️ NOT APPLIED… SKU is INERT" | "plan_expires_at ja esta APLICADA em producao" | **CONTRADIÇÃO REAL** |

**Como (3 queries, somente leitura):**
```sql
select column_name from information_schema.columns
  where table_schema='public' and table_name='profiles' and column_name='plan_expires_at';
select grantee, privilege_type from information_schema.role_table_grants
  where table_schema='public' and table_name='channels';
select to_regclass('public.revive_prospects'), to_regproc('public.revive_prospect_public');
```
**Se aplicadas:** mover os 3 arquivos para `supabase/migrations/` — a pasta `migrations_pending` está mentindo sobre produção.

### Q-A3 🔑 `KINEO_LIFECYCLE_EMAILS_ENABLED` está `true`?
Decide se o outbound de ciclo de vida está vivo. Combinado com R1 (4 crons não agendados), a recuperação de receita pode estar desligada por **dois motivos independentes**.

⚠️ **Atualização 27/07 — a pausa é DELIBERADA, não acidente.** `send-reminders/route.ts:56-59` documenta: *"All outbound below is paused **by default** because it overlaps other recovery jobs. Explicit opt-in is required to resume it after the current Lote 1 measurement gate."*

Então a pergunta real não é "está ligado?" — é: **o "Lote 1 measurement gate" já terminou?** Se sim, a pausa venceu e ninguém reativou. Se não, ela está correta e não deve ser mexida.

Nota: mesmo ligando o flag, `send-recovery`, `send-activation-nudge` e `send-video-rescue` **continuariam mortos** — não estão em `vercel.json`. O flag sozinho não resolve.

### Q-A4 🔑 Quais crons a Vercel realmente executa?
`vercel.json` lista 4; existem 8 rotas. Confirmar no painel se `send-activation-nudge`, `send-recovery`, `send-video-rescue` e `refresh-viral-now` estão de fato mortos.

---

## BLOCO B — As perguntas de negócio (ordenadas por valor de decisão)

### Q1 🔑 Quantas pessoas concluíram um vídeo? 128 ou 194?
**Bloqueia tudo.** Decide se o dinheiro vai para aquisição ou para produto — e as respostas divergem por 2×.
```sql
select count(distinct user_id) from videos where status='completed';
select count(distinct user_id) from videos;              -- sem filtro
```
Excluir `user_id` cujo e-mail casa com `lib/internalAccounts.ts`. A diferença **é** a contradição. Dividir cada um por perfis externos para as duas taxas.

### Q2 🔑 Quantas PESSOAS distintas abriram checkout, e quantas sessões cada uma gerou?
Refaz o diagnóstico de 23/07. Se a mediana de 4,6 se confirmar, o "92% de abandono" cai para ~60% e **o gargalo muda de lugar**.
Stripe: `GROUP BY metadata.supabase_user_id` sobre `checkout.sessions`, `mode='subscription'`, 90d. Separar sessões **sem** `supabase_user_id` como bucket "não identificado". Comparar com `count(*) from events where name='checkout_prefetch_blocked'` — quantos robôs a guarda do #97 já barrou.

### Q3 🔑 Depois do #97 e #103, quantas sessões de checkout são de gente?
Único jeito de saber se o gargalo de checkout ainda existe ou se **sempre foi robô**.
Contar `checkout_attempted`, `checkout_auth_required`, `checkout_started`, `checkout_failed`, `checkout_prefetch_blocked` **só com `created_at >= '2026-07-26'`**, separando `user_id IS NOT NULL`. Agrupar `checkout_failed` por `metadata.reason` — **primeira vez na história que esse dado existe.**

### Q4 🔑 Alguém conectou um canal do YouTube depois do #103?
O SKU de $299 tinha 0% no passo 1. Se ainda tiver, **o Autopilot não é vendável e a estratégia de 26/07 morreu**.
```sql
select count(*) from channels;
select name, count(*) from events
 where name like 'youtube_%' and created_at >= '2026-07-26' group by name;
```

### Q5 — `/api/admin/ceo` está mentindo o MRR agora mesmo? **(sem credencial)**
Já confirmado por leitura de código — ver `METRICS_AND_FUNNEL.md` §4.4.
**Ação pendente: perguntar ao Joseph qual tela ele usa de fato.** Se for essa, é o conserto de maior valor por linha no repositório.

### Q6 🔑 Qual o funil real do ChatGPT, a única fonte que já converteu?
Em 23/07: 4 cadastros → 2 vídeos → 2 checkouts, com n=4. Se aguentar n=40, é a resposta de aquisição.
`node scripts/measure-source-funnel.mjs --days=30` — ler o bloco `source:'chatgpt'` e comparar com `taaft` (17 cadastros, 0 checkout).

### Q7 🔑 Quanto tráfego o site recebe — e desde quando esse número existe?
Sem denominador não há taxa, e há um buraco de ~4 semanas.
```sql
select date_trunc('day', created_at), count(*) from events
 where name in ('homepage_view','landing_session_started') group by 1 order by 1;
```
**Sem credencial:** painel do Vercel Analytics (ligado no #98) e Search Console.

### Q8 🔑 Dos 88 eventos sem leitor, quais têm volume?
Uma query responde tudo — **e detecta inflação automaticamente** (qualquer razão eventos/atores >> 1 é candidato):
```sql
select name, count(*) as eventos,
       count(distinct coalesce(user_id::text, session_id)) as atores,
       min(created_at), max(created_at)
from events group by name order by eventos desc;
```

### Q9 🔑 Os 4 pagantes foram avulsos ou assinatura? Algum ainda é cliente?
Decide se a empresa **já provou que alguém paga recorrente**. Hoje a resposta parece ser "nunca".
Stripe: listar `payment_intents` e `subscriptions` (`status='all'`) desde o início, filtrar internos, classificar cada um dos 4 como `payment` ou `subscription`.

### Q10 🔑 A latência publicada em `/facts` e `/llms.txt` ainda é verdade?
A empresa publica "mediana 2,30 min, p90 3,50" como fato citável para o ChatGPT, com **n=12 de uma janela encerrada em 23/07**.
`node scripts/measure-render-latency.mjs --hours=168` e comparar com `lib/kineoFacts.ts:255-262`.

### Q11 🔑 Tráfego e conversão dos clusters não instrumentados
`/vs/*` (12 páginas), `/alternatives/*` (24), `/free-ai-shorts/*` (28) — 30 dias. Sem isso não dá para dizer se as ~106 URLs do sitemap são ativo ou custo de manutenção.

### Q12 — Search Console **(fora do repo)**
Impressões, cliques, CTR por página, 28 dias. Nenhum dado de SEO existe no repositório.

---

## BLOCO C — Divergência repo × produção

### Q-C1 🔑 O schema de produção é reproduzível a partir do repo?
**Não.** `migrations_pending/022_revive.sql` declara: *"supabase/migrations DIVERGE da produção porque várias colunas foram aplicadas à mão"*. Somado a migrations 002/018/019 ausentes e 009/010 duplicadas, **não dá para recriar o banco a partir do repo.**
Verificação: `pg_dump --schema-only` comparado com a soma das migrations. **Risco de recuperação, não de operação diária.**

### Q-C2 🔑 A tabela `revive_prospects` tem alguma linha?
`select count(*), count(contact_email), count(page_first_viewed_at) from revive_prospects;`
Esperado: 0 em tudo — confirmaria que o canal não existe operacionalmente.

---

## BLOCO D — Documentação faltante

### Q-D1 `docs/PRODUCTION_RUNBOOK.md` não foi escrito
Exigiria acesso a Vercel e Supabase, que ninguém teve no Ciclo 1. Precisa conter: variáveis de ambiente necessárias (nomes), o que fazer quando um render falha em massa, como reverter um deploy, quem tem acesso a quê, e o procedimento de rotação de segredo.

### Q-D2 O `CLAUDE.md` afirma fatos errados e é carregado em toda sessão
Ver `AGENTS.md` §2.1 e §2.2. **Corrigi-lo exige autorização** (é documentação canônica existente). Enquanto não for corrigido, `AGENTS.md` §2 é o antídoto.
