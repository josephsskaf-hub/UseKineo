# Handoff Codex ↔ Claude — 2026-08-27

- **Data do snapshot:** 2026-08-27, America/Sao_Paulo
- **Base remota confirmada antes desta atualização:** `027afdb9889d127a1a9190e3a22f7cb1cabea1cc`
- **Workstream Codex:** aquisição, fluxo, conversão, afiliados e vendas B2C/B2B
- **Workstream Claude:** qualidade do gerador, render, cenas, legendas e bugs do pipeline de vídeo
- **Estado do ciclo:** execução renovável de 72 horas, com sprints a cada 30 minutos

## 1. Divisão aprovada pelo fundador

**DECISÃO APROVADA.** O Codex executa Growth e o Claude executa o pipeline de vídeo. Uma frente só entra no território da outra por pedido explícito do fundador ou por bloqueio registrado neste handoff.

- O Codex pode criar worktrees, editar, testar, commitar, publicar e validar entregas de Growth sem nova autorização.
- Nenhuma comunicação externa é enviada sem confirmação do fundador no momento do envio.
- Nenhuma alteração de preço, grant, SKU ou termos é feita silenciosamente.
- Antes de editar, cada executor confirma o SHA real de `origin/main` e trabalha em worktree isolada.
- A árvore principal local está divergente e contém trabalho de terceiros. Ela não deve ser resetada, limpa nem usada para integração.
- O Plan Fit pertence ao Codex. O protótipo paralelo `3173247` não deve ser integrado.

## 2. Entregas de Growth publicadas em 27/08/2026

### 2.0 Estado herdado e preservado nesta sequência

**FATO CONFIRMADO / IMPLEMENTADO.** As entregas anteriores do mesmo dia continuam ancestrais de `origin/main`:

- Privacidade fail-closed: criações de clientes não são enumeradas em `/v/[id]`, sitemap de vídeo, IndexNow, rails ou galerias enquanto não existe escolha durável de visibilidade. Playback e download autenticados do dono continuam.
- Verdade comercial: superfícies principais derivam créditos e custos da fonte canônica, sem alterar preço, grant, SKU ou termos.
- Plan Fit: depois da primeira entrega, a recomendação usa motor, duração e cadência; checkout passa pelo fluxo canônico e revalida elegibilidade antes de impressão e compra.
- Corrida entre abas: nova entrega, foco e `visibilitychange` revalidam o histórico; resposta velha não restaura elegibilidade.
- Gates preservados: privacidade `62/62`, Plan Fit `227/227`, contrato comercial `305/305`, vitrine de crédito `21/21`.
- Previews preservados: `docs/previews/privacy-containment-before-after.html`, `docs/previews/plan-fit-first-delivery-2026-08-27.html` e `docs/previews/money-truth-before-after-2026-08-27.html`.

### 2.1 Oferta única depois do primeiro vídeo

**FATO CONFIRMADO / IMPLEMENTADO.** Commit `a0e11446535386f551464b082307f1cc34ce20bb`.

- O momento pós-primeira entrega deixou de competir com várias ofertas simultâneas.
- A recuperação de assinatura usa uma decisão principal e eventos próprios.
- Testes: `45/45`; contrato comercial: `305/305`.
- **EVIDÊNCIA DE PRODUÇÃO (27/08/2026):** deploy `dpl_Brw8biGsiZviT9vCVg2AXyexeDNX` em estado `READY`.

### 2.2 Arena honesta de motores

**FATO CONFIRMADO / IMPLEMENTADO.** Commit `89be8bb3b330166cfc21d2fe9f2756378bf54575`.

- `/arena` compara os sete motores com amostras já autorizadas e descreve a função de cada um sem declarar vencedor universal.
- A vitrine aprovada pelo fundador na home continua governada por `lib/publicExamples.ts`; a Arena não substitui a curadoria da home.
- **EVIDÊNCIA DE PRODUÇÃO (27/08/2026):** deploy `dpl_HSZ2fMTZ1ryUKWDsG38RMbXAXkdM` em estado `READY`; `/arena` respondeu HTTP 200.

### 2.3 ChatGPT → Short sem perder o roteiro

**FATO CONFIRMADO / IMPLEMENTADO.** Commit `e13810f6667b814510a2a51329674f6cc4fca74d`.

- A página indexável `/chatgpt-to-youtube-shorts` ensina o formato correto e entrega o roteiro ao gerador após autenticação.
- O handoff preserva a intenção por signup/login; não pede que a pessoa reescreva o texto.
- A rota entrou em sitemap, links internos, fatos públicos e medição orgânica.
- **EVIDÊNCIA DE PRODUÇÃO (27/08/2026):** deploy `dpl_CUstB9qgzMkMfzzjeZLuqPfDRfyw` em estado `READY`; a página respondeu HTTP 200.

### 2.4 Integridade do ledger de afiliados

**FATO CONFIRMADO / IMPLEMENTADO.** Commit `beaeb765827b3aed81923e7874830bd655a92656`.

- A comissão passou a ser idempotente por `(provider, external_id)`.
- Repetição de webhook não cria comissão duplicada.
- **EVIDÊNCIA DE PRODUÇÃO (27/08/2026):** deploy `dpl_EHMLRb67obzSAKXpPdjT9fmiojfk` em estado `READY`; banco validado com chave única e zero duplicatas.

### 2.5 Recuperação do primeiro vídeo e ativação de afiliados

**FATO CONFIRMADO / IMPLEMENTADO.** Commits `025d3c7117ef6dd028960f194d8d03cb93959023` e `b8027cde47633d0f759c18cc9f93ce3eec8bf87b`.

- Usuário com vídeo concluído e sem assinatura recebe uma oferta contextual na biblioteca.
- Exatamente um vídeo usa a mensagem de continuidade do primeiro Short; o Starter é a ação principal e o episódio 2 é secundário.
- Assinante ativo com pelo menos dois vídeos recebe o card de afiliado; afiliados pendentes ou suspensos são ocultados.
- Os estados de recuperação e de afiliado são mutuamente exclusivos.
- Eventos: `history_first_video_offer_viewed`, `history_first_video_offer_clicked`, `affiliate_momentum_card_viewed` e `affiliate_momentum_card_clicked` (`app/(dashboard)/history/HistoryClient.tsx:382-396`; `components/AffiliateMomentumCard.tsx:32-71`).
- Testes: `test-affiliate-activation.mjs` `34/34`; contrato comercial `305/305`; TypeScript sem erro novo.
- **EVIDÊNCIA DE PRODUÇÃO (27/08/2026):** deploy `dpl_HdXuvJ6ccfnmtho8egDpYis1JURH` em estado `READY`; `/my-videos` abriu em produção e não houve erro runtime nas rotas observadas.
- **QUESTÃO PENDENTE / DESCONHECIDO:** ainda não houve sessão de uma conta externa elegível depois do deploy para provar impressão e clique reais nessa coorte.

### 2.6 Porta B2B para agências, freelancers e empresas

**FATO CONFIRMADO / IMPLEMENTADO.** Commit `7d68a9d0ab115bc4bcc68726330457ca0a1e5da8`.

- Nova página pública e indexável: `/ai-shorts-for-agencies`.
- A página vende os quatro pacotes já aprovados em `BULK_PACKS`, sem inventar preço no JSX (`lib/checkoutPricing.ts:527-544`; `app/ai-shorts-for-agencies/page.tsx:5-32`).
- O checkout reutiliza o fluxo Stripe vivo `/api/stripe/checkout?pack=...`; compra avulsa em USD, sem assinatura.
- A copy declara que a quantidade nominal é para Fast Mode, que motores premium consomem mais créditos e que não existem team seats, client portal, approval routing, white-label ou editor humano.
- A página não está órfã: há link no footer (`components/Footer.tsx:90`), entrada no sitemap (`app/sitemap.ts:136`) e bloco em `/llms.txt` (`app/llms.txt/route.ts:199`).
- Funil por atores, não eventos: `agency_bulk_page_viewed`, `agency_bulk_pack_clicked`, `bulk_checkout_started` (`app/api/admin/funnel/route.ts:1339-1341`).
- Testes: `test-b2b-bulk-page.mjs` `29/29`; contrato comercial `305/305`; TypeScript com apenas os mesmos quatro erros de baseline; whitespace limpo.
- Preview visual obrigatório: `docs/previews/B2B-BULK-PAGE-2026-08-27.html`, inspecionado em desktop e mobile.
- **EVIDÊNCIA DE PRODUÇÃO (27/08/2026):** deploy `dpl_3ZyRYAHFcvZwX8Q46tcY1x7o7AE2` em estado `READY`; página, sitemap e `/llms.txt` responderam em produção; zero erro de console na página e zero erro runtime nas rotas observadas.
- O checkout não foi clicado em produção para não criar sessão Stripe artificial. A rota, o contrato dos packs e o webhook foram verificados no código e por testes.

### 2.7 Trust Center factual

**FATO CONFIRMADO / IMPLEMENTADO.** Commit `027afdb9889d127a1a9190e3a22f7cb1cabea1cc`.

- Nova página pública e indexável: `/trust`, com operador, domínio canônico, suporte, fronteira de pagamento, privacidade dos vídeos, uso comercial, processadores e caminho de reembolso.
- A página recusa explicitamente prova inventada: não declara SOC 2, ISO 27001, SLA empresarial, número inventado de clientes ou selo de “#1”.
- Stripe hospeda o checkout; a Kineo não recebe nem armazena o número completo do cartão.
- Vídeos de clientes permanecem privados por padrão; exemplos públicos são uma coleção separada aprovada pelo fundador.
- A página não está órfã: entrou no footer, sitemap e `/llms.txt`.
- Funil por atores, não eventos: `trust_page_viewed` e `trust_cta_clicked` (`app/trust/TrustActions.tsx`; `app/api/admin/funnel/route.ts`).
- Testes: `test-trust-center.mjs` `25/25`; contrato comercial `305/305`; TypeScript com apenas os quatro erros de baseline; whitespace limpo.
- Preview visual obrigatório: `docs/previews/TRUST-CENTER-2026-08-27.html`, inspecionado em desktop e mobile.
- **EVIDÊNCIA DE PRODUÇÃO (27/08/2026):** deploy `dpl_AX54AKA1KjoFymjczPSm2jxh8hGg` em estado `READY`; `/trust`, sitemap e `/llms.txt` responderam em produção; zero erro de console e zero erro runtime nas rotas observadas.

### 2.8 Descoberta orgânica

**EVIDÊNCIA DE PRODUÇÃO (27/08/2026, America/Sao_Paulo).** O lote IndexNow foi validado e submetido em `2026-08-28T00:06:33.285Z` (`27/08/2026 21:06:33 BRT`): HTTP 200, 171 URLs canônicas. A contagem anterior, depois da página B2B e antes do Trust Center, era 170.

### 2.9 Vídeo público → remix sem cadastro

**FATO CONFIRMADO / IMPLEMENTADO.** Commits `f13f67bf78dc1e0bd1529d2f696ab02b429e0c7c` e `30b8889e29f79a41519c7823445ed771701368f3`.

- Os CTAs de `/v/[id]` deixaram de pedir cadastro antes de entregar valor e agora levam ao gerador gratuito com o título visível pré-preenchido (`app/v/[id]/page.tsx:174,339,554`; `lib/publicVideoRemix.ts:12`).
- O gerador sanitiza o tópico e o identificador no servidor, não chama a IA automaticamente e preserva o roteiro no handoff existente para signup/Studio (`app/free-script-generator/page.tsx:65-76`; `app/free-script-generator/FreeScriptClient.tsx:78-110,210`).
- O caminho preserva `utm_source=public_video`, `utm_medium=share`, `utm_campaign=public_video_remix` e `source_video_id` sanitizado.
- Eventos próprios: `public_video_remix_arrived`, `public_video_remix_script_generated` e `public_video_remix_signup_clicked`; chegada deduplicada por sessão (`app/free-script-generator/FreeScriptClient.tsx:91-103,135-137,210`).
- O admin mede atores únicos nas etapas landing → CTA → chegada → roteiro → intenção de cadastro → cadastro atribuído; a contagem antiga de landing e CTA também deixou de usar linhas brutas (`app/api/admin/funnel/route.ts:1178-1245`).
- O CTA móvel duplicado foi removido: permanece um único sticky CTA universal.
- Testes: `test-public-video-remix.mjs` `36/36`; contrato comercial `305/305`; TypeScript com apenas os quatro erros de baseline; whitespace limpo.
- Preview visual obrigatório: `docs/previews/PUBLIC-VIDEO-REMIX-2026-08-27.html`, inspecionado em desktop e mobile. A versão anterior mostrava dois CTAs fixos sobrepostos no mobile; a nova mostra um único CTA de remix.
- **EVIDÊNCIA DE PRODUÇÃO (27/08/2026):** deploy `dpl_CnJ4sTCVwf1hEJFa2XbkoF9a7jeP` em estado `READY`, aliasado em `www.usekineo.com`. O URL de remix carregou o gerador com o tópico pré-preenchido e sem geração automática; zero erro runtime em `/v/[id]`, `/free-script-generator` e `/api/admin/funnel` nos 30 minutos observados.
- **QUESTÃO PENDENTE / DESCONHECIDO:** não existe hoje um `/v/[id]` público ativo para smoke de clique ponta a ponta: a biblioteca do fundador informa “Private by default” e “Public watch links are temporarily paused”. O contrato CTA → URL está coberto pelo teste executável; URL → tópico preenchido foi validado ao vivo. Não classificar um clique real como validado até existir uma escolha de visibilidade pública.

## 3. Evidência de funil que governa a próxima rodada

**EVIDÊNCIA DE PRODUÇÃO (janela de 7 dias medida em 27/08/2026; contas internas excluídas):**

| Origem | Pessoas cadastradas | Gastaram trial | Concluíram vídeo | Viram oferta | Abriram checkout | Pagaram | Falha de geração |
|---|---:|---:|---:|---:|---:|---:|---:|
| ChatGPT | 52 | 30 | 30 | 19 | 5 | 1 | 7 |
| TAAFT | 37 | 21 | 14 | 13 | 2 | 0 | 9 |

- 24 pessoas vindas do ChatGPT tinham exatamente um vídeo concluído; 13 viram oferta, 8 voltaram à biblioteca e 2 abriram checkout.
- 6 pessoas vindas do ChatGPT tinham dois ou mais vídeos; 3 abriram checkout.
- **Leitura:** ChatGPT já é um canal com intenção comercial; a maior oportunidade observada está entre primeira entrega e repetição/checkout.
- **Limite:** não extrapolar taxas dessas amostras para promessa de vendas.

**EVIDÊNCIA DE PRODUÇÃO (medida em 27/08/2026):**

- Afiliados: 12 totais, 11 externos, 17 cliques, 0 signup atribuído, 0 pagante atribuído e 0 comissão antes da nova ativação.
- Cinco pagantes externos com pelo menos dois vídeos ainda não eram afiliados; são a primeira coorte elegível para o card.
- Os quatro usuários ChatGPT com checkout sem pagamento já haviam recebido recuperação; não duplicar contato.

**EVIDÊNCIA DE PRODUÇÃO (janela de 30 dias lida no admin em 27/08/2026):**

- 999 usuários totais, 387 pessoas com vídeo e 7 assinantes.
- 241 criadores concluíram 402 vídeos.
- 76 pessoas chegaram a páginas de vídeo público e nenhuma pessoa clicou no CTA antigo.
- No handoff do primeiro vídeo: 149 pessoas viram, 39 clicaram na ação principal, 29 despacharam e 12 concluíram.
- Na oferta pós-vídeo: 220 pessoas viram, 1 clicou em exportação limpa, 2 abriram checkout e nenhuma assinatura foi atribuída nessa janela.
- **Leitura:** o remix sem cadastro ataca um abandono observado diferente de Plan Fit e da oferta pós-vídeo; não repete essas ações.

## 4. Validação técnica consolidada

**TESTADO LOCALMENTE.** Nenhuma entrega de Growth adicionou erro de TypeScript. O baseline continua exatamente em quatro erros preexistentes:

- `app/api/admin/_shared/mrr.ts(113,41)`
- `app/api/me/subscription/route.ts(71,41)`
- `app/api/stripe/checkout/route.ts(545,76)`
- `app/api/stripe/checkout/route.ts(566,62)`

**FATO CONFIRMADO.** O build de produção ignora erros de tipo e lint; portanto, `npx tsc --noEmit` continua gate manual obrigatório.

## 5. O que não foi tocado

- Nenhum prompt de cena, motor, render, legenda, composição, voiceover ou fallback do gerador.
- Nenhum preço, grant, SKU ou termo comercial.
- Nenhum e-mail, DM, outreach ou follow-up foi enviado.
- Nenhum tráfego pago foi ativado.
- Nenhuma alteração foi feita na árvore principal divergente.

## 6. Riscos e pendências

### Claude / pipeline de vídeo

- Continuar qualidade do gerador e bugs do pipeline sobre a ponta atual de `origin/main`.
- Antes de editar `GenerateClient.tsx`, confirmar o SHA remoto e ler este handoff.
- **QUESTÃO PENDENTE / DESCONHECIDO:** `/my-videos` exibiu erros React de hidratação `#425/#418/#423` na sessão do fundador em 27/08. A página renderizou e não há prova anterior ao deploy na mesma sessão; não atribuir causalidade sem reprodução controlada.

### Codex / Growth

- Medir pessoas únicas nos novos eventos, sem transformar ausência inicial em fracasso.
- Executar o ciclo renovável de 72 horas: fortalecer menções/links para as portas B2B e de confiança e preparar listas qualificadas de criadores, agências e empresas.
- Preparar lotes de contato, mas pedir confirmação do fundador no momento do envio.
- Não duplicar recuperação já enviada aos quatro checkouts ChatGPT sem pagamento.

### Decisões comerciais preservadas

- **CONTRADIÇÃO:** `lib/paypal.ts` mantém uma tabela própria antiga enquanto Stripe usa a fonte canônica. É um rail vivo e não deve ser alterado em silêncio.
- **QUESTÃO PENDENTE / DESCONHECIDO:** vendas e conversões das superfícies publicadas ainda precisam de tráfego real; deploy e indexação não são receita.

## 7. Protocolo obrigatório do próximo turno

1. Executar `git fetch origin` e confirmar o SHA real de `refs/heads/main`.
2. Ler `AGENTS.md`, os documentos canônicos de `docs/` e este handoff.
3. Informar base, worktree e arquivos antes da primeira edição.
4. Se `origin/main` avançar, reintegrar sobre a nova ponta; nunca usar a árvore principal divergente.
5. No fim, registrar SHA, arquivos, testes, deploy, evidência de produção, riscos e próximo dono.
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
