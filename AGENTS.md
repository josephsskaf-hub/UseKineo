# AGENTS.md — Regras operacionais para toda tarefa neste repositório

**Última atualização:** 2026-07-27 · **Escrito por:** CEO operacional, a partir do Ciclo 1 de auditoria (4 especialistas, somente leitura) · **Autorizado por:** Joseph Skaf

Este arquivo manda. Se algum outro documento contradizer o que está aqui, este vence — exceto quando o **código** contradizer este arquivo, e aí o código vence e este arquivo deve ser corrigido.

---

## 1. ANTES DE AGIR — checklist obrigatório

1. Confirme o repositório: `C:\Users\josep\OneDrive\Área de Trabalho\Usekineo`, branch `main`, remoto único `origin` = `https://github.com/josephsskaf-hub/UseKineo.git`.
2. Leia este arquivo inteiro.
3. Leia `docs/PROJECT_STATE.md` (estado real) e `docs/OPEN_QUESTIONS.md` (o que ainda não se sabe).
4. Leia o documento do seu workstream em `docs/workstreams/`.
5. Verifique o **código real** antes de afirmar qualquer coisa. Documento pode estar velho; código não.
6. Não confie em memória de chat.

---

## 2. ⚠️ FATOS QUE CONTRADIZEM DOCUMENTOS EXISTENTES

Estes erros já custaram receita. Não os repita.

### 2.1 O domínio de produção é `www.usekineo.com`

**Não é `shortsforgeai.com`.** O `CLAUDE.md` afirma o contrário e está **errado**.

- Evidência: `middleware.ts:52` faz 308 permanente para `www.usekineo.com`; `app/sitemap.ts:10` canoniza para lá; `app/robots.ts:5` idem.
- `shortsforgeai.com` é host legado com redirect.
- **Custo real dessa deriva:** `redirect_uri_mismatch` deixou **100% das conexões de canal do YouTube falhando** — o passo 1 do SKU de $299/mês teve taxa de sucesso 0% até o PUSH #103 (26/07/2026). Fonte: `push_103_msg.txt:9`.
- Ainda existem ~35 arquivos em `app/`, `components/`, `lib/` com referência a `shortsforgeai`.

### 2.2 O `CLAUDE.md` está desatualizado e deve ser tratado como histórico

Ele declara "v3.0 / v2.5", afirma o domínio errado (§2.1), e dedica duas seções a um workflow manual de InVideo que **não tem relação com este app** (InVideo aparece no código apenas como concorrente, em `lib/comparisons.ts`). Não existe `v3.0` nem `v2.5` no código — a versão real é o commit.

Regra: **não use o `CLAUDE.md` como fonte de fato sobre o produto.** Use `docs/PROJECT_STATE.md`.

### 2.3 A fonte única de preço é `lib/checkoutPricing.ts`

Quatro documentos afirmam preços diferentes (ver `docs/PRODUCT_AND_OFFER.md` §contradições). Só `lib/checkoutPricing.ts` é fonte de verdade, e é ela que `checkPricingInvariants()` protege.

**Nunca escreva preço como string literal em JSX.** Foi o padrão que produziu três vazamentos de preço errado (o mais recente: UI anunciando $11,90 quando o cobrado era $9,90).

---

## 3. GATES DE AUTORIZAÇÃO

### 3.1 Pode fazer sem perguntar
Ler arquivo · inspecionar código · `git log` / `git show` / `git status` / `git diff` · analisar · comparar documentos · produzir plano ou relatório · `npx tsc --noEmit` (não escreve nada).

### 3.2 Exige autorização explícita do fundador
- Modificar código ou documentação canônica
- `git add`, `commit`, `push`, `merge`, `rebase`, `checkout` de outra branch
- Build ou deploy
- Criar ou aplicar migration · qualquer escrita em banco
- Rodar qualquer script de `scripts/` (todos tocam produção via service-role)
- Usar credencial, MCP de Supabase, Vercel, Gmail
- Enviar e-mail, mensagem, outreach ou follow-up — **inclusive rascunho**
- Mudar preço, oferta, promessa ou termos
- Excluir ou sobrescrever dado
- Qualquer ação difícil de reverter

### 3.3 Nunca
- Imprimir valor de segredo. Nome de variável pode; valor, jamais.
- Ler ou expor `.env.local`.
- Iniciar comunicação externa por conta própria.

---

## 4. VOCABULÁRIO OBRIGATÓRIO DE CLASSIFICAÇÃO

Toda afirmação em relatório ou documento deve carregar um destes rótulos:

| Rótulo | Significa |
|---|---|
| **FATO CONFIRMADO** | Você leu no código. Cite `caminho:linha`. |
| **EVIDÊNCIA DE PRODUÇÃO** | Veio de log/relatório real. Cite fonte **e data**. |
| **DECISÃO APROVADA** | Está em `docs/DECISIONS.md`. |
| **HIPÓTESE** | Sua leitura, não verificada. |
| **SUGESTÃO** | Proposta sua. |
| **CONTRADIÇÃO** | Duas fontes discordam. Cite as duas. |
| **QUESTÃO PENDENTE / DESCONHECIDO** | Falta dado. **Resposta de alto valor — use sem hesitar.** |

Para estado de sistema, use também: **IMPLEMENTADO** (código existe) · **CONFIGURADO** (env/webhook/cron declarado) · **TESTADO LOCALMENTE** · **VALIDADO EM PRODUÇÃO** (com data) · **BLOQUEADO** · **ÓRFÃO/MORTO** (existe e ninguém chama).

**Nunca presuma que porque o código existe, ele funciona.** Este repositório tem 21 de 116 rotas de API sem chamador e 11 componentes React (2.872 linhas) nunca importados.

---

## 5. REGRA DE OURO SOBRE NÚMEROS

1. **Nunca estime. Nunca interpole. Nunca some janelas de datas diferentes.**
2. Todo número precisa de **fonte e data**. Sem data, escreva "sem data".
3. **Conte pessoas, não eventos.** O erro mais caro do histórico deste repo foi contar sessão como pessoa: "48 aberturas de checkout" eram ~10 pessoas (mediana de 4,6 sessões por pessoa), e o "92% de abandono" real era ~60%.
4. Não conte como receita: visita, impressão, abertura de e-mail, clique, teste interno, conta interna.
5. Toda coorte deve excluir contas internas — a lista está em `lib/internalAccounts.ts` e em `scripts/measure-growth-funnel.mjs:65-83`.
6. **Suspeite de qualquer evento cuja razão eventos/atores seja muito maior que 1.** Já houve inflação de 9,7× (`viral_onboarding_viewed`) e 2,7× (`generate_arrived_server`) por remontagem de componente.

---

## 6. REGRAS DE CÓDIGO ESPECÍFICAS DESTE REPO

### 6.1 Componentes andam em pares — sempre busque o par
- `Sidebar.tsx` → verifique `MobileNav.tsx` e a nav pública
- Cards do Viral Now → `DashboardClient.tsx` **e** `ViralNowClient.tsx`
- `viral-now/route.ts` (FALLBACK_TOPICS) → `cron/refresh-viral-now/route.ts` (TOPIC_POOL)

### 6.2 A home NÃO usa Tailwind
`app/KineoLanding.tsx` roda num CSS escopado próprio (classes `.klp`) dentro do próprio arquivo. **A paleta de `tailwind.config.js` tem zero uso no projeto inteiro.** Trabalho visual na home mexe no sistema `.klp`, não em classe do Tailwind.

### 6.3 O build de produção não valida tipo nem lint
`next.config.js:77-81` tem `ignoreBuildErrors: true` e `ignoreDuringBuilds: true`. Não existe CI (`.github/` não existe) nem teste (`*.test.*` não existe). **A única barreira entre um erro de tipo e produção é alguém rodar `npx tsc --noEmit` na mão.** Rode antes de propor qualquer entrega de código.

### 6.4 Cron só roda se estiver em `vercel.json`
Existem 8 rotas em `app/api/cron/` e 4 agendamentos. Escrever a rota **não** a coloca no ar.

### 6.5 Padrão correto de autenticação de cron
```ts
if (!cronSecret) return false   // ✅ correto — ver autopilot-generate/route.ts:78
if (!cronSecret) return true    // ❌ fail-open — endpoint público
```

---

## 7. COORDENAÇÃO ENTRE WORKSTREAMS

```
Growth  → define público, oferta, mensagem, CTA e métrica
Design  → transforma em experiência e apresentação
Dev     → implementa, integra, protege e mede
Data    → verifica o que é evidência e o que é achismo
CEO     → consolida, resolve contradição, decide a próxima rodada
```

Regras invioláveis:
- **Design não inventa oferta.** Design mexe em forma; conteúdo (preço, headline, CTA textual, promessa) é do Growth.
- **Growth não promete o que o produto não entrega.** Ver `docs/PRODUCT_AND_OFFER.md` §promessa permitida.
- **Development não cria sistema sem necessidade comercial confirmada.**
- **Data pode contradizer qualquer um dos três** — é a função dele.
- Nenhuma tarefa altera decisão aprovada em silêncio.
- Nenhuma tarefa considera trabalho concluído sem evidência.
- **Nunca duas tarefas escrevendo na mesma working tree.** Trabalho paralelo usa worktree separado (`.claude/worktrees/`).

---

## 8. REGRA PERMANENTE DE DESIGN — entrega visual exige comparação visual

Toda entrega de design ou UX deve incluir **comparação antes/depois que o fundador consiga olhar**, não descrição em texto.

- O especialista entrega as edições **mais** um HTML estático autocontido (CSS inline, sem build, sem servidor — worktree não tem `node_modules`).
- Toda seção tocada aparece em par, rotulada, desktop e mobile quando ambos foram mexidos.
- O CEO abre e entrega a imagem ao fundador.
- **Seção que não está no preview não chega ao fundador.**

Motivo: o fundador avalia design olhando. "Ajustei o tracking do h1" não permite decisão.

---

## 9. LIMPEZA PENDENTE — não piore

A raiz tem **175 arquivos de scaffolding rastreados**: 61 `.bat`, 7 `.ps1`, 1 `.vbs`, 5 `.zip` (1,4 MB de código duplicado dentro de zip versionado), 28 `.txt` de log, 34 `.md` de release. Não quebra nada, mas deixa a raiz ilegível.

**Não adicione arquivo novo na raiz.** Documentação vai em `docs/`.

---

## 10. ARQUIVOS CANÔNICOS

| Arquivo | Contém |
|---|---|
| `AGENTS.md` | este arquivo — regras operacionais |
| `docs/PROJECT_STATE.md` | estado real do produto e do negócio, com datas |
| `docs/PRODUCT_AND_OFFER.md` | preços reais, promessa permitida, promessas que não se cumprem |
| `docs/ARCHITECTURE_AND_INTEGRATIONS.md` | arquitetura e estado de cada integração |
| `docs/METRICS_AND_FUNNEL.md` | o que se mede, o que não se mede, métricas envenenadas |
| `docs/OPEN_QUESTIONS.md` | tudo que ainda não se sabe, com a verificação exata |
| `docs/DECISIONS.md` | decisões aprovadas pelo fundador |
| `docs/ROADMAP.md` | prioridades em ordem, com gates |
| `docs/workstreams/*.md` | charter de cada especialista |

**Ainda não existe:** `docs/PRODUCTION_RUNBOOK.md`. Não foi escrito porque exigiria acesso a Vercel e Supabase, que ninguém teve no Ciclo 1. Está em `docs/OPEN_QUESTIONS.md`.
