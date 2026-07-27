# workstreams/DEVELOPMENT.md — Development & Systems

**Leia antes:** `AGENTS.md` → `docs/PROJECT_STATE.md` → `docs/ARCHITECTURE_AND_INTEGRATIONS.md` → este arquivo.

---

## ESCOPO
Arquitetura, componentes, APIs, banco, auth, pagamentos, integrações, CRM, analytics, automações, agentes de IA, segurança, privacidade, observabilidade, logs, testes, performance, deploy, recuperação, escalabilidade.

## REGRA DE ENTRADA
**Development não cria sistema sem necessidade comercial confirmada.** Se algo é tecnicamente feio mas não custa dinheiro nem quebra usuário, é **dívida tolerável** — diga isso e siga.

Proponha o que reduz risco de **dinheiro**, **segurança** ou **quebra para o usuário**. Nessa ordem.

---

## TAXONOMIA OBRIGATÓRIA
Todo componente do sistema recebe um destes rótulos. Nunca presuma que porque o código existe, ele funciona.

**IMPLEMENTADO** (código existe, cite `caminho:linha`) · **CONFIGURADO** (env/webhook/cron declarado) · **TESTADO LOCALMENTE** (só com evidência em arquivo) · **VALIDADO EM PRODUÇÃO** (só com log real, cite a data) · **BLOQUEADO** · **ÓRFÃO/MORTO**

Prova de que isso importa neste repo: **21 de 116 rotas de API não têm chamador** e **11 componentes React (2.872 linhas) nunca são importados**.

---

## ARMADILHAS ESPECÍFICAS DESTE REPO

### O build não valida nada
`next.config.js:77-81` — `ignoreBuildErrors: true` e `ignoreDuringBuilds: true`. Sem CI, sem teste. **Rode `npx tsc --noEmit` antes de propor qualquer entrega.**

### Escrever a rota não coloca o cron no ar
8 rotas em `app/api/cron/`, 4 agendamentos em `vercel.json`. Ver `ARCHITECTURE_AND_INTEGRATIONS.md` §R1.

### Padrão de autenticação de cron
```ts
if (!cronSecret) return false   // ✅ autopilot-generate/route.ts:78
if (!cronSecret) return true    // ❌ fail-open — endpoint público
```

### O refund depende de um único cron
`lib/credits/refund.ts:79` só é chamado de `send-reminders/route.ts:46`, e roda **antes** do portão `LIFECYCLE_EMAILS_ENABLED`. **Não inverta essa ordem** — é a única razão de o refund ainda funcionar com os e-mails pausados.

### `migrations/` não é reproduzível
Migrations 002/018/019 ausentes, 009 e 010 duplicadas, 6 `.sql` soltos na raiz, e o próprio repo declara que colunas foram aplicadas à mão. **Não dá para recriar o banco a partir do repo.** Risco de recuperação, não de operação diária.

### Nunca imprima valor de segredo
Nome de variável pode. Valor, jamais. Não leia `.env.local`.

---

## ESTADO DE SEGURANÇA (27/07)

✅ **Nenhum segredo vazado** em arquivo rastreado — varredura completa do índice do git.
✅ `023_channels_lockdown` **aplicada** — não há exposição de `refresh_token` do YouTube.

🔴 Abertos: fail-open de `CRON_SECRET` em 4 crons de e-mail · `Bearer undefined` passa em 2 rotas · `/api/admin/flag-video` só exige login · `/api/events` sem rate-limit · sem headers de segurança. Detalhe em `ARCHITECTURE_AND_INTEGRATIONS.md` §4.

---

## PRIORIDADE ATUAL
Ver `ROADMAP.md` §1 e §4. A primeira recomendação técnica é **não escrever código**: confirmar `CRON_SECRET` e rodar as 3 queries de schema. Nenhuma decisão da lista sobrevive a essas respostas sem mudar.
