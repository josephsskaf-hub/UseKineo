# Kit Black Friday — entrega local de 28/10/2026

**FATO CONFIRMADO / IMPLEMENTADO:** branch `codex/kit-bf-20261028`, worktree `C:/kineo/.claude/worktrees/kit-bf-20261028`, criada de `origin/main` em `98c84c09b`. Nenhum push, deploy, envio de e-mail, acesso a credenciais, banco ou chamada de geração foi feito nesta tarefa. A main local suja foi preservada.

## O que estava errado ou pode melhorar

- **CONTRADIÇÃO (base `98c84c09b`):** a página antiga prometia selo inicial, oferta falada e 3–5 variações (`lib/growth/paginasUgc2010Content.ts:671`, `:682`, `:692`). Esses controles vivem no montador legado; a sessão pública usa Escolha (`app/(dashboard)/ads/v2/AdsV2Simple.tsx:593`). O servidor atual exige oferta somente no texto visual final (`lib/ads/cena/escolhaPlan.ts:151`, `:170`; montagem em `lib/ads/cena/escolhaMontage.ts:19`). Corrigido na página, nos modelos e nas descrições comerciais do kit.
- **CONTRADIÇÃO:** a conta antiga de 10 anúncios a 34 créditos não representa o anúncio público atual. **FATO CONFIRMADO:** o preço existente permanece US$ 49 e o saldo permanece 340 créditos; `adsV2Credits('commercial', 15)` custa 41. O rendimento derivado é oito anúncios completos e 12 créditos restantes (`lib/ads/kitBfSale.ts:16`, `:19`, `:21`, `:23`, `:24`). Não houve preço, crédito ou concessão nova.
- **FATO CONFIRMADO:** os prazos editoriais “criativos fecham em 31/10” e “na semana da BF, nada de criativo novo” eram copy, não limite do produto (`lib/growth/paginasUgc2010Content.ts:635`, `:661`, `:683`, `:709`). Foram retirados da página pública. A Black Friday da campanha continua 27/11/2026, conforme o briefing do fundador.

## O que funciona e foi preservado

- **FATO CONFIRMADO / IMPLEMENTADO:** a porta usa elegibilidade única, com estado pago, amostra disponível, amostra usada e inelegibilidade; a região desconhecida não recebe amostra (`lib/ads/eligibilityPure.ts:67`, `:73`; `app/(dashboard)/ads/v2/page.tsx:81`). A amostra atual é de oito segundos (`lib/ads/cena/escolhaSamplePolicy.ts:6`), com regras de conta, país e limite diário. Esta entrega não altera a política.
- **FATO CONFIRMADO / IMPLEMENTADO:** checkout do kit preserva preço, saldo, janela de venda, acesso e recusa de compra duplicada por Business. A versão da descrição passou para `kit_bf_v2_2026-10-28`; sessões antigas continuam reconhecidas (`lib/ads/kitBfSale.ts:14`, `:19`; `lib/stripe/kitBfCheckout.ts:102`). O webhook financeiro não foi alterado.
- **TESTADO LOCALMENTE:** preço e contrato do checkout executados com Stripe/Supabase simulados; nenhuma cobrança real. A implementação de geração existe, mas funcionamento de um render pago e pagamento externo não foram validados nesta tarefa.

## Versão enxuta entregue

- **FATO CONFIRMADO / IMPLEMENTADO:** três modelos em EN/PT/ES: oferta relâmpago, contagem regressiva e produto + desconto (`lib/ads/bfCampaign.ts:2`). Todos levam diretamente a `/ads/v2` com identificador e idioma validados; o login preserva a seleção (`app/(dashboard)/ads/v2/page.tsx:62`). Nenhuma seleção inicia geração.
- **FATO CONFIRMADO / IMPLEMENTADO:** pré-preenchimento de produto, direção de roteiro, CTA, formato e língua da fala. Oferta fica vazia para confirmação. Placeholder e oferta ausente bloqueiam o planejamento (`lib/ads/bfCampaign.ts:46`; `app/(dashboard)/ads/v2/AdsV2Escolha.tsx:64`, `:161`). Um modelo selecionado usa draft separado; pedido anterior fica preservado e `order` explícito tem prioridade (`lib/ads/bfCampaign.ts:39`).
- **FATO CONFIRMADO / IMPLEMENTADO:** a página explica que oferta/prazo entram no texto visual final, que não existe relógio ao vivo, geração em lote ou publicação automática, e que os vídeos precisam de revisão. Preço e saldo vêm das funções existentes (`components/ads/BlackFridayCampaignPage.tsx:99`, `:113`).
- **FATO CONFIRMADO / IMPLEMENTADO:** ES ganhou URL própria, canonical e hreflang recíprocos, inclusão na lista do sitemap e descrição no `/llms.txt` (`lib/seo/paginasUgc2010.ts:23`). O editor existente continua com controles em EN/PT; o modelo, orientação e língua da fala selecionada têm ES. Não se declara tradução integral do editor.

## Verificação e limites

**TESTADO LOCALMENTE — 28/10/2026:**

| Verificação | Resultado |
|---|---|
| `tsc --noEmit --incremental false` | passou, exit 0; `tsc.log` vazio |
| `scripts/test-black-friday-page-2810.mjs` | passou; páginas reais EN/PT/ES, três links diretos, preços, amostra, metadata, FAQ/schema, cinco mutantes |
| `scripts/test-bf-campaign-2810.mjs` | passou; nove combinações, login e hooks reais do editor, draft anterior preservado, prioridade de order, placeholder bloqueado, zero chamada automática |
| `scripts/test-kit-bf-contract-2810.mjs` | passou; 49 verificações, incluindo 19 mutantes, contrato e checkout reais com serviços simulados |
| `git diff --check` | passou |

**FATO CONFIRMADO / limite dos guardiões históricos:** `test-paginas-ugc-2010.mjs` tinha duas falhas G13 antes da alteração e mantém exatamente as mesmas: desfaz de `app/ads/page.tsx` e deriva de `components/home/HomeThreeCards.tsx`. Seus contratos G1/G2/G6/G11 foram atualizados para a nova página, ES e custo vigente; as verificações G13 não foram removidas. Evidências em `baseline-pages.log` e `pages-legacy.log`. A saída histórica continua vermelha; não foi apresentada como suíte totalmente verde.

**FATO CONFIRMADO / limite dos guardiões históricos:** `test-kit-bf-venda-2010.mjs` para no desfaz de `AdsV2Client.tsx`, arquivo não alterado nesta tarefa. `test-ads-simples-2810.mjs` não inicia porque `scripts/test-support/desfaz-ads-simples-2810.mjs` não existe na própria base `98c84c09b`. Logs: `kit-legacy.log`, `ads-door.log`. Os novos guardiões verificam o contrato atual diretamente, sem remover asserts antigos.

**EVIDÊNCIA DE PRODUÇÃO — GET público, 28/10/2026:** `/ai-black-friday-video-ads` retornou HTTP 200 com a copy antiga e sem `bf_template`. Isso confirma a página pública anterior; não valida login, elegibilidade individual, render ou pagamento. **QUESTÃO PENDENTE / DESCONHECIDO:** sucesso comercial, exposição dos novos modelos e pagamentos externos após esta mudança, pois ela não foi publicada.

## Comparação visual

**TESTADO LOCALMENTE:** `before-en.html` foi exportado dos componentes originais antes das edições. `after-en.html`, `after-pt.html`, `after-es.html` são exportações dos componentes atuais. `before-after.html` é autocontido e inclui todas as seções antes/depois em desktop e mobile.

**FATO CONFIRMADO / limite visual:** a ferramenta de navegador rejeitou a navegação `file://` por política de segurança. Não foi contornada por servidor, outro navegador ou CDP. Os PNGs são renderizações locais de documento feitas com WeasyPrint 70 e Poppler, com acesso limitado a `file,data`; não são screenshots de Chrome nem prova de hidratação real. CSS de viewport/fallback do renderizador está em `render-desktop.css` e `render-mobile.css`. Revisadas visualmente as comparações e versões EN/PT/ES. **QUESTÃO PENDENTE:** conferência final no navegador real.

## O que os concorrentes fazem

**SUGESTÃO / referência em práticas documentadas, consulta em 28/10/2026:** [Canva](https://www.canva.com/video-editor/templates/black-friday/) organiza modelos de Black Friday selecionáveis e editáveis. [Arcads](https://help.arcads.ai/en/articles/17349988-product-video-ads) documenta entrada por foto, escolha de formato e custo antes de gerar. As fontes descrevem produto, não comprovam conversão.

**SUGESTÃO adotada:** seleção direta do modelo e oferta revisada pelo lojista. Adaptada ao formato e às restrições atuais da Kineo, sem prometer relógio animado, variações automáticas, velocidade, aprovação de anúncio ou vendas.

## Próximo passo recomendado

**SUGESTÃO:** Joseph revisa a comparação e os três e-mails EN/PT em `emails-en-pt.txt`. Após autorização de publicação, conferir login → modelo → oferta real → roteiro → vídeo no ambiente publicado antes de divulgar os rascunhos. Reutilizar `organic_cta_clicked`, `checkout_started` e pagamento canônico por pessoa externa; clique, preparo e teste local não são venda. Sem envio, cobrança de teste, monitoramento ou distribuição automática nesta entrega.
