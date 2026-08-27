# Handoff Codex ↔ Claude — 2026-08-27

- **Data do snapshot:** 2026-08-27, America/Sao_Paulo
- **Base remota publicada e relida:** `94a230ea37fdff4920b014058f68cffdb20c8204`
- **Ponta funcional publicada:** `94a230ea37fdff4920b014058f68cffdb20c8204`
- **Workstream:** aquisição, fluxo e conversão em assinatura
- **Estado neste snapshot:** deploy `READY`; superfícies públicas validadas em produção; Plan Fit IMPLEMENTADO e TESTADO LOCALMENTE, aguardando uma conta elegível real para validação comportamental em produção.

## 1. Divisão aprovada pelo fundador

- **Codex:** aquisição, fluxo, conversão e novas assinaturas.
- **Claude:** qualidade do gerador, render, legendas e bugs do pipeline de vídeo.
- **Plan Fit:** dono único Codex. A versão canônica está em `origin/main` (`4dff13d` + `f62997b`). O protótipo paralelo `3173247` da frente Growth/Claude deve ser abandonado, não integrado.
- Sobreposição só acontece por pedido explícito do fundador ou por bloqueio registrado neste handoff.
- Antes de cada turno, os dois lados atualizam e leem `origin/main`, `AGENTS.md`, os documentos canônicos em `docs/` e o handoff mais recente.
- Nunca duas tarefas escrevendo na mesma working tree.

Esta decisão também está registrada em `docs/DECISIONS.md`.

## 2. O que esta entrega muda

### A. Privacidade das criações de clientes

**FATO CONFIRMADO / IMPLEMENTADO.** As páginas públicas de cliente `/v/[id]`, OG, sitemap de vídeo, IndexNow, biblioteca de scripts, rails e galerias deixam de enumerar trabalho de cliente enquanto não existe uma escolha durável de visibilidade.

- Playback e download autenticados do dono continuam.
- Home, trending e `/examples` continuam com seis exemplos estáticos da própria Kineo.
- Generate, History e e-mail não fabricam mais uma URL pública.
- `/v` usa resposta dinâmica, sem cache compartilhado, e falha fechado antes do cliente service-role.
- A interface explica “private by default”; não promete compartilhamento que o produto ainda não modela.

### B. Verdade comercial de créditos

**FATO CONFIRMADO / IMPLEMENTADO.** Quantidades comerciais agora derivam de `TIER_CREDITS`, `TOPUP_CREDITS` e `creditCostForDuration(..., 60)`.

- O caixa Stripe, `/pricing`, cards, modais, top-ups, Generate, calculadora, páginas SEO, JSON-LD, comparações e fatos públicos usam a mesma régua de 60 segundos.
- Nenhum preço, grant, SKU ou termo foi alterado.
- IDs legados permanecem iguais.
- `starter290` continua concedendo 25 créditos e anuncia exatamente um Seedance de 60s, sem parcela “zero vídeos”.

### C. Plan Fit após a primeira entrega

**FATO CONFIRMADO / IMPLEMENTADO.** Depois do próximo-vídeo, a primeira entrega comprovada recebe uma pergunta mensal — 1, 4, 8 ou 12 vídeos — e a recomendação do plano mais barato que comporta motor, duração e cadência.

- Só aparece para free, trial ou comprador de pack sem assinatura ativa.
- Assinante, Autopilot, entitlement desconhecido, Avatar/Presenter e Sora não entram.
- Exige `completedCount === 1`, histórico do dono ligado ao `publicVideoId` atual e exatamente uma linha concluída, que deve ser o próprio vídeo.
- Substitui a oferta recorrente antiga para essa coorte; observers antigos também são suprimidos, portanto não há impressão escondida.
- A escolha independente de exportação limpa permanece.
- Checkout passa pelo `useCheckoutLaunch`, com latch, pending, erro, resgate e `intent_campaign`.
- Se nenhuma assinatura comporta a meta, a tela oferece capacidade máxima no mesmo motor ou a mesma cadência no Kineo 1; não promete top-up.
- Sem moeda canônica resolvida, não mostra dinheiro.

### D. Fechamento da corrida entre abas

**FATO CONFIRMADO / IMPLEMENTADO.** Uma segunda entrega em outra aba não pode continuar sendo vendida ou medida como “primeira”.

- Nova entrega sinaliza as outras abas via `storage`.
- Foco e `visibilitychange` revalidam o histórico.
- Requisições são abortáveis e sequenciadas; resposta velha não restaura elegibilidade.
- Imediatamente antes da impressão e do checkout, o card consulta `/api/videos` outra vez.
- A chave de dedupe da impressão só fecha depois de `/api/events` aceitar o evento.

## 3. Validação local consolidada

| Gate | Resultado |
|---|---:|
| `test-public-video-privacy.mjs` | 62/62 |
| `test-plan-fit.mjs` | 227/227 |
| `test-money-truth-contract.mjs` | 305/305 |
| `test-credito-vitrine.mjs` | 21/21 |
| **Total determinístico** | **615/615** |
| `checkPricingInvariants()` real | `[]` |
| `core.whitespace=cr-at-eol diff --check` | limpo |
| `npm run build` | verde |

**TESTADO LOCALMENTE.** `npx tsc --noEmit` não encontrou erro novo. Permanecem os quatro erros de baseline já existentes:

- `app/api/admin/_shared/mrr.ts`: versão da API Stripe.
- `app/api/me/subscription/route.ts`: versão da API Stripe.
- `app/api/stripe/checkout/route.ts`: dois resíduos de `brl` numa tipagem hoje USD-only.

O primeiro build local compilou e parou porque a worktree isolada não lê o segredo `OPENAI_API_KEY`. A repetição usou apenas o valor fictício `build-placeholder-not-a-secret`, sem chamada ao fornecedor, e terminou verde. Os avisos de rotas antigas que usam cookies durante a coleta estática permanecem não bloqueantes.

## 4. Previews visuais obrigatórios

- `docs/previews/privacy-containment-before-after.html`
- `docs/previews/plan-fit-first-delivery-2026-08-27.html`
- `docs/previews/money-truth-before-after-2026-08-27.html`

Os três foram inspecionados no browser local, desktop e mobile quando aplicável.

## 5. O que deliberadamente não entrou

- Nenhuma mudança no render, prompts, cenas, legenda ou escolha de motor do gerador.
- Nenhuma migration, escrita em banco ou uso de credencial.
- Nenhuma alteração de preço, grant, SKU ou termos.
- Nenhum e-mail, outreach ou comunicação externa.
- Nenhuma alteração no rail PayPal.

## 6. Pendências e donos

### Claude / pipeline de vídeo

- Continuar qualidade do gerador, render e legendas sobre a nova ponta de `origin/main`.
- Antes de editar `GenerateClient.tsx`, verificar este handoff: é o principal arquivo de sobreposição desta entrega.

### Codex / aquisição e conversão

- Medir pessoas únicas que viram, escolheram cadência, abriram checkout e assinaram pelo Plan Fit.
- Continuar as ações de aquisição sem reconstruir superfícies já existentes.
- Manter o Plan Fit; Claude não deve continuar ou integrar o protótipo `3173247`.

### Decisão do fundador necessária

**CONTRADIÇÃO.** `lib/paypal.ts` continua com tabela comercial própria antiga — planos $9.90/25, $24.90/150, $37.90/200 e pack $4.90/10 — enquanto o canônico Stripe é $7/40, $15/90, $29/180 e pack 30. É um rail vivo e não deve ser “corrigido” em silêncio.

### Arquitetura futura de compartilhamento

**QUESTÃO PENDENTE.** A contenção é fail-closed, não o modelo final. Ainda faltam `visibility`, token de compartilhamento, expiração e revogação duráveis. URLs antigas ou diretas de bucket exigem auditoria separada.

## 7. Protocolo obrigatório do próximo turno

1. `git fetch origin` e confirmar o SHA real de `refs/heads/main`.
2. Ler `AGENTS.md`, `docs/PROJECT_STATE.md`, `docs/OPEN_QUESTIONS.md`, `docs/DECISIONS.md` e este arquivo.
3. Informar base, worktree e arquivos pretendidos antes da primeira edição.
4. Se `origin/main` avançar, reintegrar sobre a ponta nova; nunca presumir que o outro executor ainda está na base anterior.
5. No fim do turno, registrar: SHA de base, SHA entregue, arquivos, testes, deploy, evidência de produção, decisões, riscos, pendências e próximo dono.
6. Entregar ao fundador um bloco `COPY` autocontido para o outro executor.

## 8. Formato mínimo do resumo de volta

```text
BASE LIDA:
SHA ENTREGUE:
ARQUIVOS TOCADOS:
O QUE MUDOU:
TESTES:
DEPLOY:
VALIDADO EM PRODUÇÃO:
NÃO TOCADO:
PENDÊNCIAS / RISCOS:
PRÓXIMO DONO:
```
