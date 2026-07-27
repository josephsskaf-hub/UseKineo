# ARCHITECTURE_AND_INTEGRATIONS.md

**Data:** 2026-07-27 · **Base:** commit `a517879` · Estados usam a taxonomia de `AGENTS.md` §4.

---

## 1. ARQUITETURA CONFIRMADA

```
Browser
  → middleware.ts  (308 host legado → www.usekineo.com; updateSession Supabase;
                    protege APENAS /history e /library)
  → Next 14.2.5 App Router  (~78 páginas, 116 rotas de API)

AUTH      Supabase @supabase/ssr por cookie.
          Admin = allowlist de 3 e-mails hardcoded, checada NO SERVIDOR em 21 arquivos.
          Não há coluna de role no banco.

DINHEIRO  Stripe (VIVO): checkout 1891 linhas + webhook 1182 linhas,
                         assinatura verificada, dedupe por event.id em stripe_events
          PayPal (VIVO): linkado no /pricing
          MercadoPago + Hotmart (ÓRFÃOS): código completo, zero chamador, fail-closed
          Fonte única de preço: lib/checkoutPricing.ts
          Custo por engine:      lib/credits/engineCost.ts

PRODUTO   /generate → generate-script → analyze-idea → generate-broll-plan (lib/broll/*)
          → generate-video-fast | -cinematic (fal.ai) | generate-avatar (VEED)
          → /api/compose → Creatomate → /api/compose/status
          → débito na LIQUIDAÇÃO → tabela videos
          Refund automático via RPC refund_render_credits + varredura diária

AUTOPILOT cron horário → autopilot_schedules → pipeline → /api/youtube/upload
          (OAuth, tabela channels)

DADOS     Supabase Postgres.
          supabase/migrations (21 arquivos) + migrations_pending (3) + 6 .sql soltos na raiz

OBSERV.   tabela events (sink /api/events + lib/serverEvents) e console.log da Vercel.
          Só isso.
```

---

## 2. MAPA DE INTEGRAÇÕES

| Integração | Estado | Evidência | Risco se falhar |
|---|---|---|---|
| **Stripe** | **VALIDADO EM PRODUÇÃO** | `webhook/route.ts:252` assinatura; `:273-306` dedupe | Receita para 100% |
| **PayPal** | **IMPLEMENTADO + VIVO** | `PricingClient.tsx:621`; `paypal/webhook/route.ts:38` | 2º gateway sem painel próprio |
| **MercadoPago** | **ÓRFÃO**, fail-closed | `lib/mercadopago.ts:24` | Nenhum hoje |
| **Hotmart** | **ÓRFÃO**, fail-closed | `lib/hotmart.ts:29` | Nenhum hoje |
| **Supabase** | **VALIDADO EM PRODUÇÃO** | service-role em ~40 rotas | Produto inteiro |
| **OpenAI** | **VALIDADO EM PRODUÇÃO** | `lib/openai.ts` | Pipeline de roteiro |
| **Creatomate** | **VALIDADO EM PRODUÇÃO** | `app/api/compose/route.ts` (1807 linhas) | Render = produto |
| **fal.ai** | **VALIDADO EM PRODUÇÃO** | `lib/falAlert.ts:18` | Engines cinematic/avatar |
| **Pexels / Pixabay** | IMPLEMENTADO com fallback | `lib/pexels.ts`, `lib/pixabay.ts` | B-roll degrada, não quebra |
| **Resend** | **CONFIGURADO + PARCIALMENTE PAUSADO** | flag `KINEO_LIFECYCLE_EMAILS_ENABLED` | Recuperação de receita |
| **YouTube OAuth + upload** | **IMPLEMENTADO, PROD NÃO VALIDADO** | `youtube/callback/route.ts` | Autopilot não entrega |
| **Vercel Cron** | **PARCIAL — 4 de 8** | `vercel.json` vs `app/api/cron/` | ver §3 |
| **Vercel Analytics** | CONFIGURADO (a partir do #98) | `package.json` | — |
| **Rewardful / afiliados** | IMPLEMENTADO, ledger próprio | `webhook/route.ts:85-130` | Comissão duplicada (já tratado) |
| **Sentry / monitoramento** | **NÃO EXISTE** | grep vazio | ver §4 |
| **CI / testes** | **NÃO EXISTE** | sem `.github/`, zero `*.test.*` | ver `AGENTS.md` §6.3 |

---

## 3. 🔴 RISCO DE PERDER DINHEIRO

### R1 — 4 das 8 rotas de cron nunca rodam
`vercel.json` agenda: `reset-cinematic-tokens`, `send-reminders`, `refresh-niche-trends`, `autopilot-generate`.

**Nunca disparam:**
- `app/api/cron/send-recovery/route.ts` (255 linhas)
- `app/api/cron/send-activation-nudge/route.ts`
- `app/api/cron/send-video-rescue/route.ts`
- `app/api/cron/refresh-viral-now/route.ts` → os cards de "Viral Now" servem o mesmo conteúdo desde sempre

Com **713 cadastros e 4 pagantes**, três máquinas de recuperação de receita construídas e não plugadas é o custo mais direto do repositório.

⚠️ **Ligar as quatro sem desenhar a matriz de sobreposição = spam.** Elas se sobrepõem entre si e com `send-abandon-recovery`/`send-free-upsell`, que já rodam de dentro do `send-reminders`. É decisão de negócio, não técnica.

### R2 — O auto-refund depende de um único cron diário
`lib/credits/refund.ts:79` é chamado só de `send-reminders/route.ts:46`. Se `send-reminders` falhar, ninguém é reembolsado e ninguém fica sabendo. O sweep roda **antes** do portão `LIFECYCLE_EMAILS_ENABLED` — é a única razão de ainda funcionar com os e-mails pausados. **Não inverta essa ordem.**

⚠️ **A justificativa desse acoplamento pode estar vencida.** O comentário em `send-reminders/route.ts:40` diz que o sweep pegou carona *"em vez de uma nova entrada no vercel.json (Vercel **Hobby** silently rejects deploys when cron limits are exceeded)"*. Mas o mesmo arquivo, na linha 16, diz *"(Vercel **Pro**)"*, e `vercel.json:17` tem um cron **horário** — que o plano Hobby não permite. Se a conta é Pro, o sweep pode ter cron próprio e este ponto único de falha some. Ver `OPEN_QUESTIONS.md` Q-A1b.

### R5 — O outbound está pausado por decisão, não por acidente
`send-reminders/route.ts:56-59`: *"All outbound below is paused **by default** because it overlaps other recovery jobs. Explicit opt-in is required to resume it after the current Lote 1 measurement gate."*

A pausa é deliberada e bem justificada. **A pergunta aberta é se o "Lote 1 measurement gate" já terminou** — se sim, a pausa venceu e ninguém reativou. Ver `OPEN_QUESTIONS.md` Q-A3.

### R3 — Dois gateways de assinatura, um só painel, três listas de conta interna divergentes
`lib/internalAccounts.ts` tem 5 e-mails + 9 padrões · os webhooks têm 4 · `ADMIN_EMAILS` tem 3. MRR e proteção de conta dependem de listas que ninguém sincroniza.

### R4 — MercadoPago e Hotmart concedem crédito sem dono
Os dois webhooks concedem `video_credits` com service-role. Fail-closed hoje. O risco é alguém setar a env um dia para um teste e ativar um caminho de crédito que nenhuma tela de admin conta.

---

## 4. 🔴 RISCO DE SEGURANÇA

**Nenhum segredo real vazado em arquivo rastreado.** Varredura completa do índice do git com padrões `sk-`, `sk_live_`, `whsec_`, `re_`, JWT Supabase, `AIza`, `GOCSPX-`, `xoxb-`. Único achado: `.env.local.example:4` e `DEPLOY.md:91`, ambos placeholder. `.env.local` está no `.gitignore` e não rastreado. ✅

### ~~S1 — 4 crons de e-mail falham ABERTO sem `CRON_SECRET`~~ ✅ FECHADO NA PRÁTICA (27/07)

**`CRON_SECRET` está setada na Vercel** — confirmado pelo Joseph em 27/07/2026.

```
send-reminders/route.ts:29         if (!cronSecret) return true
send-recovery/route.ts:53          if (!cronSecret) return true
send-activation-nudge/route.ts:40  if (!cronSecret) return true
send-video-rescue/route.ts:47      if (!cronSecret) return true
```

Com a env presente, esse ramo **nunca executa**. Os 4 endpoints **não estão públicos**. A comparação `auth === Bearer ${cronSecret}` funciona corretamente.

Corrigir as 4 linhas (`return true` → `return false`) continua valendo como **seguro barato** contra a env ser removida ou renomeada. Padrão correto já no repo: `autopilot-generate/route.ts:78`. **Não é urgente.**

### ~~S2 — `Bearer undefined` passa~~ ✅ FECHADO NA PRÁTICA (27/07)
`refresh-niche-trends/route.ts:95` e `refresh-viral-now/route.ts:13` comparam sem checar existência da env. Com `CRON_SECRET` setada, a comparação é válida. Mesmo raciocínio de S1: hardening, não urgência.

### S3 — `/api/admin/flag-video` só exige estar logado
`admin/flag-video/route.ts:20-23`: qualquer usuário autenticado escreve em `broll_metrics` para **qualquer** `render_id`, via service-role. Órfão, impacto real baixo (polui analytics de B-roll), mas mora sob `/api/admin/` e sugere proteção que não existe.

### S4 — `/api/events` é sink anônimo sem rate-limit
O desenho é correto (identidade sempre do cookie; 20 eventos críticos só o servidor escreve). Mas qualquer anônimo insere linhas ilimitadas. Rate-limit existe em **um** lugar no repo inteiro: `public/viral-score/route.ts:20`.

### S5 — Admin = 3 e-mails, sem MFA, replicado 21 vezes
As 21 cópias de `ADMIN_EMAILS` estão idênticas hoje (verificado por `sort -u`). Não é bug — é superfície onde a próxima edição diverge em silêncio. `joseph-test@shortsforgeai.com` concede admin total e depende do domínio antigo continuar sob controle.

### S6 — Sem headers de segurança
`next.config.js` não define `headers()`: sem CSP, HSTS, X-Frame-Options.

---

## 5. RISCO DE QUEBRAR PARA O USUÁRIO

### U1 — O build não valida tipo nem lint
`next.config.js:77-81`. Sem CI, sem teste. Ver `AGENTS.md` §6.3.
⚠️ Virar `ignoreBuildErrors` para `false` **trava todo deploy, inclusive hotfix**, se a árvore não estiver em 0 erros. Medir antes.

### U2 — Não existe forma de saber que uma geração falhou sem o usuário reclamar
Único alarme do sistema: saldo do fal.ai (`lib/falAlert.ts`), com throttle de 30 min **por instância de lambda** — em serverless isso não é throttle global, é N e-mails por N lambdas frias.

Não há alerta de taxa de falha de render, de 5xx, nem de queda de conversão. O cliente é ressarcido em silêncio e vai embora em silêncio.

---

## 6. CÓDIGO MORTO — quantificado

| Item | Quantidade |
|---|---|
| Componentes React nunca importados | **11 arquivos, 2.872 linhas** |
| Módulo de lib órfão | `lib/broll/caption-engine.ts` |
| Backup solto na raiz | `_success_page_backup.tsx` |
| Rotas de API sem chamador | **21 de 116 (18%)** — ~5 são falsos positivos (chamadas por template string) |
| Órfãos genuinamente ativáveis por URL | ~16 endpoints públicos que ninguém monitora |
| Migrations com numeração quebrada | 002, 018, 019 **ausentes**; 009 e 010 **duplicadas** → ordem não determinística |
| `.sql` soltos na raiz, fora de migration | 6 |

---

## 7. SISTEMAS FALTANTES (com necessidade comercial comprovada)

1. **Alerta de falha do pipeline.** Comprovado: o #96 registra "20 de 70 sessões abriram /generate e não emitiram NENHUM evento" — botão morto, descoberto por análise manual, depois do fato.
2. **Gate de tipo antes do deploy.** Comprovado: 21 erros de `tsc` carregados por múltiplos pushes.
3. **Um lugar só para agendamento.** O modo de falha R1 já aconteceu e ninguém percebeu.

**Não listados** (sem necessidade comercial hoje): refatorar `ADMIN_EMAILS`, extrair módulos, limpar a raiz, suite de testes.
