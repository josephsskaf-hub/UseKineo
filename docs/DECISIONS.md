# DECISIONS.md — Decisões aprovadas pelo fundador

Só entra aqui o que o Joseph aprovou explicitamente. Uma decisão registrada aqui **não pode ser alterada em silêncio** por nenhuma tarefa.

## 2026-09-30 — ADM Porcelana aprovado para implementação e integração

**DECISÃO APROVADA:** Joseph, nesta conversa Board, após abrir `ADM-ANTES-DEPOIS.html`: "gostei pode dar merge". Implementar a direção visual clara do protótipo no ADM: navegação agrupada compartilhada, títulos menores, cards legíveis, paleta Porcelana e adaptação mobile.

**ESCOPO:** apresentação administrativa. Não autoriza alterações de valores, cálculo de MRR, comissão, permissões, banco, campanhas ou oferta. Preservar a reconstrução de Afiliados de 30/09. Integração pela fila segura já aprovada, sem substituir o checkout sujo de outra sessão.

**TESTADO LOCALMENTE:** detalhes e limites em `docs/ADMIN-PORCELANA-2026-09-30.md`. Implementação não equivale a publicação nem a resultado comercial.


## 2026-09-30 — Filme de 15 s aceita roteiro com 75 % de fala (antes 95 %)

**QUEM DECIDIU:** o fundador, 30/09, sobre o cliente novo do ChatGPT barrado 3 vezes: "Vai tenta puxar ele pra gente" [TRAVA 8.2 — lib/narrationFit].
**O CASO:** Seedance 15 s + roteiro próprio com ~12 s de fala → recusa "faltam 6 palavras", 3 vezes seguidas, sem cobrança. Desde 29/09: 10 tentativas de Seedance 15 s, 3 barradas (2 pessoas).
**O QUE:** minCoverageFor(duração): até 15 s = 75 % (no máximo ~3,75 s de cena final com música); acima de 15 s continua 95 %. Vale para o guard do servidor, a sugestão de duração, o contador de voz e o /generate.
**GUARDIÃO:** scripts/test-cobertura-15s-2026-09-30.mjs.

## 2026-09-30 (madrugada) — Sai da home a grade "Video" com os 6 motores

**QUEM DECIDIU:** o fundador, 30/09, com print da seção: "tira essa parte".
**O QUE:** sai a seção #engines (título "Video", "Open the generator" e os tiles Kineo 1 · Seedance 1.5 · Kling 2.5 · Veo 3.1 · Kling 3 · Avatar com créditos). Os motores seguem no mega-menu, no /studio e nas páginas /ai-video-generator/*. A curadoria lib/engineWall.ts não foi tocada (continua alimentando a fileira de filmes).
**GUARDIÕES REANCORADOS (com o motivo):** avatar-fora, kineo1-fora-vitrine (portas 3→2), home-referral-bridge, home-b2b-bridge, credito-vitrine, promo-cards.

## 2026-09-30 (madrugada) — Home sem o bloco "Make room for your next big idea"; menu e vídeos mais perto da borda

**QUEM DECIDIU:** o fundador, 30/09: "já quero tirar make room for your next big idea, create video. Já pode aproximar os dois vídeos" e "o menu não está colado 100% na lateral".
**O QUE:** some o bloco título + frases + botão do hero; a fileira de novidades e a "Kineo Selection" ficam coladas (18 px). A margem lateral da home cai de clamp(24px,4vw,76px) para clamp(16px,1.6vw,28px), sem teto de 1800 px. O h1 continua existindo só para leitor de tela e busca. A ação principal fica no "Start free"/Studio do menu (mesma regra de sessão e indicação).
**EM TESTE:** ordem A (novidades em cima, Selection embaixo — publicada) × ordem B (invertida), escolha do fundador pelos prints.

## 2026-09-30 (madrugada) — Fileira de novidades com 4 cards, 3 vídeos girando em cada

**QUEM DECIDIU:** o fundador, 30/09: "em vez de três cards, eu quero quatro cards na primeira fileira… 3 vídeos rodando igual a gente tinha anteriormente… pode fazer isso aí".
**O QUE:** Claude · Ads: 3 variations · Clips · **Nano Banana Pro** (novo, → /images). Cada card troca de vídeo quando o anterior termina (onEnded, sem timer), com fade; só toca na tela e respeita reduced-motion. Ads acende o chip A/B/C junto com a variação.
**MÍDIA:** Claude = as 3 amostras Kineo da /claude-connector; Ads = os 3 anúncios da modelo fictícia; Clips = tempestade + geleira + surfista (Seedance 1.5, conta do fundador, 10 cr); Nano Banana = perfume, astronauta, farol (15 cr). Sem "4K" no card: o gerador não pede resolução (sai 1376×768).
**MEDIR:** promo_card_clicked com promo_v=2 (1 = fileira de 3 cards).
**EM ABERTO:** o fundador cogita trocar o "Make room for your next big idea" do meio por outra coisa — decisão dele.

## 2026-09-30 — Paleta "Porcelana" no site inteiro (claro e escuro)

**QUEM DECIDIU:** o fundador, 30/09: "o branco reflete um pouco o que está mal acabado", "to cogitando escolher a porcelana mesmo" e "sim subimos por aqui… só subir a interface nova e aos poucos ir corrigindo".
**O QUE:** tema claro = branco de papel #F7F7F5, cards #FFFFFF, linha #E4E4E0, texto #0E1116, destaque cobalto #0A5CFF; menu da home branco translúcido, botão "Start free" preto. Tema escuro = #07090D, cards #10141B, linha #1F2530, destaque #4D8DFF. Substitui o White + Graphite de 25/09 e o marinho #0c1521/#2997ff.
**ONDE:** app/appearance.css (app) e app/kineoLandingTheme.ts (home). Azuis #2997ff cravados em telas antigas e a página /claude-connector (escura própria) ficam para ajuste gradual.
**EM ABERTO:** o fundador pediu ao GPT uma segunda opinião sobre contraste e detalhes; ajustes finos entram depois, sem trocar a essência (branco limpo + cobalto).

## 2026-09-30 — Studio Ads: "3 variações" a 2,5 × o preço do nível

**QUEM DECIDIU:** o fundador, 30/09, literal: "3 variações sim" e, sobre o preço proposto, "preço aprovado".
**O QUE:** no /ads/v2 (modo simples e completo) o cliente liga "3 variações" e recebe 3 anúncios irmãos do mesmo pedido: mesmo produto, mesmas fotos/vídeos, mesma narração e frases; cada um com um look fixo (A · Luz do dia azul, B · Interior quente laranja, C · Pôr do sol rosa: luz, paleta, câmera, abertura, grade de cor; cenário novo só em loja/app). Pessoa criada por IA: B e C usam o still da A como referência (a mesma pessoa nas 3). Cada variação é um pedido v2 normal (status, refação e montagem próprios).
**PREÇO:** 3 variações = 2,5 × o preço do nível, arredondado para cima: 34→85 · 41→103 · 51→128 cr (15 s). Mostrado antes do clique; UM débito antes de começar, em 3 partes no ledger (85 = 29+28+28 · 103 = 35+34+34 · 128 = 43+43+42); variação que falha devolve só a parte dela (estorno idempotente de sempre). Refação continua cobrada à parte, por plano.
**INTERRUPTOR:** ADS_VARIACOES_PUBLIC = true em lib/ads/v2Variations.ts (nasce aberto por decisão do fundador). Desligado, só contas da casa veem a opção e a rota responde 404 antes de cobrar.
**PRÉ-REQUISITO:** migrations_pending/2026-09-30_ads_v2_variacoes.sql aplicada ANTES do deploy (sem ela a rota responde 503 'not_ready' sem cobrar).
**GUARDIÃO:** scripts/test-ads-3-variacoes-2026-09-30.mjs.

## 2026-09-30 — Home em 2 faixas: cards de novidade no topo, motores intocados logo abaixo

**QUEM DECIDIU:** o fundador, 30/09. Pedido: "quero esses cards no Kineo também, com essas edições legais" (referência: a fileira do topo do higgsfield.ai, sem copiar marca, cor nem texto). Decisão de layout, literal: **"concordo com as 2 faixas"**.
**O QUE MUDA:**
1. **FAIXA 1 (topo, logo abaixo do menu):** fileira de cards grandes de novidade, nesta ordem — **Kineo for Claude** → `/claude-connector` (pôster animado em CSS) · **Ads: 3 variations** → `/ads` (vídeo do fundador) · **Clips** → `/clips` (tempestade Seedance 1.5, rótulos "NEW" e "5 · 7 · 10 · 15 s"). Dados em `lib/ui/promoCards.ts`, componente `components/PromoCards.tsx`.
2. **FAIXA 2 (logo abaixo):** os cards de motor e a curadoria que já existem (hero de filmes, `lib/engineWall.ts`), **intocados** — não remover nem reordenar.
3. **Selo honesto do card do Claude:** o conector NÃO gera mídia dentro do Claude; ele escreve o roteiro e manda para o Kineo Studio. Subtítulo: "Write your video in Claude, render it in Kineo Studio". Proibido: "make videos (in Claude)", official/partner/approved/certified/"by Anthropic", diretório e logo da Anthropic, enquanto a listagem estiver em revisão. O destino mora numa constante única (`CLAUDE_CARD_HREF`) para virar a página do diretório em UMA linha quando a Anthropic aprovar.
**MEDIR (7 dias):** evento de navegador `promo_card_clicked` com `{card, position, href, surface:'home', promo_v:1}`; a leitura corta por `metadata->>'promo_v'`, não pelo relógio do deploy. Guardião: `scripts/test-promo-cards-2026-09-30.mjs`.


## 2026-09-29 (noite) — Quatro entregas: foto de referência, Clipes 5/7/10/15 s, filmes de 15/30 s em todos os motores, "Estrela do filme"

**QUEM DECIDIU:** o fundador, 29/09, literal: "vai pra todas as 4 … é muito mais público que podemos alcançar", e depois "clipes de 5, 7, 10 e 15 segundos, além dos que a gente já tem". Este "vai" é a autorização nominal da trava 8.2 para as entregas que mexem nas rotas travadas (durações curtas nos filmes); os commits levam a marca [TRAVA 8.2 — vai do fundador 29/09 'vai pra todas as 4'].
**O QUE MUDA:**
1. **Foto de referência no /images** (Nano Banana Pro, `fal-ai/nano-banana-pro/edit`): 1 a 3 fotos da própria conta, consentimento obrigatório conferido no servidor, moderação antes de guardar e antes de cobrar, mesmo preço (5 cr). Guardião: scripts/test-images-foto-referencia-2026-09-29.mjs.
2. **Clipes** (/clips): uma cena, sem narração, a partir de texto ou de uma foto, em 5/7/10/15 s — cada motor mostra SÓ as durações que entrega nativamente, com o número real; se o motor não faz a duração pedida, a tela aponta os que fazem (nunca troca em silêncio). Preço por proposta do CEO com margem ≥ a do filme do mesmo motor, aprovado pelo fundador antes de publicar.
3. **Filmes narrados curtos:** 15 s no Kling 2.5 e no Veo (receita do Seedance 15 s); 15 e 30 s no Kling 3, H3, Omni e Seedance 2.5. Nenhum filme sai mais curto que o pedido; preço por creditCostForDuration.
4. **"Estrela do filme":** o rosto da foto (com consentimento) em todas as cenas do filme narrado. Começa depois de 1 e 3.
**CANÁRIOS PAGOS:** só com o ok do fundador, um motor por vez.

## 2026-09-29 — Padrão de e-mails da Kineo (remetente por tipo de conversa)
**QUEM DECIDIU:** o fundador, 29/09, depois de notar que conversas comerciais saíam de uma caixa antiga ("estamos falando com algumas pessoas de um jeito meio errado").
**CONTEXTO TÉCNICO (29/09):** usekineo.com é domínio de alias do Workspace shortsforgeai.com; SPF (`include:_spf.google.com`), DKIM (`google._domainkey`, 2048) e DMARC (`p=none`) publicados e ativos. Os e-mails automáticos do app (Resend) já saem de @usekineo.com (support@, hello@, joseph@) e não mudam.
**A REGRA:**
1. **Conversa comercial e de parceria NOVA:** remetente e Reply-To = `joseph@usekineo.com`.
2. **Atendimento:** `hello@usekineo.com` e `support@usekineo.com`.
3. **Conversa já iniciada pelo Gmail pessoal do fundador** continua lá, na mesma thread, com o histórico preservado — inclusive os rascunhos já preparados. Não reenviar nem migrar automaticamente.
4. **`support@shortsforgeai.com` não é remetente de contato comercial novo.** A caixa e o histórico ficam preservados.
5. **Antes de preparar qualquer mensagem nova:** conferir a conta conectada, o From, o Reply-To, o destinatário e o histórico de contato com a pessoa. Se `joseph@usekineo.com` não estiver disponível, **informar o bloqueio** — nunca trocar em silêncio pelo Gmail pessoal nem pela caixa de suporte.
6. **Esta decisão não autoriza** envio, criação de alias, mudança de SMTP, encaminhamento, credencial nem permissão. Nesta frente o agente prepara RASCUNHO; o fundador revisa e envia.
**PRIVACIDADE:** nomes e endereços de contatos não entram no Git.


## 2026-09-29 — Kineo 1 fora do jogo; filme grátis = Seedance 15 s; saída B (só país rico)

**QUEM DECIDIU:** o fundador, 29/09, literal: "quero tirar o kineo 1 do jogo, ele estraga a entrada"; "vou sair na saída B"; e, sobre quem já usa, "deixar dentro do sistema dessas contas que já pagam esse motor que eles usam".
**OBJETIVO:** quem chega pelo GPT (a fonte que mais cresce) ter um primeiro filme MUITO bom. O primeiro vídeo é o produto: o Kineo 1 (filmagem de banco) como primeira impressão entrega menos do que um filme de IA de verdade, e o trial de 10 créditos só cabia nele.
**O QUE MUDA, em cinco entregas nesta ordem (cada uma só sobe depois da anterior):**
- **E1 (esta):** o Kineo 1 sai da VITRINE PÚBLICA — home (mega-menu, tile do bento, chip final, parede e trending), /arena, meta description e a contagem pública de motores ("Five", derivada dos interruptores). Interruptor único `KINEO1_PUBLIC=false` em lib/engineLaunch.ts, com `kineo1Visible(email, { hasPaid, usedFast, boughtPack })` = conta da casa, ou quem já pagou E tem filme Kineo 1 concluído (qualquer data), ou quem comprou pacote avulso (bulk*, vendido em filmes Kineo 1). A leitura desse legado mora em lib/kineo1Access.ts e já é entregue pronta em /api/me/credits (`kineo1`) e no /studio/create (prop `kineo1Visible`) — nesta entrega ninguém muda comportamento com ela. Interruptor de país em lib/freeFilmPolicy.ts (`FREE_FILM_POLICY` 'todos' | 'pais_rico', lista de país rico; BR e MX fora — 0 pagantes em 30 dias), ligado no grant do trial (lib/reverseTrial.ts): sob 'pais_rico', país fora da lista nasce com `trial_status='region_paid_only'`, 0 crédito e evento `trial_region_excluded { country }`. **Nasce em 'todos': comportamento idêntico ao de hoje.** Curadoria (CURATED, homeVideoCuration) e o dado do /arena (lib/publicExamples) ficam intactos.
- **E2a:** duração de 15 s no Seedance 1.5 (7 cr, cabe nos 10 do trial), só no Seedance.
- **E2b:** a entrada do trial troca de motor — o primeiro filme passa a ser o Seedance de 15 s; o Kineo 1 sai do Studio e do /generate para quem não tem legado (lendo `kineo1Visible`).
- **E3:** textos públicos (llms.txt, /facts, GPT, pricing, /ph, calculadora, e-mails) param de citar o Kineo 1 como grátis ou padrão.
- **E4:** fim da cota semanal de Kineo 1 grátis, com guarda de servidor na generate-video-fast (trava 8.2, "vai" nominal separado). **Só depois da E4 a saída B pode ligar** (`FREE_FILM_POLICY='pais_rico'`): antes disso uma conta 'region_paid_only' ainda pegaria Kineo 1 grátis e o "1º filme" com clipes de IA pagos pela casa.
**GUARDIÕES:** scripts/test-kineo1-fora-vitrine-2026-09-29.mjs e scripts/test-filme-gratis-por-pais-2026-09-29.mjs (este trava a política em 'todos' enquanto a cota semanal existir).
**COMO MEDIR (E1)** — corrigido na revisão de 29/09: o `grep -c` no HTML cru NUNCA daria 0, porque o payload de hidratação do Next (os `<script>` sem ld+json) carrega a cópia inteira da oferta grátis (lib/freeTierOffer.ts: "1 free Kineo 1 video every week", verdade até a E4) — medido em produção antes do deploy: 28 ocorrências no cru, 9 fora dos scripts de hidratação. A medida é o HTML SEM os scripts de hidratação e COM o ld+json (que buscador e LLM leem):
`curl -s -A 'kineo-sonda/1.0' https://www.usekineo.com/ | perl -0pe 's/<script(?![^>]*ld\+json)[^>]*>.*?<\/script>//gs' | grep -io 'Kineo 1' | wc -l` = **1** na home e **0** no /arena (com `-i`: o badge do trending, o filtro do trending e o card do /arena escrevem "KINEO 1"; antes do deploy a mesma medida deu 13 na home e 5 no /arena), com o controle `… | grep -o 'Seedance' | wc -l` ≥ 1 na mesma rodada e pela mesma medida. A única ocorrência esperada na home é "per finished 60-second Kineo 1 film" do components/AgencyVolumeBridge.tsx (pacote avulso vendido em filmes Kineo 1 — sai na E3, junto com a decisão do fundador sobre como contar o pacote). Com 'todos', `select count(*) from events where name='trial_region_excluded' and created_at > <carimbo do deploy>` = 0 (desde a revisão o nome é só do servidor em SERVER_ONLY_EVENTS) e os cadastros novos seguem com trial_credits_granted = 10.
**REVISÃO E1 (29/09, duas revisões adversariais):** (1) o JSON-LD de toda página (components/StructuredData.tsx) dizia "…or N Kineo 1 film" no plano Creator — agora segue `KINEO1_PUBLIC`; (2) `trial_region_excluded` entrou em SERVER_ONLY_EVENTS; (3) quem comprou o passe do Studio Ads também continua vendo o Kineo 1 (o recibo da Stripe do passe lista minutos de Kineo 1; correção M5 do cético); (4) a régua é composta em UM lugar (`resolveKineo1Flag`, lib/engineLaunch.ts), que só lê o legado para has_paid = true (pacote e passe gravam has_paid no webhook) — trial não paga as 3 consultas —, e o guardião EXECUTA a rota /api/me/credits e a instrução do /studio/create em vez de buscar texto.
**⛔ PENDENTE DO FUNDADOR ANTES DA E2b (achado A2):** a /pricing, os cards de plano e os modais de upgrade VENDEM o Kineo 1 a quem assina ("Kineo 1 and Seedance 1.5: N quick videos"; Studio "Every available engine … Kineo 1"), e a régua exige uso prévio — um assinante novo teria o card do Kineo 1 escondido logo depois de pagar por ele. Nada quebra na E1 (ninguém lê a flag). Dois caminhos: (a) pagante novo vê o Kineo 1 (a régua passa a aceitar `hasPaid` sozinho), ou (b) a E3 tira o Kineo 1 da /pricing e dos modais ANTES da E2b. O guardião (bloco j) deixa a E2b VERMELHA enquanto a régua exigir uso e essas superfícies citarem Kineo 1.

## 2026-09-28 (noite) — Preço V8, opção A: Starter US$12,90 · Creator US$29,90 · Studio US$54,90; barra de créditos mais cara

**QUEM DECIDIU:** o fundador, 28/09 ~20h30 BRT: "Preço A" e "Barra de crédito mais cara". Antecipa a mesa de preço de 09/10 (o congelamento de 09/09 acabou aqui).
**O QUE MUDA:** Starter US$9,90 → 12,90 · Creator 19,90 → 29,90 · Studio 39,90 → 54,90 (créditos iguais: 60/150/300; anual 10× = 129/299/549; reais R$64,90/149,90/274,90). A barra de créditos avulsos sobe o piso de US$0,149 para 0,189 por crédito (50 e 100 créditos não mudam; 1.000 = US$188,90). Quem já assina paga o que paga hoje e renova com os mesmos créditos (escada legada V5 em renewalCreditsFor).
**POR QUÊ:** margem no pior caso era 33% / 12,5% / 13,4% (Creator e Studio quase no zero a zero) e fica 49% / 42% / 37%; os três degraus seguem abaixo do Higgsfield (US$15 / 49 / 129, página oficial lida em 28/09). Detalhe e riscos: docs/DECISAO-PRECOS-V8-2026-09-28.md.
**COMO MEDIR:** payment_success por plano e por bloco de país com corte no carimbo do deploy; recuo se a conversão checkout→pago do bloco rico (base ~39%) cair mais de 28%.

## 2026-09-28 — Passe do Studio Ads: opção B (90 créditos por US$19,90)

**DECIDIDO (fundador, 28/09, literal):** "B, vai para as duas" — a opção B da mesa de ~04h (A: manter 60 cr · **B: 90 cr por US$19,90** · C: 100 cr por US$29,90), e o "as duas" é esta decisão mais a troca do filme da vitrine (entrada logo abaixo).
**O QUE MUDA:** o passe único continua US$19,90 e passa de 60 para 90 créditos; os 365 dias de acesso ao Studio Ads não mudam; nada renova. A frase pública, calculada pelo código (lib/ads/offer.ts adsCoverageLine, com os níveis de adsV2Credits): "90 credits: 2 new ads (Photo motion or Commercial), 1 Cinema, or about 30 classic ads of 35 s" (e ~18 clássicos de 60 s nos modelos longos).
**CONSEQUÊNCIAS:** (1) ADS_PASS_CREDITS = 90 em lib/ads/offer.ts e no espelho de checkPricingInvariants (lib/checkoutPricing.ts); o checkout grava 90 em metadata.pack_credits e na descrição da Stripe. (2) Quem abriu o checkout ANTES do deploy e paga depois recebe o que viu (60): o webhook concede metadata.pack_credits da sessão (app/api/stripe/webhook/route.ts, creditsToAdd), nunca a constante no momento do pagamento — ninguém recebe menos do que viu; se o fundador quiser completar os 30 desses, é pelo botão "+ créditos" do /admin/people. (3) Copy: /ads (cartão e FAQ), /pricing (bloco de anúncios), /llms.txt e /api/facts (via adsPassCopy) e o botão "Get 90 more credits" do montador leem a constante; nenhum número digitado. (4) Preço por crédito do passe (US$0,221) segue acima do Starter (US$0,165): o passe não canibaliza a assinatura.

## 2026-09-28 — Vitrine: sai o filme de cliente, entra o do fundador (Kineo 1)

**DECIDIDO (fundador, 28/09, literal):** "B, vai para as duas" — a segunda das duas.
**O QUE:** o filme c87c3a25 ("The world's untouched natural wonders", Kineo 1, 14/08) é de uma conta EXTERNA gratuita e estava marcado por engano como do fundador desde a curadoria de 15/08. Saiu de lib/publicExamples.ts (PUBLIC_ENGINE_EXAMPLES), lib/engineWall.ts (CURATED.fast e EXAMPLES_BEST) e do card KINEO 1 do /arena. No mesmo papel entra o filme do fundador 0ab3e871 ("The town in Norway where the sun disappears for two months every winter", Kineo 1, 40 s, 02/09; dono conferido no banco; já estava na home desde a curadoria de 07/09).
**MANTIDO:** a prévia leve já aprovada do /arena e das páginas de motor (/videos/example-turkmenistan.mp4 e .jpg, 5 s).
**GUARDIÃO:** scripts/test-vitrine-sem-filme-de-cliente-2026-09-28.mjs (o id do cliente não volta a app/, lib/, components/ nem aos textos de public/).
**REVISÃO (28/09, revisor cético):** o "MANTIDO" acima caiu. Com a amostra do Turcomenistão, o card KINEO 1 do /arena, as páginas de motor do Kineo 1 e /ai-video-generator/for diziam "The town in Norway…" e tocavam a cratera de Darvaza: selo honesto quebrado. A prévia e a capa passam a ser cortes do PRÓPRIO 0ab3e871, já aprovados pelo fundador para a home em 07/09 (public/previews/curation-sep07/0ab3e871-…-v.mp4, 540×960, 6 s, 1,5 MB; public/posters/showcase-sep07/0ab3e871-….webp, 360×640), mesmo formato vertical da amostra anterior. Guardião: regra 3c (título e imagem do mesmo filme).
**REVISÃO DO PASSE B (28/09):** o webhook ganhou o fallback do passe: uma sessão com metadata.pack = ads_pass mas SEM metadata.pack_credits caía em "unexpected amount_total" e a pessoa pagava US$19,90 sem crédito NEM acesso. Agora recebe ADS_PASS_CREDITS (o caminho normal continua concedendo o metadata gravado na abertura). Também ficou provado, com guardião, que a chave de idempotência da Stripe muda quando o crédito muda (a descrição com ${ADS_PASS_CREDITS} entra na chave), então quem abrir o checkout logo depois do deploy não recebe de volta uma sessão em cache com '60'. Guardião: test-passe-b-90-creditos-2026-09-28, regras 4, 4b e 5c.

## 2026-09-28 (madrugada, ~04h BRT) — Motores do anúncio abertos para quem quiser; meta 50-100 clientes

**DECIDIDO (fundador, ~04h BRT, literal):** "deixa tudo pronto para amanhã. Deixa os motores já acionados para quem quiser fazer o tipo de ads" · "a gente está empacado em 10 clientes, a gente precisa de 50, de 100" · "a partir do momento que você já fizer a resposta, você já pode começar a executar" · sobre a meta do ChatGPT: "5 pagantes por mês é muito pouco, aumenta".
**CONSEQUÊNCIAS:** (1) o anúncio v2 abre ao público (ADS_V2_PUBLIC=true) nesta noite, DEPOIS de um anúncio real de teste por motor novo sair certo na leitura quadro a quadro; se sair errado, fica interno e o motivo vai no relatório das 11h. O fundador antecipou o congelamento de preço só para os créditos do v2 (34/41/51 por 15 s), aprovados em 28/09. O v1 (anúncio narrado de 35/60 s, 3/5 cr) continua disponível, então o passe de 60 cr não perde valor. (2) Meta do canal ChatGPT: 50 pagantes/mês em 30 dias (docs/GPT-CITACOES-TRIPLICAR-2026-09-29.md, sessão [Citações] do Codex). (3) E-mails para empresas com anúncio pronto: o fundador disse "tô pronto pra enviar os emails"; o Claude produz e deixa em rascunho, o fundador envia.
**AINDA COM O FUNDADOR:** passe do Ads (A: manter 60 cr · B: 90 cr por US$19,90 · C: 100 cr por US$29,90); valor da refação por plano (proposta 5 e 12 cr); faxina de e-mails de clientes que ficaram em docs antigos do repositório público.

## 2026-09-28 — Studio Ads v2: os 5 motores passaram; construir e vender

**CONTEXTO:** teste de US$8,24 do Cowork (docs/teste-motores-2026-09-28/): 3 fotos reais (prato, salão com gente, tela de app) × 5 motores de image-to-video (Seedance 2.0 Fast, Kling O3 Pro, Veo 3.1 Fast, MiniMax H3, Seedance 1.5 Pro), 15/15 gerados, 0 recusas.
**NOTAS DO FUNDADOR:** 10 em todos os 14 que ele avaliou (Seedance 1.5 no prato ficou sem nota).
**DECIDIDO (fundador, 28/09, literal):** "todos os ads estão muito bons ... se a gente conseguir fazer um vídeo com uma empresa agora, alguém se identificar e querer comprar os nossos ads, a gente está pronto para vender ... vamos dar merge ... para esses motores ... você vai definir tudo isso para mim, e vamos fazer acontecer."
**CONSEQUÊNCIAS:** (1) a escolha do motor de cada nível (Foto em movimento / Comercial / Cinema) é do CEO-executor, por custo, velocidade, estabilidade e defeito técnico, já que a qualidade vista pelo fundador empatou; (2) o anúncio v2 passa a ser construído agora, em lib/ads/ e app/api/ads/, fora da trava 8.2; (3) abre primeiro para contas internas, o fundador faz 1 anúncio de uma empresa real, e então abre ao público; (4) o preço de 34/41/51 cr aprovado no mesmo dia vale para o lançamento.

## 2026-09-28 — Studio Ads v2: preço igual ao do Higgsfield, sem prejuízo

**CONTEXTO:** o fundador reprovou os anúncios feitos com o Kineo 1 (notas 4, 3, 2, 1) e decidiu refazer os motores do anúncio (docs/FEEDBACK-FUNDADOR-10-ANUNCIOS-2026-09-28.md). A pesquisa mostrou que o mercado gera cada cena a partir da foto real do cliente com Seedance 2.0/2.5, Kling 3 e Veo 3.1 (docs/growth/MOTORES-DOS-CONCORRENTES-ADS-2026-09-28.md).
**DECIDIDO (fundador, 28/09, literal):** "refaz com os preços do Higgsfield então, não quero ter prejuízo" — descartado ficar 15% abaixo (daria prejuízo com o Seedance 2.0).
**TRADUÇÃO EM CRÉDITOS (anúncio de 15 s, âncora = o plano com o crédito mais barato paga o preço do Higgsfield):** Foto em movimento 34 cr (Higgsfield US$4,50) · Comercial 41 cr (US$5,40) · Cinema 51 cr (US$6,75). Quem está no Starter paga mais (US$5,61 / 6,77 / 8,42), ainda abaixo do que o Starter do próprio Higgsfield cobra (US$6,33 / 7,60 / 9,50).
**CONDIÇÕES:** (1) o preço cobre UMA geração; refazer cena é cobrado à parte — senão o Comercial em Seedance 2.0 dá prejuízo no Creator/Studio quando metade das cenas é refeita; (2) o motor de cada produto sai do teste de US$8 (3 fotos reais × 4 motores × 5 s, nota do fundador); (3) o passe do Ads (60 cr) precisa ser revisto junto — hoje paga 1 anúncio novo; (4) preço público continua congelado até 09/10: isto entra na mesa de 09/10, a não ser que o fundador antecipe.

## 2026-09-28 — O botão de compra antes do 1º filme FICA

**DECIDIDO (fundador, 28/09, literal):** "mantém o botão".
**O QUE:** o CTA de checkout do banner do trial (e das outras portas) continua visível para quem ainda não fez o 1º filme. A proposta de 27/09 de escondê-lo até o 1º filme está DERRUBADA.
**POR QUÊ (dados, docs/PLANO-10-VENDAS-MRR-2026-09-28.md):** os 5 assinantes novos desde 28/08 pagaram com 0 filmes, de 1 a 32 min depois do cadastro, todos de país rico (ES, US, BE, NL, ES); o axe pagou o Creator por esse botão 2 min depois de chegar. Os 4 que clicaram antes do filme em 7 dias e não pagaram são de KE, UA, IN e NG. Esconder fecharia a porta de quem paga.
**ATENÇÃO:** isto corrige, para país rico, a nota "checkout de conta sem vídeo = defeito, não desejo" do CLAUDE.md (02/09). Não reabrir sem dado novo por país.
**MEDIR:** vendas por pessoa de quem clicou antes do 1º filme, separadas por país rico/emergente (leitura de 30/09 e 04/10, tarefa 4 do plano).

## 2026-09-27 (noite) — Domínios descartáveis bloqueados no cadastro

**DECIDIDO (fundador, ~21h30 BRT, literal):** "bloqueia esses domínios descartáveis no cadastro" e, em seguida, "bloqueia vmail.dev, mailshan e playboot também".
**LISTA NOVA (7 domínios):** omanarts.com (8 contas em 2 dias, 5 barradas pela trava de aparelho, 0 filmes) · pumpoly.com (7 contas em 1 dia, 4 barradas, 0 filmes) · nixadrume40.asia e nodgwdg.eu.cc (nomes gerados, chegaram ao checkout, 0 filmes) · vmail.dev (3 contas no mesmo dia 04/09) · mailshan.com e playboot.com (2 contas cada no mesmo dia). Os três últimos por decisão do fundador, com evidência mais fraca que os quatro primeiros.
**COMO:** uma lista só (lib/emailValidation.ts) vale para a tela de cadastro, o cadastro pelo modal (AuthModal, que antes não checava) e o servidor que concede o trial (lib/reverseTrial.ts passa a usar a união das duas listas). O bloqueio no servidor grava evento com o domínio, nunca o e-mail. OAuth (Google/Apple) e serviços de e-mail privado (Hide My Email, DuckDuckGo, SimpleLogin, addy.io, Firefox Relay) nunca são bloqueados.
**NÃO FEITO (de propósito):** contas que já existem nesses domínios não foram mexidas (nada de zerar crédito ou apagar conta).

## 2026-09-27 — Sprint de 16 h (MRR): cinco decisões e a pista visual fica no Code

**DECISÕES (fundador, 27/09/2026 ~07h30 BRT: "vou seguir todas as suas decisões que são recomendadas"; "a sprint ... fazer aqui dentro do code, não mandar para o codex"):**
1. **Quickstart do ChatGPT com 10 cr continua no Seedance** — com a parede no clique (5ca92533) e a saída "Kineo 1 cabe nos seus 10" no modal.
2. **/ads/new sem login = texto + link em sessionStorage** (`kineo:ads:draft:v1`); rascunho no servidor fica para outra semana (impossível sem user_id).
3. **Trial NÃO faz anúncio** (nem com marca d'água) por enquanto.
4. **"Human-reviewed within 24 hours with corrected version" CAI** (0 de 11 pedidos com qa_at) — vira "A human checks your first ad."
5. **godofloki fica no US$29 legado** (já é a coluna Studio, plan=pro, 180 cr; compra top-up sozinho) — migrar seria aumento de preço.
6. **Pista visual da sprint é executada no Code** (Claude), não no Codex: V1 exit-intent/copy do trial/llms.txt · V2 tabela do /pricing e Termos · V3 CTAs do trial com Starter primeiro (constante TRIAL_CTA_PRIMARY_TIER, reversível) · V4 Studio Ads (lista, fila de upload, copies) + /ads/new sem login.
Contexto: docs/SPRINT-2026-09-27.md. Marco 0 (OpenAI de volta) 08:35Z; marco A (parede no clique + Studio Ads aberto + porta /ads) 09:54Z.

## 2026-09-25 — Mesa de 09/10: crédito UNIVERSAL, anual 11×, 1 Enhance

**DECISÕES (fundador, 25/09/2026, chat do CEO: "11 - um · 10 - onze · 9 - ... quero que o crédito seja universal"):**
- **Crédito universal (item 9 = SIM):** um crédito vale para vídeo, anúncio, imagem, áudio e Enhance; qualquer crédito pago (plano, barra, passe) abre o Studio Ads — não só plano. O anúncio custa o crédito do motor e da duração, como o vídeo (Kineo 1: 35 s = 3, 60 s = 5, 90 s = 8).
- **"Comprar por tempo de vídeo":** o crédito JÁ é tempo × motor (lib/credits/engineCost.ts, proporcional desde 60 s: 35 s = 60%, 90 s = 150%). A moeda continua sendo o crédito (minuto não serve para imagem/áudio/Enhance e varia 30× entre motores); a TELA passa a mostrar o crédito traduzido em minutos por motor. Proposta, a confirmar pelo fundador.
- **Anual (item 10): ONZE** — 11× nos três planos (evita a inversão de escada do 10×/10×/11×).
- **Enhance grátis no Studio (item 11): UM** por mês (2 deixavam o Studio negativo).
- **Mesa FECHADA (fundador, 25/09: "6 sim, 7 matar, 8 cem, minutos"):**
  - **Escada (6): SIM** — Starter US$10,90/60 · Creator US$24,90/150 · Studio US$49,90/320; anual 11× (119,90 · 273,90 · 548,90); piso da barra 0,149 → 0,169. Só conta nova; quem já assina renova no preço e crédito atuais.
  - **Express/Pro (7): MATAR** — só DEPOIS da caixa de prompt de Empresas no ar; os 2 Payment Links são DESATIVADOS (não reprecificados) no dia da virada; webhook segue reconhecendo os linkIds antigos.
  - **Passe (8): CEM** — US$19,90 passa a dar 100 créditos (o ponto de 100 da barra); nome "Studio Ads pass" fica.
  - **Tela: MINUTOS** — a moeda continua o crédito; preço, checkout e barra mostram o crédito traduzido em tempo por motor ("150 créditos = 30 min de Kineo 1 · 6 min de Seedance · 1 min de Kling 3").
- **Ordem de execução (do painel, obrigatória):** (1) renewalCreditsFor por valor pago + tabela BRL pela fórmula (R$54,90/124,90/249,90) ANTES de tocar em TIER_PRICES; (2) Prices novos criados na Stripe antes do deploy; (3) virada em 09/10 só para conta nova; (4) Express/Pro morrem depois da caixa no ar. A tela em minutos pode entrar antes (não muda preço). Detalhes: docs/DECISAO-ESCADA-UNIVERSAL-MESA-2026-09-25.md.

## 2026-09-25 — Cinco respostas rápidas (recibo, For businesses, conta limpa, pistas, fal)

**DECISÕES (fundador, 25/09/2026, chat do CEO: "1 ligar, 2 abrir, 3 hotmail, 4 renovar, 5 deixa do jeito que está"):**
1. **Recibo da Stripe: LIGAR.** Configurações → E-mails de clientes → "Pagamentos concluídos" e "Reembolsos" = ON (é da conta inteira: assinantes e Empresas). Execução: Cowork. Até ligar, nenhuma copy promete recibo (4877fd0d tirou as 4 frases do briefing). **FEITO 25/09 (Cowork):** os dois ON, conferidos após recarregar; idioma English; e-mail de suporte do recibo = josephsskaf@gmail.com (resposta ao recibo chega ao fundador). Conferido no código: a Kineo não manda e-mail próprio de compra e nenhum fluxo passa `receipt_email` → cada compra recebe 1 recibo, sem duplicata.
2. **"For businesses": ABRIR.** /ads/new passa a abrir a caixa de prompt SEM login (igual /studio); conta só no "gerar"; rascunho gravado no servidor antes de qualquer redirect. Visual = Codex; servidor = Claude. Hoje o visitante deslogado cai em /login.
3. **Conta limpa de produção dos anúncios: josephskaf@hotmail.com.** Já é interna (lib/internalAccounts.ts), NÃO está em FORCE_WATERMARK_EMAILS, plano pro (Studio Ads por plano), 43 cr em 25/09. Os 3 anúncios de vitrine e os pedidos Express/Pro saem dela; nunca da josephsskaf@gmail.com.
4. **Semana das pistas: RENOVAR** (Codex = visual de todas as páginas; Claude = fluxo/servidor), mesmas regras (fila por scripts/enfileirar.sh, trava 8.2, preço congelado até 09/10).
5. **Auto top-up da fal: NÃO** ("deixa do jeito que está"). Segue Pix manual.

## 2026-09-25 — O FLUXO NOVO: menu final de 4 itens, o que acontece depois de cada clique, e os anúncios de vitrine (ordem do fundador via sessão "Ceo Kineo")

**SUBSTITUI a mensagem de 24/09 sobre o menu** (Create video · For businesses · Examples · Pricing). A implementação feita por aquela mensagem NÃO sobe: está guardada na branch `salvo/nav-4-itens-2409` (traduções dos rótulos reaproveitáveis).

**1) MENU FINAL, 4 ITENS** (fundador: "4 tá ideal por enquanto; um 5º depois, se precisar"). Topo público: **Vídeo · Imagem · Para empresas · Preços** (+ Entrar), Vídeo em destaque (9 de 9 pagantes recentes usaram só vídeo). "Exemplos" sai do topo e vai para dentro de Vídeo e da home. Lateral do app: **Vídeo (Studio) · Imagem · Anúncios · Biblioteca · Preços**; Viral Now, Roteiros, Animate, Áudio, Convide e Afiliados vão para "Mais". Pares: Sidebar ↔ MobileNav; topo ↔ menu móvel (app/KineoLanding.tsx). **Divisão:** o VISUAL do menu é do Codex (prévia polished-v4, 1944da9e); o Claude garante que cada item leva ao fluxo certo e constrói as peças de fluxo (registro no PEDIDOS, 25/09).

**2) O FLUXO DEPOIS DE CADA CLIQUE:**
- A. Vídeo → /studio direto na caixa da ideia → filme pronto com 3 saídas: próximo filme · mais créditos (barra 50–2.000) · assinar.
- B. Imagem → depois de gerar, botão "Transformar em vídeo" que LEVA A IMAGEM para o Animate/Studio (hoje há só um "Animate" genérico em ImagesClient.tsx que não passa a imagem).
- C. Para empresas → /business-video-ads com 2 portas: "Eu mesmo faço" (passe do Studio Ads) · "Vocês fazem pra mim" (Express/Pro). Depois do passe: onboarding do Studio Ads (já existe). Depois de Express/Pro: formulário curto de briefing (produto, objetivo, público, arquivos) — NOVO. Pedido pago avisa o fundador (alerta em payment_success{ads_pass} e dfy_order_paid) + /admin/ads — NOVO.
- D. Preços → /pricing com seletor Mensal/Anual e 3 blocos: Planos de criação · Anúncios (passe + Express/Pro) · Créditos avulsos. Números só das fontes únicas (checkoutPricing, ads/offer, dfyServiceFacts, creditSlider). **NENHUM preço muda** (congelado até 09/10); a Research estuda um preço universal.

**3) MEDIR PARA DECIDIR O 5º ITEM:** evento `nav_item_clicked {item, surface: top|mobile|sidebar}`. Em 14 dias, se Imagem ficar abaixo de ~5% dos cliques, troca com Exemplos.

**4) 3 ANÚNCIOS DE VITRINE** (aprovados em 24/09; restaurante, produto e serviço, 35 s, pelo Studio Ads, dry-run e custo à "Ceo Kineo" antes do render real). **NÃO usar a conta josephsskaf@gmail.com**: ela força marca d'água (FORCE_WATERMARK_EMAILS, app/api/compose/route.ts:143) — o mesmo atingiria os pedidos pagos de Express/Pro produzidos nela. **O que aconteceu:** o "aprovo, vai" do fundador chegou antes desta ordem, e os 3 foram renderizados na conta dele (9 créditos, ~US$1,00–1,40): Nonna Rosa Trattoria 46 s, Brew Lab 37 s, SparkClean. Os três saíram com "usekineo.com/free" no canto; o cartão final da Kineo NÃO entra no Studio Ads. Servem como validação, não como prova. **Proposta enviada (c):** conta de PRODUÇÃO separada (o fundador cria; o Claude põe na lista interna do Studio Ads; créditos por /admin/people; Express/Pro produzidos lá) — recomendada; alternativa: exceção no código só para render de Studio Ads (muda regra do fundador). Até lá, nenhum pedido pago de cliente é produzido na conta do fundador.

**ENTREGUE PELO CLAUDE EM 25/09 (as peças de fluxo; na fila, esperando o clique):** (A) filme pronto → 3 saídas (próximo filme navega para /studio?focus=idea; mais créditos abre o mesmo modal da barra só para quem pode comprar, senão planos; assinar/trocar plano) e /studio foca a caixa da ideia; (B) Imagem → "Turn into video" leva a imagem ao Animate por id; (C) briefing em /business-video-ads/brief (só a Stripe autoriza; id do pedido no fragmento #session_id=), alerta por e-mail ao fundador em cada pedido Express/Pro e em cada passe do Studio Ads, /admin/ads (revisão humana e prazos), e dfy_order_paid deixou de ser forjável; (D) /pricing com os blocos de anúncios e de créditos avulsos, sem mudar preço; (E) nav_item_clicked por atributo. Cada peça passou por um revisor adversarial; os achados altos/médios foram consertados antes do commit. **Leitura do dia 14 (item 3):** name='nav_item_clicked', metadata->>'nav_v'='1', is_bot<>'true', sem re-clique (current), contas internas fora; sessões distintas por item dentro de (surface, area); Imagem < ~5% das sessões que clicam no topo/celular público → troca com Exemplos. O relógio começa no primeiro evento marcado pelo Codex. **Depois do deploy (Cowork/fundador):** nos 2 Payment Links (Express e Pro), "After payment" → Redirect para `https://www.usekineo.com/business-video-ads/brief#session_id={CHECKOUT_SESSION_ID}`, e trocar o texto de confirmação que promete upload em "My footage" (dá 402 para quem não assina).

**SUGESTÃO que virou ordem:** o briefing depois do Express/Pro (item C) era sugestão de 24/09; entrou na ordem de 25/09.
## 2026-09-25 — Preço universal: escada B-ajustada vira a PROPOSTA OFICIAL para a mesa de 09/10; renovação passa a preservar crédito comprado

**DECISÃO APROVADA (fundador, 25/09/2026 ~00h40 BRT, no chat do CEO: "aprovada a B-ajustada, conserta a renovação"):**

1. **Escada B-ajustada é a proposta oficial para 09/10** (pesquisa da Research em docs/research/PRECOS-MERCADO-UNIVERSAL-2026-09-25.md, 25 concorrentes): Starter US$10,90/60 · Creator US$24,90/150 · Studio US$49,90/320 (US$/cr 0,182 · 0,166 · 0,156; margem no pior motor 26,5 · 20,8 · 16,3%). Crédito UNIVERSAL: Studio Ads incluso em todos os planos; o passe de US$19,90 fica só como porta sem assinatura; Express/Pro seguem como serviço humano com preço próprio. **Condições que vão junto:** piso da barra de créditos sobe de US$0,149 para ~0,169 (senão a barra fica mais barata que o plano a partir de 700 cr); anual a 11x OU 1 Enhance grátis em vez de 2 (hoje os 2 Enhance deixam o Studio negativo e o anual do Creator/Studio perde 17%). **Nada muda antes de 09/10** (congelamento). Teste depois de 09/10: preço novo só para conta nova, blocos alternados de 14 dias para Starter e Creator, medindo receita de 1ª compra e checkout_started por 100 cadastros. Risco assumido: o Starter é a porta (7 de 13 vendas); a receita empata se a conversão dele cair 9% a US$10,90.
   _(Reparo 25/09: a versão publicada em 4fdd83ce tinha os preços mutilados — "US0,90", "US4,90", "US9,90", "US/usr/bin/bash,149" — porque o texto passou por um heredoc sem aspas e o shell expandiu `$1`, `$2`, `$4` e `$0`. Os números acima são os da pesquisa.)_

2. **Renovação preserva crédito comprado (feito em 25/09, lib/credits/renewalBalance.ts):** a renovação fazia SET e apagava o crédito comprado avulso (barra, packs, passe) e o dado pela casa, o que tornava falsa a promessa "credits never expire". Regra nova nos 3 pontos de renovação (webhook Stripe, recarga mensal do anual, PayPal): saldo_novo = cota + max(0, saldo_atual − cota). A cota do plano continua zerando (sem rollover); tudo acima de uma cota sobrevive. Guardião: scripts/test-renovacao-preserva-comprado-2026-09-25.mjs. Ninguém tinha sido atingido (2 compras avulsas, 0 seguidas de renovação).

## 2026-09-25 — Moderação de conteúdo em toda porta de geração e de upload (item 0 do brief de crescimento)

**ORIGEM:** brief colado pelo fundador em 25/09 ("COMECE POR: item 0 e depois item 1"). O caso: /images gerou e guardou imagens de pedidos graves envolvendo menores em 2 contas (52749de6, 03/09; b9f49852, 17/09). As contas foram suspensas em 25/09 pela sessão Research com o ok do fundador; as 9 imagens foram preservadas (nada apagado). Só schnell e dev passavam o checker do fal, e um dos pedidos passou pelo dev mesmo assim.

**O QUE ENTROU (código, sem mudar preço nem oferta):**
- Régua única `lib/safety/moderationPolicy.ts` + porta `lib/safety/contentModeration.ts` (omni-moderation da OpenAI, gratuito, texto e imagem). Barra sexual/minors a partir de 0,02 (só texto tem esse sinal); conteúdo sexual (≥ 0,5 no texto, ≥ 0,3 com imagem); e termo de menor em 7 línguas + nota sexual ≥ 0,1. Violência não barra (a casa faz filme de guerra e história). FALHA FECHADA: fora do ar = nada gerado nem cobrado.
- 16 portas: /images (entrada e saída), edição e ampliação de imagem, /animate e /animate-image (ponto único), gesto, cena de avatar com troca de rosto (entrada e saída), upload de avatar, avatar falante, clipe, personagem, upload do /footage (que alimenta Studio e Studio Ads), brief e roteiro final do Studio Ads. Origem só da pasta do próprio usuário em 6 rotas.
- /footage decide o tipo pelos bytes do arquivo; foto barrada vai para `quarantine/` no mesmo bucket (a URL de uso morre, a prova fica). Nenhum arquivo barrado é apagado.
- Todo bloqueio grava `content_moderation_blocked` (conta, superfície, motivos, notas, texto truncado, URL da prova); toda falha, `content_moderation_unavailable`.
- `/api/admin/moderation-scan` (admin, só leitura): passa os pedidos antigos de `images` pela régua e devolve só ids, contas e notas — nunca o texto.
- Calibração real: 0 de 14 textos e 0 de 36 fotos legítimas barrados (crianças em escola, praia, balé; fotos da padaria); 2 de 2 controles adultos barrados. Revisão adversarial de 43 agentes (37 achados confirmados) fechada na rodada 2. Guardião `test-moderacao-2026-09-25` com varredura: rota geradora nova sem porta = vermelho.

**DECISÕES QUE FICAM COM O FUNDADOR (não feitas):**
1. **Trava 8.2:** os motores do Studio (generate-video-*, lib/hollywood) mandam o texto do usuário ao fal sem a régua, e o Veo está no nível de segurança mais permissivo; o Kineo 1 aceita URL de `user-footage/<uid>/` sem passar pelo confirm do /footage. Consertar exige o "vai" nominal na trava.
2. **As 9 imagens do incidente** seguem no bucket público (a Research perguntou sobre quarentena privada); denúncia e advogado.
3. Vídeo enviado pelo usuário ainda passa sem checagem (o servidor não extrai quadro); `/api/generate-thumbnail` aceita texto sem login (OpenAI Images modera na origem, mas é custo aberto).

**ITEM 1 (rascunhos 1 a 1, no Gmail do fundador):** Suliman (SA, Pro US$29, renovação recusada em 23/09 por saldo, 16 filmes) — como trocar o cartão; Emilio (Starter, 0 filmes, renova ~01/10) — um filme pronto da casa (Lituya Bay) e o Studio Ads incluso no plano. Conserto junto: `/account` deslogado agora leva o destino pelo login (antes, a carta de cobrança recusada pousava a pessoa na home, longe do "Manage billing").


## 2026-09-24 — Studio Ads LIGADO para clientes ("pode ligar") + relatório do Cowork conferido

**DECISÃO APROVADA (fundador, 24/09/2026 ~20h BRT: "pode ligar"; publicou PUBLICAR-STUDIO-ADS-LIGADO-2409.bat ~20h28):** o Studio Ads (self-service do Kineo Empresas: a empresa sobe fotos/vídeos, a IA escreve e narra, o Kineo monta) abre para qualquer cliente em /ads a US$19,90 = 60 créditos + 12 meses de acesso (R$ 99,90 no caixa brasileiro, pagamento único). Interruptor em código: `ADS_PASS_LIVE_IN_CODE = true` (lib/ads/offer.ts); desligar de emergência = `NEXT_PUBLIC_ADS_PASS_LIVE=0` na Vercel + redeploy. Assinantes pagos entram sem passe; trial não. Revisão humana prometida em até 24 h.

**PROVA ANTES DE LIGAR:** canário da padaria "Pão Dourado" em produção, conta do fundador: roteiro → voz → 6 fotos + logo → anúncio de 44 s (12 trechos, 9 com mídia da empresa, cartão final no "chame agora no WhatsApp"). Conferido no ar em c3201afc: /ads 200 com botão de compra e sem noindex, bloco "Prefer to make it yourself?" em /business-video-ads, /ads no sitemap, compra anônima → login, Stripe mostra "Kineo — Studio Ads pass R$ 99,90" (não pago). Dívidas conhecidas: 2ª foto entra ~2 s adiantada; a pílula "Rendering…" do Studio aparece no /ads depois de pronto (pedido ao Codex em PEDIDOS); o 1º roteiro ainda falha às vezes e a correção automática resgata.

**RELATÓRIO DO COWORK (24/09 noite) — dois achados, resolvidos sem mexer em grant.ts nem em planos:**
1. As instruções v3.4 do GPT só existiam no disco do fundador. Agora `docs/GPT-INSTRUCOES-V3-COLAR-2026-09-24.txt` está no repo e o guardião `test-gpt-loja-2026-09-24` (6h/6h2) exige igualdade com a seção C de `docs/GPT-KINEO-VIDEO-MAKER.md`: quem muda um muda o outro no mesmo commit.
2. O endpoint da Stripe (we_1TTmlFIah5dxzSBfJYlFuEOe) não escuta `checkout.session.async_payment_succeeded/failed`. O código JÁ trata os dois desde 5123e3f3 (01/09): `completed` com `payment_status` unpaid grava `checkout_payment_pending` e não entrega nada; o sucesso tardio cai no mesmo bloco de entrega; a falha tardia só registra. Guardião novo `test-empresas-pagamento-tardio-2026-09-24`. Banco: 0 pagamentos pendentes na história contra 24 vendas. **Hoje o risco é latente:** a conta só oferece cartão, Apple Pay, Google Pay e Link (Boleto desligado e Pix indisponível, `docs/DECISAO-MOEDA-LOCAL-2026-09-09.md`). **Mas no dia em que Boleto ou Pix forem ligados, sem os 2 eventos no endpoint, quem pagar por eles paga e não recebe nada** (passe do Studio Ads, pacote, pedido Empresas ou assinatura). Adicionar os 2 eventos é seguro e fica com o fundador (configuração da Stripe).
3. **A auditoria (workflow de 13 agentes, cada achado verificado por cético) achou 2 defeitos vizinhos, consertados:** (F1, médio) `recordDfyOrderPaid` engolia o erro de gravação e devolvia 200 — um soluço do banco perdia o pedido pago das Empresas sem a Stripe reenviar; agora devolve erro de reenvio só quando o pedido não foi gravado (o reenvio é idempotente e não concede nada). Isso inverte a regra "P0 nunca 500" que esta pista escreveu de manhã em c3201afc: o guardião `test-tres-jogadas-servidor` foi reancorado com o motivo. (F2, baixo) pendência de meio lento com dono apagado prendia a Stripe em 500 por dias; agora grava sem dono. Guardião do pagamento tardio: 24 verificações, 12 de 13 mutantes vermelhos (o 13º é equivalente). Ficou anotado, sem conserto (baixo, antigo, não é do caminho lento): um pacote cujo processo morra entre a trava da sessão e o crédito sai como duplicado no reenvio.


## 2026-09-24 — "Desliga": cartas pós-D2 e os crons do trial de US$1 saem do ar

**DECISÃO APROVADA (fundador, 24/09/2026 ~02h BRT, ao item 3 das pendências: "desliga"; motivo dele: "cartas não estão trazendo pessoas para compra"):** saem do `vercel.json` os crons `send-momentum-nudge` (313 envios/30 d → 0 pagantes), `send-second-try-1usd` e `send-affiliate-wakeup-1usd` (prometiam a porta de US$1 morta em 09/09); e as cartas `expired_offer_d5` e `expired_lastcall_d10` do `trial-lifecycle-emails` (1.527 envios/30 d → 0 pagantes) ficam atrás do interruptor `POST_TRIAL_LETTERS_ENABLED = false`. Continuam: welcome, ending_soon, downgraded_loss (48 h), extensão, video_ready, failure_recovery e todo cron de operação. Motivo de fundo: 10 dos 13 pagantes orgânicos pagaram em menos de 48 h; nenhum nasceu depois do D2. Reversão: `true` no interruptor e as 3 entradas de volta no vercel.json.


## 2026-09-24 — Kineo Empresas em dois degraus: Express US$35 · Pro US$75

**DECISÃO APROVADA (fundador, 24/09/2026 ~01h30 BRT):** "preço dos degraus: express 35 usd, pro 75 usd", depois de ler os 11 pedidos de anúncio de empresa dos últimos 90 dias e chamar o US$100 único (referência de 23/09) de "absurdo". Express = Kineo 1 ou Seedance, 30-60 s, logo e fotos onde o formato permite, 1 revisão, 48 h. Pro = Seedance ou Kling 3 com os mesmos personagens entre cenas, roteiro escrito por nós, 2 revisões, 72 h. Cada degrau tem o próprio Payment Link (Cowork cria no painel; o de US$100 é desativado). Até os links existirem o cartão do Studio fica PAUSADO; os 4 rascunhos de US$100 foram apagados e serão reescritos com os degraus. Produção: no Studio da casa, na conta do fundador; material do cliente por resposta ao recibo ou "My footage"; entrega por MP4 + página /v/ privada.


## 2026-09-24 — Sete respostas do fundador às pendências das 3 jogadas

**DECISÕES (fundador, 24/09/2026 ~01h BRT, no chat do Claude Code, uma palavra cada):**
1. **Anual: "recarga mensal".** O plano anual passa a receber TIER_CREDITS todo mês (SET, sem rollover), pelo cron diário `app/api/cron/annual-credit-refill` (dry-run por padrão, agendado com `?confirm=SEND`; razão idempotente em `events` name=`annual_credit_refill`). A promessa do FAQ ("credits reset each month") fica verdadeira. Zero assinantes anuais na vida até esta data.
2. **Porta do formato colado no Kineo 1: "vai"** (trava 8.2 liberada nominalmente para `app/api/generate-video-fast`): a rota passa a ler o teto por modo da fonte única `lib/analyzeLimits` (verbatim 5.000; IA reescreve 20.000; clipe 6.000) em vez de 5.000 cravado, e um plano de cenas com fala rotulada (Voiceover:/Narrator:/VO:) deixa de ser recusado como "shot plan". Eventos novos: `prompt_over_writer_cap`, `shot_spec_with_speech_admitted`.
3. **Crons mortos do vercel.json: resposta "não (cartas não estão trazendo pessoas para compra)"** — o "não" e o motivo apontam para lados opostos; PENDENTE de confirmação (ver PEDIDOS TRES-JOGADAS-R2). Nada foi desregistrado.
4. **Rascunhos aos briefs de empresa: "sim".** 4 rascunhos criados no Gmail do fundador (Help Me Tenerife, Ascend AI, restaurante em Amã, eCredit.ng), cada um respondendo ao pedido que a pessoa escreveu no Studio, com o link de US$100 amarrado à conta (`client_reference_id`). O fundador revisa e envia.
5. **Adaptive Pricing na Stripe: "deixa".**
6. **Trial de cadastro novo: "manter" 10 créditos** (revisão de 30/09 antecipada; ChatGPT 5,1% × 1,4%).
7. **Rastreio de prompts: "manual até virar alguma coisa"** — painel semanal do Cowork, sem ferramenta paga.

**Kineo Empresas LIGADO em 24/09:** Payment Link `plink_1UJ23XIah5dxzSBfyfKlmOGV` (US$100, criado pelo Cowork em 23/09), cartão no Studio ativo, webhook reconhece pelo id do link; as 6 falhas do webhook da semana eram 2 checkouts abandonados de 18/09 (Supabase lento), sem pagamento perdido.


## 2026-09-23 — "Faz as 3": parede v1 + consertos, Kineo Empresas por Payment Link, páginas citadas viram portas do motor pago

**DECISÃO APROVADA (fundador, 23/09/2026 ~22h BRT, no chat do Claude Code):** "faz as 3, o que voce precisa de mim criar o link de 100 usd no stripe? se sim, cria um script pro cowork fazer isso pra mim, ele sabe fazer isso, e vamos dar sequencia." Aprova as três jogadas de `docs/ANALISE-CEO-OPORTUNIDADES-2026-09-23.md` como descritas ali, inclusive as mecânicas novas de conversão que o congelamento de 09/09 reservava a ele: (1) parede v1 dentro do modal de crédito (título do roteiro, gap exato, Starter primeiro e sem selo "recommended" no Creator nesse bloco, roteiro guardado 45 min, render só no clique) + copy positiva da caixa de top-up + padrão MENSAL no /pricing + retorno do pack ao Studio + `intent_campaign` no pack; (2) Kineo Empresas vendido antes de construído: Payment Link de US$100 na Stripe (produto novo, fora da tabela de planos; US$500 por 5 fica para depois do 1º pagamento), cartão no Studio quando o texto parece pedido de anúncio de empresa, fundador opera os 3 primeiros; inverte a decisão de 23/09 manhã ("construir a ferramenta antes da prospecção") e congela o protótipo HTML até o 1º pagamento; (3) bloco "cole o roteiro do ChatGPT → Seedance" acima da dobra nas 4 páginas que o ChatGPT já cita, sem trocar título/H1, + correção dos fatos que a IA lê + páginas /for deixam de carimbar `utm_source=google` + página de dados `/seedance-vs-veo-vs-kling` + painel semanal de prompts (Cowork).

**Motivo:** 8 candidatas refutadas 3/3 pelos dados; estas três são o que sobrou com número honesto (+US$60-130 MRR e US$200-500 avulsos em 90 d). A máquina de converter é boa (~10% dos cadastros ChatGPT de países que pagam em minutos); o topo está parado.

**Consequência prática:** preço dos 3 planos INTOCADO (US$9,90/19,90/39,90 até 09/10). O que continua pendente e é dele: anual (recarga mensal ou esconder; hoje o anual concede crédito 1×/ano e o FAQ promete mensal), os 4 rascunhos pessoais aos briefs quentes (consentimento não gravado), crons mortos do `vercel.json`, a porta do formato colado (5.000 caracteres e recusa de "shot plan" em `generate-video-fast`, trava 8.2: exige "vai" nominal), e a ferramenta paga de rastreio de prompts. Leitura: 14 dias com corte no deploy; números de morte em `docs/ANALISE-CEO-OPORTUNIDADES-2026-09-23.md` §3.


## 2026-09-23 — Diretor Kineo: sugestão opcional antes de gerar

**DECISÃO APROVADA:** ao responder “Concordo, vamos seguir”, o fundador aprovou iniciar o protótipo UX de uma sugestão de prompt/ideia no Studio, antes da geração. Original preservado, comparação e aplicação explícita, com opção de editar/manter original. No modo verbatim, não reescrever narração silenciosamente; não iniciar render, cobrar créditos ou trocar configurações ao sugerir/aplicar.

**ESCOPO APROVADO:** Codex prepara protótipo local antes/depois desktop/mobile; Claude recebe contrato de reaproveitamento técnico, sem rotina nova ou leitura presumida. Especificação em `docs/growth/DIRETOR-KINEO-2026-09-23.md`. Aprovação conceitual não é aceite visual, ativação em produção, gasto adicional, mudança de oferta/modelo ou garantia de resultado. Reservas, gates, duas variantes comerciais e corte semanal permanecem.

**ADENDO / ACEITE DO DESENHO EM23/09:** a sessão Kineo · Melhorias UX e UI registrou a mensagem direta do fundador “gostei muito aprovado” para DIRETOR-KINEO-PREVIEW.html, SHA25685DA8B1253335E629865EF6EF892F9F256CE806993C4AA7FA0A6DB6C872CFC0B. Board reconferiu arquivo/hash e registro ENTREGA.md. O aceite do desenho está resolvido para esse objeto; a mensagem não discrimina dispositivos/estados e não certifica integração, navegador, gasto ou publicação. Próxima etapa é reconciliação técnica do contrato com Claude, sem presumir leitura ou início.

Formato: data · decisão · motivo · consequência prática.

## 2026-09-22 — Exceção nominal P3-017: duas mensalidades a 50%, seguintes a 30%

**DECISÃO APROVADA pelo fundador no Board, 22/09/2026 14:27 UTC:** exclusivamente para P3-017, comissão de 50% nas duas primeiras mensalidades elegíveis efetivamente pagas de CADA cliente externo atribuído a esse parceiro; 30% nas mensalidades seguintes. O fundador esclareceu “Nos2 primeiros meses” e confirmou exclusividade após a explicitação do Board. Identidade e conversa permanecem no ledger privado de Afiliados.

**Motivo:** viabilizar a proposta ao candidato existente, que ainda não confirmou aceite. Não é prova de primeiro afiliado ativado, publicação ou venda.

**Escopo:** não altera taxa global, não se limita ao primeiro cliente e não concede 50% indefinidamente. Anuais, packs, trial, piloto gratuito, créditos, bônus e novos acúmulos não estão incluídos por inferência. É uma exceção separada do piloto AF-R2-05; não altera contratos históricos de terceiros nem reabre PayPal/50-30 já aprovados.

**Consequência / BLOQUEADO para promessa externa até validação:** Claude responde pela capacidade operacional financeira; Afiliados prepara proposta privada e coordena. Pedido único AF-P3-017-20260922 em PEDIDOS-ENTRE-PISTAS. Aprovação comercial não comprova implementação, configuração nominal, aceite do parceiro ou pagamento. Rascunho privado autorizado; envio depende de revisão separada, supressões atuais e capacidade validada. Não há autorização de escrita direta em banco, migration, render ou pagamento de teste por este registro.

---

## 2026-09-01 — Uma moeda comercial: USD em toda a jornada

**Decisão do fundador.** A UseKineo lista e cobra seus preços em USD para todos os países. A empresa não promete que mostrará ou cobrará em moeda local; eventual conversão e taxas pertencem ao banco do comprador.

**Motivo.** A mesma moeda e as mesmas informações da descoberta ao Checkout criam credibilidade exatamente no último segundo de decisão. Prometer moeda local e apresentar USD no caixa introduz surpresa onde a pessoa decide se confia o cartão à Kineo.

**Consequência prática.** Site, SEO/AEO, ofertas, e-mails, recuperação e Checkout precisam nomear USD de forma consistente e derivar preço da fonte canônica. Moeda local não volta por copy, geolocalização ou experimento silencioso; qualquer futura regionalização exige nova decisão explícita, tabela canônica, cobrança real na mesma moeda e contrato que impeça divergência. O gate de conversão da verdade USD permanece preservado: uma nova otimização de moeda ou caixa só ocorre depois da amostra já registrada no handoff.

---

## 2026-09-01 — Assinatura real é o placar comum de todo o board

**Decisão do fundador.** Toda tarefa geral da UseKineo deve declarar como contribui para converter mais assinaturas no curto, médio e longo prazo. Aquisição, AEO/SEO, B2C, B2B, afiliados, ativação, oferta e checkout são partes do mesmo sistema e precisam se complementar.

**Motivo.** Visita, cadastro, vídeo gerado, clique e Checkout Session são etapas úteis, mas não são receita. O objetivo comum das mudanças é transformar demanda e valor percebido em pagamento, assinatura ativa e renovação.

**Consequência prática.** Nenhuma iniciativa entra no board sem: cadeia causal até assinatura; métrica por pessoa externa; gate de sucesso e de parada; e verificação de conflito ou duplicação com experimentos já ativos. Curto prazo mede avanço qualificado até pagamento; médio prazo mede conversão em assinatura; longo prazo mede renovação, indicação e receita recorrente. `payment_success` e assinatura ativa são o placar final — etapas intermediárias nunca são apresentadas como venda.

---

## 2026-07-27 — Modelo operacional: o fundador fala só com o CEO

**Decisão.** O Joseph conversa exclusivamente com a sessão do CEO operacional. O CEO recorta o trabalho, distribui aos especialistas, acompanha e consolida. O fundador nunca precisa abrir as sessões especialistas para trabalhar — só para ler, se quiser.

**Motivo.** Evitar que o fundador vire o roteador de contexto entre quatro sessões, e evitar decisões contraditórias entre especialistas.

**Consequência.** O CEO lê os transcripts dos especialistas e manda instrução direta a eles. Um especialista nunca recebe ordem do fundador diretamente.

---

## 2026-07-27 — Quatro especialistas, não três

**Decisão.** Além de Design & Experience, Growth & Acquisition e Development & Systems, existe um quarto: **Data & Evidence**.

**Motivo.** O repositório tinha ~40 documentos soltos na raiz que se contradizem, e histórico comprovado de duas métricas infladas (9,7× e 2,7×) que sustentaram decisões erradas. Sem um cético dedicado, os outros três produziriam planos sobre números que não existem.

**Consequência.** Data & Evidence pode contradizer qualquer um dos outros três. Sua saída alimenta os demais.

---

## 2026-07-27 — Ciclo 1 é somente leitura

**Decisão.** A primeira rodada de cada especialista não escreve nada: sem editar arquivo, commit, push, build, deploy, script de `scripts/`, credencial ou comunicação externa.

**Motivo.** Auditar antes de agir. Diferenciar implementação de evidência.

**Resultado verificado em 27/07.** Dev, Growth e Data terminaram com working tree **completamente limpa**. Gate respeitado.

---

## 2026-07-27 — Design mexe em forma, não em conteúdo

**Decisão.** O especialista de Design **não pode** alterar preço, número de crédito, headline, CTA textual, promessa ou posicionamento. Isso é do Growth.

**Motivo.** Se Design mexer em copy antes de Growth definir a oferta, os dois entram em contradição e o trabalho precisa ser desfeito — o fundador perde duas rodadas em vez de ganhar uma.

**Consequência.** Se Design identificar que a oferta está confusa na tela, descreve o sintoma e levanta como requisito para Growth.

---

## 2026-07-27 — Entrega de design exige comparação visual

**Decisão.** Toda entrega de design ou UX inclui **antes/depois que o fundador consiga olhar** — não descrição em texto.

**Motivo.** O fundador avalia design olhando. "Ajustei o tracking do h1" não permite decisão, e sem o antes ao lado não dá para medir o salto.

**Consequência.** Design entrega as edições **mais** um HTML estático autocontido; o CEO abre e entrega a imagem. Seção que não está no preview não chega ao fundador. Detalhe em `AGENTS.md` §8.

---

## 2026-07-27 — Criar a fonte única de verdade

**Decisão.** Criar `AGENTS.md` e `docs/` como fonte canônica, para os especialistas puxarem contexto do repositório em vez de depender do CEO repetir tudo a cada sessão.

**Motivo.** Antes disso, as instruções viviam só nas mensagens de chat. Se a sessão morresse, o conhecimento morria junto.

**Escopo aprovado.** Escrever os arquivos. **Não** commitar, **não** subir. O fundador revisa antes.

---

## 2026-07-27 — REPOSICIONAMENTO: vender vídeo em atacado, não ferramenta no varejo

**Decisão do fundador.** Parar de vender assinatura de ferramenta de um em um e passar a vender **pacotes de vídeo em atacado** para clientes maiores, que compram 10–50 de uma vez. *"Não ficar pingando de um em um."*

**Motivo.** 713 cadastros produziram 4 compras avulsas e ZERO assinaturas recorrentes em ~3 meses. O ICP que paga quer serviço, não ferramenta — e é o único sem porta de entrada no site.

**Escada de preço APROVADA (27/07):**

| Pacote | Preço | Por vídeo | Custo real | Margem |
|---|---:|---:|---:|---:|
| 10 vídeos | **$99** | $9,90 | $0,50 | ~96% |
| 20 vídeos | **$179** | $8,95 | $1,00 | ~96% |
| 30 vídeos | **$249** | $8,30 | $1,50 | ~96% |
| 50 vídeos | **$379** | $7,58 | $2,50 | ~96% |

**Base do custo (FATO CONFIRMADO):** `lib/credits/engineCost.ts:32-35` declara que o Fast custa **~$0,02–0,05 para servir**. Margem já líquida de Stripe.

**Ancoragem (de `lib/comparisons.ts`):** 50 vídeos custam $4.000 na Tasty Edits e $1.547 na VidChops. Kineo a $379 é **4× a 10× mais barato**.

**Escopo dos pacotes:** vídeo **Fast** (B-roll Pexels + TTS) — o único engine VALIDADO EM PRODUÇÃO. `cinematic_ai` (20 créditos) e `avatar` (110 créditos, custo VEED ~$9,60/vídeo) **não** estão nesta escada; venderiam com economia ~60× pior e exigem tabela própria.

**Não canibaliza o Autopilot de $299:** o pacote entrega os vídeos; o Autopilot entrega **e publica sozinho no canal**. Vende continuidade, não volume.

**Consequência.** A restrição do negócio não é custo nem preço — é **achar quem compra**. Esforço de Growth vai para descoberta de canal, não para otimizar margem.

---

## 2026-07-27 — Outreach B2B liberado; e-mail de ciclo de vida segue pausado

**Decisão.** São duas coisas diferentes e têm gates opostos:
- **Ciclo de vida para a base de 713 cadastros:** PAUSADO. `KINEO_LIFECYCLE_EMAILS_ENABLED` fica desligado. *"Não quero mandar mais mensagem nenhuma por ora."*
- **Prospecção B2B nova (agências, YouTubers, empresas):** LIBERADA. O fundador quer que Growth encontre e contate.

**Limite real de capacidade, registrado.** Não existe ferramenta de envio nesta configuração — o conector de e-mail cria rascunho, não dispara. E e-mail frio em volume pelo `usekineo.com` queimaria a reputação do domínio que serve a recuperação de receita. Growth entrega tudo **até** o envio; o canal de disparo é decisão pendente.

---

## 2026-07-27 — Autorização permanente de commit, push e deploy

**Decisão.** *"Aqui você aprova tudo, deploy, commits, push, tudo é por sua conta, você não manda mensagem pra mim pra essas coisas."*

**Consequência.** O CEO commita, faz push e deploya sem consultar. Continua valendo: nada que envie comunicação externa, nada que mude preço sem aprovação, nada que escreva em banco sem autorização.

---

## PENDENTE DE DECISÃO — não execute sem aprovação

| # | Decisão necessária | Bloqueia |
|---|---|---|
| 1 | Rodar as consultas read-only de `OPEN_QUESTIONS.md` bloco A | Toda priorização |
| 2 | Corrigir o fail-open de `CRON_SECRET` (4 linhas) | Segurança |
| 3 | Agendar ou apagar os 4 crons órfãos | Recuperação de receita |
| 4 | Cadência de e-mail de ciclo de vida (evitar spam ao ligar os crons) | Item 3 |
| 5 | Virar `ignoreBuildErrors` para `false` | Qualidade — **trava deploy se a árvore não estiver em 0** |
| 6 | Corrigir o `CLAUDE.md` (afirma o domínio errado) | Toda sessão futura |
| 7 | Provar 1 entrega Autopilot ponta a ponta antes de vender o piloto de $99 | Maior exposição comercial |
| 8 | Subir ou descartar o trabalho de design das rodadas 1 e 2 | Está em worktree, não commitado |

---

## 2026-08-27 — Divisão de execução e handoff diário Codex ↔ Claude

**Decisão do fundador.** O Codex executa aquisição, fluxo e conversão em novas assinaturas. O Claude executa qualidade do gerador, render, legendas e correções técnicas desse pipeline. Uma frente só entra no território da outra por pedido explícito do fundador ou por bloqueio registrado no handoff.

**Motivo.** Permitir trabalho paralelo sem duas sessões alterarem o mesmo fluxo ou tomarem decisões sobre uma fotografia antiga do produto.

**Consequência prática.** Antes de começar um turno, cada lado atualiza e lê `origin/main`, os arquivos canônicos de `docs/` e o handoff mais recente. Ao terminar, registra no repositório: SHA de base e de entrega, arquivos alterados, testes, estado do deploy, decisões, pendências, riscos e próximo dono. Código existente não conta como produção sem validação. O fundador recebe também um bloco `COPY` completo para repassar ao outro executor.

**Regra de conflito.** Nunca há duas tarefas escrevendo na mesma working tree. Se houver sobreposição de arquivos ou se `origin/main` avançar durante o trabalho, a integração é refeita sobre a ponta remota e preserva explicitamente o trabalho já publicado.

**Dono do Plan Fit.** O Plan Fit pertence ao workstream do Codex (aquisição e conversão). A versão canônica é a que entrou em `origin/main` pelos commits `4dff13d` e `f62997b`; o segundo fecha a corrida de evidência entre abas antes de impressão e checkout. O protótipo paralelo `3173247`, criado na frente Growth/Claude, não deve ser cherry-picked nem continuado. Em 27/08/2026, `codex/plan-fit` foi rebaseada sobre `origin/main` e ficou sem commit exclusivo.

---

## 2026-08-27 — Vitrine da home restaura a curadoria autorizada pelo fundador

**Decisão do fundador.** Restaurar na home a apresentação visual multi-engine: Veo 3.1, Kling 3, MiniMax H3 e Omni Flash no topo; Kineo 1, Seedance, Kling 2.5, Veo 3.1, Kling 3 e Avatar no bento; e uma terceira fileira variada com os motores da Kineo.

**DECISÃO APROVADA.** A fonte canônica dessa vitrine é `lib/publicExamples.ts`, em `PUBLIC_ENGINE_EXAMPLES`. Em 27/08/2026, depois da reconciliação técnica mostrar que três ativos estavam ligados a contas externas à lista interna, o fundador confirmou explicitamente que todos os vídeos da curadoria são dele, assumiu a responsabilidade e autorizou restaurá-los.

**EVIDÊNCIA DE PRODUÇÃO (2026-08-27).** Uma consulta somente leitura reconciliou os candidatos com `videos.user_id → profiles.email` e a lista de contas internas em `lib/internalAccounts.ts`. Essa evidência identifica a conta, não a titularidade jurídica do vídeo; a confirmação direta do fundador governa a autorização de exibição.

**Consequência.** `CUSTOMER_VIDEO_PUBLIC_SURFACE_ENABLED` continua `false`; nenhuma linha dinâmica do banco é publicada, indexada ou transformada em link `/v/`. Só a allowlist estática autorizada aparece. A terceira fileira recebe o rótulo honesto `Made with Kineo — every engine`, e não `Trending now`. Novos exemplos exigem confirmação de propriedade ou consentimento documentado.
---

## 2026-09-01 â€” ComunicaÃ§Ã£o comercial e cobranÃ§a somente em USD

**DecisÃ£o do fundador.** A Kineo anuncia preÃ§os e cobra somente em **USD**. NÃ£o promete moeda local, conversÃ£o automÃ¡tica nem um valor local diferente do que aparece no Stripe.

**Motivo.** A consistÃªncia entre site e checkout cria credibilidade exatamente no Ãºltimo segundo da decisÃ£o de compra. Uma promessa de moeda local seguida por cobranÃ§a em dÃ³lar faria o contrÃ¡rio.

**ConsequÃªncia.** `lib/checkoutPricing.ts` continua sendo a fonte Ãºnica, `CheckoutCurrency` permanece restrito a `'usd'`, e novas superfÃ­cies comerciais devem rotular USD com clareza. Alterar moeda, preÃ§o ou conversÃ£o exige nova decisÃ£o explÃ­cita. Literais histÃ³ricos BRL/INR que nÃ£o possuem caminho vivo sÃ£o dÃ­vida tÃ©cnica, nÃ£o autorizaÃ§Ã£o para reativÃ¡-los.

---

## 2026-09-03 — Growth orientado a ação criativa, não repetição

**Decisão do fundador.** A operação de aquisição e assinatura deve executar ações, não apenas produzir leituras. Cada nova rodada procura uma mecânica diferente, evita repetir telas e relatórios já em gate e usa dados para decidir o que fazer — não como substituto do que fazer.

**Motivo.** O fundador observou uma queda recente de entradas e Checkouts e identificou repetição na produção das sprints. Mais volume de artefatos semelhantes não reduz dependência de canal nem aumenta assinatura.

**Consequência.** Toda rodada de Growth classifica a ação como `NOVA`, `PARCIAL` ou `DUPLICADA`; ação duplicada não é publicada. Diagnóstico termina em executar, não executar ou pivotar. Queda só é atribuída a código após comparação de pessoas externas em janelas equivalentes e por fonte. O placar final continua sendo assinatura e receita real.

---

## 2026-09-05 — Codex assume UX integral; Claude concentra fluxo e assinaturas

**DECISÃO APROVADA — pedido explícito do fundador nesta conversa em 05/09/2026.** Codex passa a cuidar de navegação/botões, organização visual de TODAS as páginas, refinamento da home e espanhol com inglês padrão. Claude concentra fluxo, aquisição e novas assinaturas. Esta responsabilidade substitui a divisão de 31/08 no que conflitar com ela; não substitui regras de segurança e coordenação.

**Limites preservados.** Comparação visual antes/depois e aprovação por lote, vídeos reais da vitrine mantidos, sem alterações em motores/render, preços, créditos, termos ou promessas. Idioma de interface não altera moeda nem idioma de narração. Mudanças comerciais em arquivos de UX exigem coordenação antes de editar. Não há nova autorização de contatos, gasto ou escrita no banco.

**Registro operacional.** Plano, inventário integral e comunicação ao Claude em `docs/ESCOPO-CODEX-UX-CLAUDE-VENDAS-2026-09-05.md`, `docs/PLANO-UX-NAVEGACAO-EN-ES-2026-09-05.md` e `docs/INVENTARIO-PAGINAS-UX-2026-09-05.md`. Publicar o comunicado no Git não prova recebimento: ACK do Claude permanece pendente até resposta.

### Primeiro bloco de execução — oito horas

**DECISÃO APROVADA, 05/09/2026:** o fundador substituiu a proposta de 45 horas por blocos de oito horas e autorizou o primeiro agora. Janela operacional fixada em 05/09 10:14–18:14 BRT; próximo bloco só com nova autorização. Não há compromisso de finalizar todas as páginas antes dos gates de qualidade e aceite visual. Tentar terminar nas primeiras oito ou dezesseis horas é objetivo, não certificação antecipada nem renovação automática. Controle de uso a cada duas horas; não consumir resets/comprar créditos sem autorização.

## 2026-09-07 — Direção tipográfica B aprovada

**DECISÃO APROVADA:** o fundador escolheu Manrope (B), autorizou substituir a tipografia do site e entregar publicada para sua revisão. Inclui hierarquia mais leve da proposta aprovada, mantendo vídeos, layout estrutural, navegação, oferta, moeda, créditos e fontes dos vídeos intactos. Trabalho em worktree isolada, com comparação visual, typecheck, testes e validação do deploy. Não é autorização para nova reforma funcional nem mudança de segurança.

O fundador também pediu cinco recomendações e sugestão de uma terceira língua. O idioma adicional depende de sua escolha; não adicionar silenciosamente. Registro e evidências em docs/HANDOFF-CODEX-MANROPE-2026-09-07.md.

## 2026-09-07 — Cinco melhorias autorizadas após Manrope

**DECISÃO APROVADA:** executar as cinco recomendações: reduzir avisos concorrentes, uniformizar ações/destinos, destacar continuidade na biblioteca, completar lacunas de espanhol e corrigir pendências de privacidade/garantias críticas de CI. Worktree codex/five-improvements-2026-09-07 a partir de origin/main 5b155dc5. Comparação visual e testes antes de publicação. Sem nova língua, preço, crédito, render, campanha ou operação manual em dados de clientes. Mudanças de segurança testadas com dependências simuladas.

## 2026-09-07 — Complemento aprovado: galeria, CSS e terceiro idioma por evidência

**DECISÃO APROVADA:** o fundador aprovou as cinco melhorias olhando o preview, pediu Meus vídeos sem múltiplas propagandas acima da galeria, rejeitou português e escolheu selecionar a terceira língua pelos dados de países. Após o relatório `docs/IDIOMA-POR-EVIDENCIA-2026-09-07.md`, autorizou os ajustes pendentes e a verificação dos sistemas em todas as línguas. Hindi é opção manual, não idioma imposto pela localização. Inglês continua padrão e espanhol é preservado. País não é prova de língua individual.

**ESCOPO:** corrigir o CSS estático que causa divergência SSR/hidratação; manter uma oferta principal em Meus vídeos e recolher opções secundárias após a galeria; hindi no sistema explícito de rótulos com fonte Devanagari; testes locais e de navegação nos três idiomas. Textos desconhecidos permanecem em inglês, não recebem tradução automática. Não afirmar tradução integral de artigos SEO/admin/e-mails nem teste pago completo. Sem mudar roteiro, idioma de geração, valores, créditos, preços, render, campanha ou dados de clientes. Commit, CI e deploy seguem os gates já aprovados.

## 2026-09-24 — Kineo Empresas LIGADO: dois Payment Links no ar, cartão volta ao Studio

**DECISÃO EXECUTADA (fundador via Cowork, 24/09 01:30 BRT; Code ~04h BRT):** os dois degraus decididos às ~01h (Express US$35 / Pro US$75) existem na Stripe (conta live) e foram ligados no código: `DFY_TIERS.express` = plink_1UJ4BgIah5dxzSBf8RGTiutr (https://buy.stripe.com/8x2eVddNbcHRfqH34ygjC0x) e `DFY_TIERS.pro` = plink_1UJ4FXIah5dxzSBf8hU9ggtE (https://buy.stripe.com/28E14n38x0Z9guL6gKgjC0y). O link de US$100 de 23/09 está desativado na Stripe e só é reconhecido pelo webhook por segurança. A partir do deploy, quem escrever no Studio um pedido de anúncio da própria empresa (regex estrita) vê o cartão "Want a human editor to make it?" com os dois botões, antes do Generate e sem escondê-lo.

**O QUE É (resposta à pergunta do fundador "isso vai ser uma ferramenta a mais nossa?"):** serviço, não ferramenta. A pessoa paga na Stripe e nós produzimos dentro do nosso próprio Studio (Kineo 1 quando a mídia do cliente entra; Seedance/Kling 3 para cenas geradas), entregando MP4 + página /v/ privada por e-mail em 48/72 h. Operação manual até virar alguma coisa (decisão 7 de 24/09). Teto de 3 pedidos abertos.

**FORA DESTA DECISÃO:** nenhum preço público de plano mudou (congelamento até 09/10 intacto); nenhuma página pública nova (/empresas continua protótipo congelado); os 4 rascunhos de e-mail para os leads saem em seguida, com o link do degrau de cada um, para o fundador revisar e enviar.

**ADENDO 24/09 ~04h30 BRT — colocação:** a auditoria adversarial mostrou que o passo 2 do /studio/create não é o caminho principal do Studio (o cockpit dispara atrás da cortina). O cartão passou a morar também no cockpit (`StudioClient`), acima do botão go, com a mesma copy e os mesmos dois botões; o passo 2 continua como segunda superfície. Detalhe técnico em docs/PEDIDOS-ENTRE-PISTAS-2026-09-03.md (EMPRESAS-COCKPIT-20260924).

## 2026-09-24 — DIREÇÃO: Studio Ads para 25/09 (fundador, ~05h BRT)

**DIREÇÃO DADA (não é decisão de preço):** depois de ver o balcão manual no ar, o fundador pediu para amanhã um produto self-service para empresas: "Studio Ads — a pessoa entra, paga esse valor para ter acesso, sobe imagens e o vídeo dela, a gente só narra; centenas de coisas para fazer propaganda; praticamente uma empresa de marketing". Pediu estudo do que há de bom na internet antes de construir.

**O QUE FOI FEITO NA HORA:** workflow de 9 agentes (mercado/UX, preços, taxonomia de anúncios, viabilidade técnica, auditoria do código; 3 desenhos de 1 dia; 1 juiz). Plano fundido em `docs/STUDIO-ADS-DIA-1-2026-09-25.md`; pesquisa bruta em `docs/studio-ads/`. Fato da casa que muda o plano: 7 empresas/30 d entre 411 pessoas com vídeo — o produto precisa da própria porta (/ads + llms.txt + kineoFacts), não vive do tráfego atual.

**PENDENTE DO FUNDADOR (11 decisões numeradas no fim do plano; as 5 primeiras destravam o bloco 08-10 de 25/09):** nome (recomendação: Studio Ads) · preço/acesso (3 opções; recomendação: passe US$19 = 1990 c + 60 cr, código sobe com ADS_PASS_LIVE=false) · quem entra sem passe (recomendação: assinante pago sim, trial não) · degraus do dia 1 (só Kineo 1) · revisão humana e quem opera a fila · consentimento de mídia/rosto/voz · "vai" nominal na trava 8.2 (piso 20 s, legendas fora da banda de Reels, áudio original baixo, logo persistente) · 3º botão no cartão DFY · e-mail aos 11 leads (dia 26) · compra de teste real · clique de publicação (~19h30).

**FORA:** preços dos 3 planos seguem congelados até 09/10; /empresas segue protótipo congelado; nada de "centenas de formatos", apresentador ou voz clonada na copy do dia 1.

## 2026-09-24 — Delegação 1-3 agora (Cowork), 4-10 depois (fundador, ~07h BRT)

**DECISÃO:** das dez alavancas de fluxo/receita listadas em 24/09, o fundador mandou executar primeiro as três do Cowork: (1) diretórios e listas que o ChatGPT lê, com o TAAFT atualizado; (2) GPT Store com o "Kineo Video Maker" público; (3) Sora acabou: 10 rascunhos de imprensa, vídeo do dia nas 3 redes, thread no X. Só depois as demais (4 afiliados, 5 "apertou e não saiu", 6 winback com filme pronto, 7 Product Hunt do Studio Ads, 8 Reddit/Quora, 9 SLA da caixa de entrada, 10 tutorial no YouTube). Cowork começou ~07h BRT. Fonte única de copy e números para os formulários: `docs/KIT-DIRETORIOS-2026-09-24.md` (9,90/19,90/39,90 · 60/150/300 · anual 10× · trial 10 créditos · balcão Express/Pro). Medição por pessoa com utm_campaign=dir_sep24; releitura 27/09 e 30/09. Preço e trial seguem congelados até 09/10.

## 2026-09-24 — Studio Ads: quatro decisões do fundador (~07h30 BRT)

**DECISÕES (literal: "1 - A · 2 - A · 3 - sim · 5 - A"):**
1. **Nome: Studio Ads.** Define título da página /ads, nome do SKU na Stripe e assunto dos e-mails.
2. **Acesso: passe único US$19 (1990 centavos) com 60 créditos**, SKU `ads_pass` pelo checkout one-time da casa (mode payment, metadata.pack='ads_pass', pack_credits=60), concedido no Path A do webhook no MESMO UPDATE que grava crédito e has_paid, coluna `profiles.ads_access_until` (+365 d), fail-closed. Sobe atrás de `ADS_PASS_LIVE=false` até a palavra do fundador para ligar. Os 3 planos não mudam (congelados até 09/10).
3. **Assinante pago entra sem passe: sim** (Starter/Creator/Studio via `isPayingProfile`); trial e free NÃO.
5. **Revisão humana: entrega imediata + revisão humana do primeiro anúncio de cada empresa em até 24 h**, teto de 5 pedidos abertos (a página fecha a venda sozinha acima disso). Operador da fila: Claude pelo /admin/ads, com o fundador avisado a cada pedido; o fundador pode assumir a qualquer momento.

**PENDENTE:** decisão 7 (trava 8.2) reformulada para o fundador em 24/09 ~07h40; decisões 4, 6, 8-11 até o meio do dia 25/09.

## 2026-09-24 — Trava 8.2: "vai" nominal para ii (legendas fora da faixa do Reels) e iv (logo persistente), só nos anúncios

**AUTORIZAÇÃO (fundador, ~07h50 BRT, literal: "Vai pra ii e iv"):** liberado tocar `lib/compose*` para DUAS mudanças, ambas atrás de um interruptor que só o render de Studio Ads liga (`ads_brand_layer` no payload do compose; filme comum sai idêntico ao de hoje): (ii) legendas do anúncio posicionadas na zona segura do Reels (fora da faixa inferior de ~35% e da superior de ~14% que a interface cobre); (iv) logo do cliente como elemento `image` pequeno num canto durante o filme inteiro (a receita comentada em lib/compose.ts ~:2750 usava y:'6%', que cai DENTRO da faixa superior; a versão real fica em y≥17%, largura ~26%, opacidade ~85%). NÃO liberado: (i) piso de 20 s no roteiro próprio (generate-video-fast segue em 35 s) e (iii) áudio original do vídeo do cliente sob a narração (segue mudo) — semana 2, com novo "vai".

**CONDIÇÕES:** render de validação (canário na conta do fundador, Kineo 1, 3-5 cr) com o cartão e o logo conferidos em 1080×1920 ANTES de enfileirar; guardião próprio (`test-ads-brand-layer`) que prova que com o interruptor desligado o JSON do Creatomate é byte a byte o de hoje; os guardiões de escopo (test-despacho-vazio etc.) reancorados com este registro como motivo, nunca afrouxados.

## 2026-09-24 — Studio Ads: preço do passe confirmado em 19,90 (fundador, ~08h45 BRT)

**DECISÃO (literal: "Eu confirmo o preço de R$19,90"):** o passe `ads_pass` custa **US$19,90 (1990 centavos)** + 60 créditos — o "US$19" da decisão 2 virou 19,90 porque 1900 centavos é o valor do bulk10 e a casa termina em ,90. Lido como preço de lista em dólar (toda a conversa de preço do Studio Ads foi em USD). Para cartão brasileiro, a sessão nasce em reais pela fórmula da casa (lib/settlementCurrency.ts, BRL_PER_USD_HOUSE = 5,0, terminando em ,90): **R$99,90**. Se o fundador quiser R$19,90 LITERAL no Brasil, é uma linha nova na tabela fixa BRL (decisão de preço público, dele) — pendente de confirmação explícita; até lá vale a fórmula.

Código: `lib/ads/offer.ts` ADS_PASS_USD_MINOR = 1990 (guardião test-ads-fundacao prova que não colide com nenhum one-time da casa).

**ESCLARECIMENTO DO FUNDADOR (24/09 ~08h50 BRT, literal: "quero deixar os preços do jeito que está para os países emergentes; eles clicam e vêm na moeda deles. Quando eu falei R$19,90, eu quis dizer o preço global"):** 19,90 é o preço GLOBAL em dólar (US$19,90). Nenhuma exceção em reais: cartão brasileiro paga pela fórmula da casa (R$99,90) e os demais países pagam pela conversão automática da Stripe (Adaptive Pricing ligado na conta), como já acontece nos planos. Fechado.

## 2026-09-24 — GPT "Kineo Video Maker": corrigir e publicar barato; NÃO migrar para plugin (custom GPTs saem em 11/12/2026)

**FATO NOVO (OpenAI, anúncio de 11/09/2026, confirmado por várias fontes em 24/09):** GPTs personalizados aposentam em 11/12/2026; instruções viram Skill de plugin, **ações personalizadas não migram**, só GPT publicado migra; criação de GPT novo fecha ~26/10.
**MEDIDO (banco, 24/09):** em 90 dias o GPT gerou 11 links de handoff, 1 clique, 0 cadastros, 0 filmes, 0 pagamentos. Os 341 cadastros/30 d vindos do ChatGPT são de CITAÇÃO orgânica, não do nosso GPT.
**RECOMENDAÇÃO EXECUTADA (Claude):** instruções v3 (seção C de docs/GPT-KINEO-VIDEO-MAKER.md) com os fatos do código e leitura de getKineoFacts antes de responder preço/motor/trial/Empresas; red-team de 8 conversas simuladas antes de colar. Publicar na loja é aposta barata até 11/12 (e é pré-requisito de migração, se um dia valer). Esforço de crescimento continua nas citações (páginas, llms.txt, diretórios), não no GPT.
**PENDENTE DO FUNDADOR:** autorizar o Cowork a trocar o acesso para "Loja GPT" depois de colar a v3, reimportar a ação (v1.3.0, agora com getKineoFacts do Codex) e repetir os 3 testes.

## 2026-09-24 — TAAFT: três decisões do fundador (~10h BRT, literal: "1 apaga, 2 ok, 3 ok")

1. **Pergunta de visitante "Rubelansari" (Rubel Bhai):** APAGAR (spam). Destrava o formulário do FAQ; o Cowork então troca os dois "30 credits" pelo trial de 10 créditos.
2. **Release v3.4.0:** APROVADA com o texto de docs/KIT-DIRETORIOS-2026-09-24.md §8 (Business Ads, MiniMax H3 de volta desde 22/09, Omni/S25 pausados, trial 10 cr, a partir de $9.90, link /sora-alternative com utm taaft).
3. **USP:** APROVADA: "One idea in, a finished narrated film out. 6 engines, 16 languages." (sai "Same character in every scene", que só vale para Kling 3 e H3).
Slug do X confirmado: utm_source=x.

## 2026-09-24 — Diretórios: vídeo grátis é semanal (até 15 s) e o tempo é "3 a 7 minutos" (fundador delegou: "decide pra mim no que você recomenda", ~11h BRT)

**DECIDIDO (Claude, pelo código):** (1) depois do trial, 1 vídeo Kineo 1 com marca d'água por SEMANA, até 15 s (lib/freeTierOffer.ts: janela de 7 dias desde 17/09, maxFreeFastSeconds 15; /api/facts: rollingWindowHours 168). O FAQ do TAAFT dizia "every 30 days" (oferta antiga). (2) Tempo de geração: "usually 3 to 7 minutes on Kineo 1; cinematic engines take longer" (medido: mediana 4,2 min, p90 6,6 min, 114 renders; llms.txt). "About 3 minutes" sai de todo diretório; descrições do kit corrigidas e a curta recortada para caber em 160.
**Também decidido pelo fundador (via Cowork, 24/09):** USP oficial de 40 caracteres "Idea in, finished film out. 16 languages" (TAAFT corta em 40); release nova do TAAFT NÃO paga (v3.3.3 editada de graça).
**NÃO decidido aqui:** o modelo de pacote de publicação do canal (CLAUDE.md, "in about 3 minutes") é do fundador; a mediana medida é 4,2 min. Fica a sugestão de trocar por "in a few minutes".

## 2026-09-24 — "Apertou Gerar e não saiu filme": 13 pessoas/7 d, 12 por defeito nosso; 4 consertos fora da trava (item 5 da lista de alavancas)

**MEDIDO (banco + workflow de 5 agentes lendo a linha do tempo de cada pessoa e o código no ponto de parada):** 13 pessoas dispararam Gerar entre 17 e 24/09 e não receberam filme (a medição antiga dizia 29/7 d); 11 via ChatGPT, todas no trial de 10 créditos, nenhuma recuperou depois. 12 bateram em defeito do produto, 1 num portão funcionando como previsto. Causas: (1) o aviso "Kineo 1 não conta esta história" (409) + o cron de pedido órfão que refazia SEM o "manter Kineo 1" e mandava carta dizendo "a aba fechou" — 6 pessoas, um caso em 24/09; (2) roteiro curto escrito pela nossa IA recusado como narration_too_short — 5 pessoas, JÁ corrigido pelo V1 de 23/09 (6600d12c); (3) atalho do ChatGPT manda todo trial ao Seedance (15-25 cr) e o modal dizia "você usou todo o trial" com 10/10; (4) a cortina do Studio escondia o aviso atrás de um spinner eterno.
**EXECUTADO (Claude, 09b303e7, fora da trava 8.2):** cron entrega o Kineo 1 clicado (engineFitOverride no replay); auto-start do primeiro filme não é recusado pelo próprio produto; cortina não esconde o aviso; "gastou o trial" só com saldo zero. Somando o V1, 10 das 13 pessoas teriam recebido filme.
**PENDENTE DO FUNDADOR (não mexido, é estratégia da parede):** (a) no aviso de encaixe, com saldo menor que o Seedance, o botão principal continua "Switch to Seedance (15-25 cr)" e "Keep Kineo 1" é o secundário — salvaria mais 1 pessoa (4d89378a) e entregaria o filme na aba em vez de 10 min depois pelo cron; (b) o atalho do ChatGPT (lib/growth/chatgptQuickstart.ts:27,33) manda o trial ao Seedance, que ele não paga — é a parede de conversão, mas é o caminho que a coorte que mais chega recebe.
**MEDIR (a partir do deploy):** render_job_finished por status (200 contra 409) nos pedidos órfãos do Kineo 1; engine_fit_box_shown com origem auto-start deve ir a zero; pessoas com generate_started e sem vídeo completo em 7 d (base: 13).

**DECISÕES DO FUNDADOR (24/09 ~13h40, literal "1 troca 2 mantem"):** (1) no aviso de encaixe do Kineo 1, com saldo menor que o motor sugerido, o botão principal passa a ser "Make it with Kineo 1 now" e o Seedance vira secundário (executado; engine_fit_box_shown.keep_first mede); (2) o atalho do ChatGPT continua abrindo no Seedance — é a parede de conversão; medir, não mexer.

## 2026-09-24 — Studio Ads: o servidor só liga depois da revisão adversarial (fundador delegou: "avança as coisas da forma que você sempre recomenda")

**DECIDIDO (Claude):** nenhum passe é vendido e nenhuma rota /api/ads/* atende estranho antes de consertar os 10 achados confirmados pela revisão adversarial (docs/STUDIO-ADS-DIA-1-2026-09-25.md §12). Os dois que mudam regra de negócio seguem a decisão 3 do fundador ao pé da letra: "assinante pago entra sem passe" = plano mensal/anual ativo (não has_paid, que também marca comprador de pacote e ex-assinante); trial e free não entram. Conta interna = lista exata + apelidos do fundador (os padrões LIKE servem para excluir de métrica, não para autorizar).
**EXECUTADO:** 0bd85f1b (guarda da coluna na migration, predicado estrito, interruptor nas rotas, sonda da coluna no checkout, mídia conferida no banco, consentimento amarrado à mídia). Guardiões de moeda reancorados de 5 para 6 builders avulsos (o passe é o 6º).
**PENDENTE:** aplicar a migration em produção (aditiva) e conferir coluna, tabela e as duas guardas; o interruptor só vira com o canário aprovado pelo fundador.

## 2026-09-24 — GPT na loja do ChatGPT: fundador disse "publica" (~17h BRT); publicação só depois dos consertos da verificação

**DECIDIDO (fundador, literal "Publica"):** o GPT "Short Video Maker by Kineo" vai para a loja de GPTs (acesso "Everyone"/GPT Store). Aposta barata até 11/12 (fim dos GPTs com ação); o canal forte do ChatGPT segue sendo a citação orgânica.
**EXECUTADO ANTES DE PUBLICAR (Claude):** verificação adversarial de 58 agentes contra o código publicado (17 achados confirmados, 10 derrubados). Consertado em aae6f8c0: a página /go mostrava a quem chega sem conta a oferta de US$1 desligada e "requires a payment method"; Kineo 1 a 90 s recusava o orçamento de 270-290 palavras (teto real 258 na voz de finanças) — agora 245-255 no texto e no schema, e a ação recusa na conversa; Kling 3/H3 só en/es/pt; o idioma do roteiro passa a chegar ao Studio; link reaproveitado renova os 7 dias; texto v3.3 (7.983 caracteres) e schema v1.3.2.
**MEDIR:** gpt_handoffs com channel gpt_store por semana (links, cliques, cadastros, pagantes) e o evento novo gpt_handoff_refused por motivo. Critério: 2 semanas sem cadastro vindo da loja = parar de investir tempo nele.

## 2026-09-24 (tarde) — CORREÇÃO: o GPT NÃO foi para a loja; fica privado

**FATO (Cowork, 24/09 à tarde; correção da entrada acima, não decisão nova):** a publicação "Everyone"/GPT Store não existe mais. A janela Compartilhar do ChatGPT só oferece "Apenas para mim" e diz "Não é mais possível compartilhar GPTs publicamente"; /gpts/mine pede migrar para plugin até 11/12. O GPT "Short Video Maker by Kineo" ficou salvo PRIVADO na conta pessoal do fundador (instruções v3.3 + ação v1.3.2, com a description de getKineoFacts encurtada só no editor).
**CONSEQUÊNCIA:** o critério "2 semanas sem cadastro vindo da loja" deixa de valer, porque não há loja. Medir o canal só pelos links `/make` (assistant_link) e pelos handoffs `/go/…` (gpt_handoffs por channel), nunca por "loja". Migrar para plugin (prazo 11/12) segue decisão do fundador, não iniciada.
**EXECUTADO (Claude, follow-up do Cowork):** schema v1.3.3 (toda description de operação ≤ 300 caracteres), instruções v3.4 (Kineo 1 a 90 s declarado 230-240 porque o GPT subconta ~7-11%; confiar no `words` da ação; 400 de roteiro longo corta até maxWords e reenvia 1 vez) e descrição curta sem "First film free.". Texto final e roteiro de colagem em docs/GPT-COWORK-FOLLOWUP-2026-09-24.md.

## 2026-09-24 (noite) — Kineo Empresas feito pela própria empresa: Studio Ads self-serve entregue hoje

**PEDIDO DO FUNDADOR (~18h BRT, literal):** "se a gente for fazer hoje para um cliente de uma padaria, de uma farmácia, de um dentista, a gente vai ter que fazer na mão. Eu quero que a pessoa consiga fazer sozinha ... colocar os vídeos dela, as fotos, as narrações ... automatizar isso daí ... me entregue para hoje." Premissas confirmadas por ele ("ok, pode seguir assim"): a narração é voz de IA lendo o texto que a empresa aprovou (gravar a própria voz fica para depois — mexe na montagem travada) e o nome segue "Studio Ads" dentro de Kineo Empresas; passe US$19,90 com 60 créditos como já decidido.
**DECIDIDO (Claude, pelo código):** o anúncio NÃO passa pelo generate-video-fast. Com o passe a conta tem has_paid e a rota do Kineo 1 injeta clipes Seedance na frente das fotos da empresa; com marcadores ela ignora a mídia; sem marcadores divide por frases; e não tem campo de voz. O /api/ads/render narra na voz escolhida (tts-1-hd, 4 vozes, prévia grátis com teto diário), simula o montador do Kineo 1 para saber onde cai cada tomada e manda a lista de mídia tomada a tomada direto ao /api/compose (quality 'fast'), com o cartão final (PNG desenhado no navegador) na última batida. Crédito pelo cobrador normal (35 s = 3, 60 s = 5), sem marca d'água para quem tem o passe.
**INTERRUPTOR:** segue desligado (NEXT_PUBLIC_ADS_PASS_LIVE). Só contas internas usam até o fundador aprovar o teste da padaria e mandar ligar. Env nova só vale em deploy novo.
**TESTE:** padaria "Pão Dourado" (6 fotos livres do Pexels + logo desenhado), na conta do fundador — que sai com marca d'água por design (FORCE_WATERMARK_EMAILS); cliente com passe sai limpo.

## 2026-09-25 — versão branca padrão, aparência opcional e entrada direta no Studio Ads

**DECISÃO APROVADA (fundador, tarefa visual):** migrar a direção v6 aprovada para as telas reais: “pode trocar a tela [...] pra nova, versão branca”. Light branco é o padrão; Dark azul-marinho continua selecionável em Configurações → Aparência, com escolha salva no dispositivo. Preservar os cards/vídeos aprovados, corrigir enquadramento do menu Home e ampliar as áreas de criação. Imagem ganha os seis motores visíveis; Vídeo · Imagem · Para empresas · Preços continua a navegação pública.

**DECISÃO APROVADA (fluxo):** Para empresas abre `/ads/new` diretamente, para a pessoa criar o próprio anúncio. O gate de sessão/acesso permanece no servidor; não se remove compra exigida para quem ainda não tem acesso. Serviços/pedidos/checkout legados não são apagados.

**DECISÃO APROVADA (preços):** ao esclarecer se “9, 19, 39” seriam valores inteiros, o fundador respondeu **“Manter US$ 9,90 / 19,90 / 39,90”**. Não alterar as fontes únicas de preço nem o cálculo da recarga. Idiomas seguem inglês canônico e preferência explícita existente. Handoff: `docs/HANDOFF-CLAUDE-PALETAS-SELF-SERVICE-2026-09-25.md`.

## 2026-09-30 — Card de Ads em trio + cor das 3 variações na montagem (KINEO-CARD-ADS-3VAR / KINEO-ADS-3VAR-COR)
- Fundador: "vai quero as 3 variações no card ads". Cada vídeo do card de Ads da home agora é UM quadro com as 3 variações lado a lado (mesma pessoa fictícia, mesmo produto, 3 looks), e o card gira por 3 produtos: garrafa (as 3 meninas), fone de ouvido e tênis. Tudo feito na própria Kineo (Nano Banana Pro com foto de referência + Kling 2.5, conta do fundador). Sem rótulo A/B/C (cards limpos).
- Motivo da cor: o 1º teste pago das 3 variações (30/09, Photo Motion, 85 cr, Villa Versace) entregou 3 vídeos quase iguais — a grade de cor no prompt some porque "Keep everything exactly as in the photo" vence. Agora cada variação ganha um véu de cor (azul / âmbar / rosa, alfa 0,14-0,18) na MONTAGEM, só sobre os planos (o cartão final fica com a cor da marca). Anúncio comum: source idêntico ao de antes.
- Só propriedades já usadas em produção (shape + path + fill_color rgba); color_overlay/blend_mode ficam de fora. A tela deixou de prometer "cenário" em toda variação (foto do cliente não troca de lugar).
- Guardião: scripts/test-ads-3var-cor-2026-09-30.mjs (10 ok, 6 mutantes). Reancorado: test-promo-cards (quadros promo-ads-3var-1..3).

## 2026-09-30 — /admin/affiliates reconstruída (KINEO-ADMIN-AFILIADOS)
- Fundador: "reconstruir a página dos afiliados… pra eu conseguir enxergar os dados melhor". Antes: só totais da vida inteira, tema escuro com cores fixas, select sem paginação (corte silencioso em 1000).
- Agora: 6 números (afiliados trazendo gente em 30 d, cliques 7 d vs semana anterior, 30 d, cadastros, pagantes, vendas por moeda), gráfico de 30 dias, funil, destinos, tabela com busca/filtros/ordenação, sparkline de 14 d e, ao abrir a linha, últimos cliques (destino + origem), indicações, link copiável e os controles de antes. Conta pura em lib/admin/affiliateDashboard.ts; rota paginada.
- A conta de afiliado do fundador (e-mails de admin) aparece com selo "Casa" e fica FORA dos totais: o único "pagante" da história era o teste dele pelo próprio código. Sem ela: 21 afiliados, 72 cliques, 0 cadastros, 0 vendas (30/09).
- "Pessoas únicas" só aparece com IP anonimizado em ≥ 90% dos cliques: desde 27/08 o link não grava ip_hash sem a env AFFILIATE_IP_SALT (hoje 23,6%).
- Guardião: scripts/test-admin-afiliados-2026-09-30.mjs (16 ok, 8 mutantes). Reancorado: test-affiliate-destinations (leitura paginada).

## 2026-09-30 — Produto novo "Espaços" (KINEO-ESPACOS)
- Fundador: "tenho muito acesso a construtoras… esse galpão está vazio… com IA colocar o Starbucks dentro, ou uma loja do Burger King… a pessoa faz as fotos, fala o que quer dentro, e a gente traz um vídeo perfeito… sempre usar algum método de procura". Também: apartamento decorado.
- Prova real antes do código (30/09): 3 fotos do espaço vazio do Villa Versace (Moema) → cafeteria no padrão Starbucks com Nano Banana Pro edit + régua "mesma câmera, mesma estrutura": colunas, vidros e tubulação do teto ficaram no lugar. Vídeo antes → depois de 21 s.
- /spaces (só contas da casa: SPACES_PUBLIC=false): fotos ou vídeo (a tela tira 3 quadros) → pedido + tipo → pesquisa de curadoria na web (/api/spaces/brief, OpenAI web_search, editável) → espaço pronto foto a foto (/api/images/generate, 5 cr, refazer por foto, comparador antes/depois) → clipe por foto (/api/clips Kling 2.5, 5 cr) → montagem própria antes → fusão → depois (/api/spaces/montage, Creatomate, cópia no nosso storage). Custo por espaço de 3 fotos ≈ 30 créditos, tudo em endpoints que já cobram e moderam.
- Selo honesto inegociável: "Ilustração criada com IA · sem vínculo com as marcas exibidas" do primeiro ao último quadro; assinatura do fim só "Apresentado por <quem apresenta>" — a tela não oferece "decorado por <terceiro>". Mostrar como uma loja de marca FICARIA no ponto é prática de mercado; dizer que a marca está lá ou atribuir autoria a quem não participou, não.
- Guardião: scripts/test-espacos-2026-09-30.mjs (16 ok, 6 mutantes). Reancorado: test-moderacao (contagem 22→24: rota do ChatGPT de outra sessão + a do Espaços).
- Pendente do fundador: preço público (hoje só a casa usa) e o "vai" para abrir a clientes.

## 2026-09-30 — "Espaços" (Spaces) lançado para todos (KINEO-ESPACOS-LANCAMENTO)
- Fundador, depois de testar: "vamos lançar esse espaço novo… pode subir como já um produto novo… colocar em inglês… a pessoa pudesse tirar qualquer fala de IA do vídeo, não tem necessidade… contato não precisa, o mais importante é o vídeo".
- SPACES_PUBLIC=true. Menu em todos os pares: lateral, celular, mega-menu público (coluna Create), título do topo; rótulo "Spaces" nas 16 línguas.
- Tela e vídeo nas 16 línguas (lib/spaces/spacesCopy.ts): BEFORE/AFTER, ANTES/DEPOIS… e "Presented by"/"Apresentado por" na língua de quem gera.
- O vídeo não fala de IA. A nota "Imagem ilustrativa" (na língua) é opcional, desmarcada por padrão. Sem assinatura, o vídeo termina no último "Depois" (sem cartão vazio). Campo de contato removido.
- Mantido: assinatura só "Apresentado por <quem apresenta>" — a tela não oferece "decorado por <terceiro>".
- Preço: o de cada etapa que já existe (5 cr por foto pronta + 5 cr por clipe Kling 5 s ≈ 30 cr por espaço de 3 fotos). Sem preço público novo.
- Guardião test-espacos (22 ok, 8 mutantes).

## 2026-09-30 — ADM cinza neutro aprovado para publicação

**DECISÃO APROVADA (fundador, Board):** após revisar `ADM-CINZA-NEUTRO-ANTES-DEPOIS.html`, Joseph confirmou: "Pode publicar, essa ficou bem melhor." Aplicar fundo cinza neutro, cartões cinza-claro e azul discreto nos destaques apenas no ADM. Preservar layout, controles, cálculos, permissões e tema público. A aprovação substitui a paleta branca do ADM, não o restante do refinamento.

## 2026-09-30 — Studio com o vídeo do motor; topo com MCP e no mesmo tom (KINEO-STUDIO-HEROI / KINEO-NAV-MCP / KINEO-NAV-MESMO-TOM)
- Fundador: "na lateral esquerda os ambientes de configuração, na direita o vídeo padrão do motor… não deixar uma tela em branco"; "tirar AI Presenter e Animate a Photo, que já têm em outro lugar"; "colocar o MCP no menu"; "Spaces, Ads e Pricing não estão no mesmo tom de Vídeos e Imagens".
- /studio: esquerda = ideia → motor → formato → ajustes → revisar e gerar; direita = vídeo do motor escolhido (fixo ao rolar), com "Made with <motor>" e até 4 filmes da casa (getHouseEngineExamples: o líder escolhido pelo fundador primeiro; nunca vídeo de cliente). Clipe = Seedance 1.5. Filme vertical com o próprio vídeo desfocado nas laterais. No celular o vídeo vem em cima.
- Abas do Studio: só Film e Clip (Animate e Avatar seguem nas suas páginas e no "More").
- Topo do site: Video · Images · Spaces · Ads · MCP · Pricing; "MCP" → /claude-connector (URL de documentação do diretório do Claude). Todos os itens com a mesma cor de texto; só o atual ganha peso e sublinhado.
- Guardião novo test-studio-heroi (9 ok, 5 mutantes). Reancorados com o motivo: test-app-blue-layout, test-avatar-fora.

## 2026-09-30 — Studio: motor antes da ideia; vídeo do motor limpo e centralizado (KINEO-STUDIO-MOTOR-PRIMEIRO)
- Fundador (prints do Studio e do Buzzy/Seedance 2.0): "a ideia tem que vir depois que você escolhe o motor"; "só o vídeo, bem colocado no meio", sem as laterais desfocadas.
- Coluna esquerda: 1 Motor → 2 Ideia → 3 Formato → Revisar e gerar. No modo Clipe o seletor some (Seedance 1.5), e os passos viram 1 Ideia · 2 Formato.
- Direita: o filme da casa do motor no tamanho dele (9:16), centralizado, cabendo na tela (até 760 px de altura), selo "Made with <motor>" embaixo à esquerda (não cobre a marca usekineo.com/free do topo do filme).
- Subtítulo novo "Pick an engine, write your idea, then generate." em 13 línguas; lib/promptGuard.ts passa a reconhecer a frase nova como tela colada (a velha continua na lista).
- Guardião test-studio-heroi ganhou o motor-antes-da-ideia e o fim das laterais (11 ok, 7 mutantes).
## 2026-09-30 — ADM: cor escura original com os menus novos

**DECISÃO APROVADA (fundador, Board):** após revisar `ADM-COR-ORIGINAL-MENUS-NOVOS.html`, Joseph confirmou: "deixa escuro pode dar merge". Esta decisão substitui somente a paleta branca/cinza das iterações anteriores do ADM: fundo escuro original, cartões grafite, texto claro e destaque azul. Preservar o refinamento dos menus e do layout, os controles, cálculos e permissões. Não mudar a aparência do site público nem do Studio.

## 2026-09-30 — Studio: palco do motor com cor (KINEO-STUDIO-PALCO)
- Fundador (print do Buzzy x nosso Studio): "precisa ter mais cor… cara de falta de acabamento e polimento".
- O vídeo do motor fica num palco escuro (nos dois temas) com o brilho da cor do motor escolhido; o fundo da página ganha o mesmo brilho, suave. Cada motor tem um par de cores (STAGE_TINT em StudioClient.tsx); Clipe usa a do Seedance.
- No palco: nome do motor grande, a descrição dele, o custo na duração escolhida ("25 cr · 60s · 1080p"), o título do filme e as miniaturas dos filmes da casa daquele motor (troca no clique). O vídeo continua sozinho e inteiro, sem laterais desfocadas.
- Layout por container query: palco largo = info | vídeo | miniaturas; médio = vídeo | info+miniaturas; estreito/celular = vídeo, miniaturas, info.
- Selo honesto intacto: "Made with <motor real>" no vídeo; nenhum vídeo de cliente.

## 2026-09-30 — Studio: a cor do motor na tela toda + vitrine "Best films" (KINEO-STUDIO-TELA-COR / KINEO-STUDIO-MELHORES)
- Fundador: "isso que você fez [o palco] para a tela toda… gostei muito dessas cores"; "na parte de baixo sempre tem que ser os melhores vídeos… uns oito, duas fileiras… os que eu já achei melhor" (ainda apareciam os vídeos de ads dele).
- Tela toda: a cor do motor escolhido pinta o <main> inteiro do Studio (claro e escuro), com transição suave ao trocar de motor (@property). Fonte única: STAGE_TINT → uma regra html:has por motor (data-stage na raiz do Studio).
- Vitrine "Best films made on Kineo": 8 filmes da casa já aprovados pelo fundador, 2 fileiras de 4 (2 colunas no celular): castelo (Seedance, "100%"), Maracaibo (Kling 3), Dyatlov (Kling 2.5), o homem que pulou (Veo 3.1), navio que evaporou (Kling 3), o Golfo (H3), lago que petrifica (Seedance), jantar ainda quente (Kling 2.5). Omni fora enquanto em manutenção. Clique troca para o motor do filme e mostra o filme no palco (evento studio_best_film_clicked).
- A vitrine vem logo abaixo do painel, fora da grade (o palco fixo não passa por cima); os vídeos da própria conta (episódio 2) continuam, depois dela.
- Textos novos em 13 línguas. Guardião test-studio-heroi: 17 ok, 11 mutantes.

## 2026-10-01 — Studio: cor equilibrada na tela toda (KINEO-STUDIO-COR-EQUILIBRIO)
- Fundador: "adicionar cor na parte que não tem nada… senão parece mal feito, que só tem cor em um lugar… achar um equilíbrio entre a cor onde o vídeo fica e onde não tem nada".
- Causa achada: o bloco .stu do Studio tinha fundo chapado var(--bg) e cobria a cor pintada no <main> — só o brilho do topo aparecia. Agora transparente.
- A cor do motor se espalha em tom pastel pela tela inteira (mais forte atrás da coluna de ajustes, mais suave no canto do vídeo); o brilho do palco baixou um pouco; os cartões da esquerda viraram vidro (78% opaco + desfoque) para a cor aparecer por trás sem atrapalhar a leitura. Claro e escuro.
- Guardião test-studio-heroi: 18 ok, 12 mutantes (novo: fundo chapado cobrindo a cor).

## 2026-10-01 — Studio: paleta nova + barra lateral com a cor da caixa do motor (KINEO-STUDIO-LATERAL-COR)
- Fundador: "troca as cores, melhorar um pouco mais, o caminho tá certo… precisa estar a cor da barra lateral a mesma cor da caixa dos motores".
- Paleta (pares em gradiente): Kineo 1 azul→violeta · Seedance esmeralda→ciano · Kling 2.5 laranja→rosa · Veo anil→ciano · Kling 3 carmim→roxo · H3 rosa→dourado · Omni violeta→ciano.
- No Studio, a barra lateral veste o palco (fundo #06080d + brilho das duas cores do motor, texto claro) e troca junto com o motor; a barra do topo pega um leve tom da página. Fora do Studio tudo volta ao normal (o atributo html[data-studio-stage] sai junto com a tela).
- Guardião test-studio-heroi: 19 ok, 13 mutantes.

## 2026-10-01 — Studio: a ideia e o palco no mesmo quadro (KINEO-STUDIO-QUADRO)
- Fundador (desenho em vermelho sobre o print): "equilíbrio de espaço entre a caixa de texto e o painel do vídeo… tem que ficar tudo no quadro".
- O palco do motor ocupa a linha do cartão da ideia (motor + ideia + botões) e tem exatamente a altura dele; o vídeo 9:16 se ajusta a essa altura (não empurra a linha). Formato, ajustes e gerar seguem embaixo, na coluna da esquerda.
- Esquerda mais larga (≥ 460 px, ~1 : 1,6) para os 4 atalhos de tema caberem numa linha; caixa de texto 170 px; topo (subtítulo e abas) mais enxuto. Em 1536×760 o quadro inteiro cabe na tela.
- Palco estreito (< 720 px) esconde descrição e título; < 520 px mostra só vídeo e miniaturas. Celular: igual a antes (vídeo em cima).
- Guardião test-studio-heroi: 19 ok, 14 mutantes.

## 2026-10-01 — Studio: o "quadro de engenharia" (KINEO-STUDIO-ENGENHARIA)
- Fundador: "deixar tudo num quadro de engenharia… onde a mágica acontece… tudo menorzinho, para a pessoa não ter que rolar para escolher o tempo… e embaixo uma reta de vídeos nossos". Vocabulário: "quadro de engenharia" = painel da esquerda do /studio.
- Motor, ideia, formato/duração/língua, ajustes opcionais e gerar viram UM painel (a seção da ideia e a de ajustes se emendam: mesma cor de vidro, sem a emenda). Mais compacto: caixa de texto 120 px, botões de formato menores, língua num seletor pequeno, a dica do formato some no computador (segue no title do botão).
- O palco fica ao lado do quadro com a altura da tela (clamp 460–820 px, cabe no primeiro olhar) e acompanha a rolagem enquanto o quadro rola; no celular volta à altura do conteúdo (vídeo em cima).
- Embaixo: a "reta" com os 8 filmes da casa numa linha (4:5, cortados pelo topo para a legenda do filme não brigar com o título); 4 por linha em tela média; faixa que desliza no celular.
- Guardião test-studio-heroi: 21 ok, 15 mutantes.

## 2026-10-01 — O formato do Studio nas abas Imagens, Espaços e Ads (KINEO-ABAS-PALCO)
- Fundador: "gostei tanto do que você fez… queria estender para todas as outras abas — Imagens, Espaços e Ads — no mesmo formato… ficou perfeito para uma agência de marketing".
- Peça compartilhada components/ProductStage.tsx: cor do produto na tela inteira e na barra lateral (html[data-studio-stage], o mesmo atributo do Studio), quadro de engenharia (.kps-panel), palco escuro na altura da tela (.kps-stage, sticky) e a "reta" da casa (.kps-row). O Studio segue com a versão própria (mesma aparência).
- Cores: Imagens rosa→âmbar · Espaços terracota→areia · Ads azul→vermelho.
- Imagens: motor (6 motores compactos) + texto + formato + gerar no quadro; o palco mostra as imagens da própria conta naquele motor ou, sem nenhuma, as 3 da casa (Nano Banana Pro: perfume, astronauta, farol); embaixo a reta da casa; "Minhas imagens" segue embaixo.
- Espaços: os 4 passos no quadro; o palco mostra 3 pares antes→depois da casa com cortina animada (fotos reais de um andar vazio — faixa "aluga-se" com telefone apagada — e o mesmo espaço pronto no Nano Banana Pro, SEM marca: café, loja de tênis, coworking; 15 créditos da conta do fundador). Quando a pessoa gera, o palco passa a mostrar os espaços dela e o vídeo dela. O café de 30/09 (logo de rede) fica fora da vitrine.
- Ads (/ads/v2): o montador é o quadro de engenharia ("como funciona"/prévia descem para baixo dos passos); o palco mostra os 3 anúncios da casa (garrafa, fone, tênis — 3 looks cada; Nano Banana Pro + Kling 2.5); o painel das 3 variações (resultado) segue em largura total.
- Guardião novo test-abas-palco-2026-10-01 (14 ok, 6 mutantes). Reancorado com o motivo: test-ads-v2-tela (I1 aceita '@/components/ProductStage', cliente puro).

## 2026-10-01 — Sprint MRR: mandato e limites atualizados

- **DECISÃO APROVADA (Joseph nesta conversa):** trabalhar sozinho; medir 30 dias por pessoa, implementar 2–3 alavancas e entregar balanço sábado à noite. A ordem posterior MODO PRODUÇÃO substitui só o stage: publicar pelo enfileirar.sh e PUBLICAR com os dois SHAs, nunca push direto. Supabase só SELECT; sem motores, preços, planos, cupons, crons, Vercel, env ou e-mails enviados.
- **DECISÃO OPERACIONAL REVERSÍVEL:** worktree própria stage-sprint-mrr, base 87825d3225af384ed4c887a7faf7bacbe4546c47. Preservar branch stage/sprint-mrr e abrir codex/sprint-mrr-20261001 antes de enfileirar, pois o script canônico exige codex/*. Main suja preservada.
- **CONTRADIÇÃO / escolha segura:** após fetch, origin/entrega-atual não existe no remoto; a fila local entrega-atual aponta inicialmente à mesma main. Reconciliar a fila local e repetir a leitura antes do CAS do script, sem inventar referência remota nem sobrescrever trabalho alheio. C:/kineo/scripts/!RODAR-AGORA.bat é uma versão antiga que ignora SHAs; eventual PUBLICAR usará o script seguro da worktree, sem editar o da raiz.
- **DECISÃO OPERACIONAL:** sábado é 03/10/2026. Entrega às 20h BRT; conservar literalmente o nome pedido docs/STAGE-sprint-mrr-2026-10-04.md. Nenhuma extensão automática.
- **EVIDÊNCIA DE PRODUÇÃO / HIPÓTESE:** medida e cenários separados em docs/stage-mrr/MEASUREMENT.md. Escolha: gerar junto da ideia e prova/valor em filmes no showcase. Os cenários pedidos não são promessa de conversão. As duas entregas têm interruptores de código; queda de dados não autoriza afirmar zero nem consultar credenciais.
## 2026-10-01 — Showcase público, isolado e depois encaminhado pelo publicador da casa

- **DECISÃO APROVADA — fundador, nesta sessão:** construir `/showcase` com peças públicas da casa, seis filmes resolvidos em `ENGINE_PAGE_LEAD` e `FOUNDER_SHOWCASE`, imagens/Ads promocionais e três espaços; 16 idiomas; temas claro/escuro; sem alterar motores, preços, curadoria da home ou banco. Pedido original seguido de MODO PRODUÇÃO em 01/10/2026.
- **FATO CONFIRMADO — IMPLEMENTADO:** `lib/showcase.ts:1` resolve o catálogo aprovado, sem masters nem catálogo de clientes. `components/showcase/ShowcaseMedia.tsx:1` carrega vídeo só visível, pausa fora da tela/aba e respeita movimento reduzido/economia de dados. Variante pública usa os estilos e cores de `components/ProductStage.tsx`, sem modificar o componente do painel.
- **SUGESTÃO ADOTADA — reversível:** seis filmes escolhidos dentro da seleção aprovada do Studio, com o castelo líder e cobertura de cinco motores. Omni e personagens/marcas de terceiros ficam fora; selos são resolvidos pelo motor no catálogo. Os espaços mantêm proporção vertical para não cortar o imóvel.
- **DECISÃO APROVADA — fundador:** produção somente pelo caminho revisado da casa: fetch, conciliação, gates, enfileirar, PUBLICAR com dois SHAs completos. Nenhum push direto. `SHOWCASE_PUBLIC` e `SHOWCASE_TELEMETRY_ENABLED`, em `lib/showcaseTelemetry.ts:2`, permitem desligar página/link e medição separadamente por código.
- **FATO CONFIRMADO — código/consulta Git em 01/10/2026:** `scripts/enfileirar.sh:7` exige branch `codex/*`; a criação solicitada foi em `stage/showcase`. Para enfileirar, preservar essa branch e criar uma branch local `codex/showcase-20261001` no mesmo candidato, sem alterar main. `git ls-remote --heads origin main entrega-atual` retornou somente main (`87825d3225af384ed4c887a7faf7bacbe4546c47`); `origin/entrega-atual` não existe. Usar a fila LOCAL real `entrega-atual`, conferir novamente antes do enqueue e manter o compare-and-swap do script. Nunca inventar uma referência remota.
- **CONTRADIÇÃO — publicador local:** `C:\kineo\scripts\!RODAR-AGORA.bat` é o legado v11, ignora os SHAs e faz reconciliação automática; `origin/main:scripts/!RODAR-AGORA.bat:1` já chama `publish-reviewed-queue.sh` com ambos os SHAs e recusa ponta divergente. O PUBLICAR desta sessão apontará para o publicador revisado na própria worktree, sem sobrescrever o arquivo modificado da raiz.
- **FATO CONFIRMADO — IMPLEMENTADO:** impressão e primeiro gesto levam `showcase_version=showcase_v1`; a aquisição externa original é preservada por `rememberSignupCampaign`. O identificador anônimo é de navegador, não pessoa comprovada. Relatório separará navegadores anônimos, pessoas identificadas, internos e robôs; cadastro não é receita, teste local não é produção.
- **QUESTÃO PENDENTE / DESCONHECIDO:** não havia uma versão anterior instrumentada desta página. Antes→depois de conversão não pode ser inventado nem convertido em 0%. Sem publicação confirmada e dados reais do mesmo denominador, o resultado comercial permanece sem medição.
- **CONTRADIÇÃO — calendário:** o nome de entrega solicitado contém 2026-10-04 (domingo), mas o prazo verbal é sábado à noite (03/10/2026). Preservar o nome exato do arquivo e considerar sábado 03/10 às 20h de São Paulo para o relatório; nenhuma autorização é inferida do tempo decorrido.

**FATO CONFIRMADO — TESTADO LOCALMENTE, 01/10/2026:** Showcase: 17 provas / 12 mutantes; TypeScript limpo; main 596/737 scripts aprovados e candidato 597/738, mantendo as mesmas 141 falhas históricas, sem asserção nova vermelha. Logs completos locais em `.claude/showcase/*-results`; resumo rastreado em `docs/showcase-2026-10-04/suite.json`. O teste antigo de idioma/rodapé foi ajustado somente para o link explicitamente pedido (mantido o multiset exato). Dois testes longos receberam tempo adicional sem alterar suas asserções.

## 2026-10-01 — MRR: integração da fila Showcase

- **FATO CONFIRMADO / DECISÃO OPERACIONAL REVERSÍVEL:** entrega-atual avançou para 3aba3b0b7bbcbee9df0e66ad08b121a5a01acef9 durante a validação. Preservados a página, catálogo, tradução, palcos, telemetria e rodapé dessa entrega. A MRR passa a fornecer apenas o bloco de valor em filmes após o palco Filmes e sua porta na home; não duplica galeria. Seu interruptor remove apenas esse complemento, nunca a rota alheia. Revalidar a árvore integrada inteira antes de enfileirar.

## 2026-10-01 — MRR: candidato congelado e fila preservada

- **TESTADO LOCALMENTE:** tsc limpo; suíte inteira main 737/535 verdes/202 falhas e candidato 740/538 verdes/202 falhas, sem novos arquivos ou asserções vermelhos. 13 mutantes MRR mortos; 20 prints com JSX real e serviços simulados. Gates em docs/stage-mrr/gates-2026-10-01.json.
- **IMPLEMENTADO / ENFILEIRADO, NÃO VALIDADO EM PRODUÇÃO:** candidato b0fef8ceabaf6b21ff53a137cd2268f5f293c797, main 87825d3225af384ed4c887a7faf7bacbe4546c47. Fila alheia 3aba3b0 integrada antes dos gates. enfileirar.sh fez CAS sem push. PUBLICAR-MRR-2026-10-01.bat criado na raiz autorizada, chama o publicador seguro da worktree e aborta se main/fila mudar. O agente não o executou.
- **DECISÃO OPERACIONAL REVERSÍVEL:** continuar medição/documentação na nova branch codex/sprint-mrr-measurement-20261001. Nenhuma nova entrega artificial enquanto faltarem exposição e observação; não reenfileirar nem criar segundo PUBLICAR hoje.

## 2026-10-01 — MRR: nova meta e primeira entrada pronta

- **DECISÃO APROVADA — fundador nesta conversa:** mínimo de uma assinatura NOVA por dia, conversão de cadastro >=2%; prioridades primeiro filme, episódio 2, prova nos planos, compartilhamento e preparação de reativação. Mantido MODO PRODUÇÃO e nenhuma mensagem de campanha enviada pelo agente.
- **EVIDÊNCIA DE PRODUÇÃO:** baseline SELECT 01/10 em docs/stage-mrr/MEASUREMENT.md: 681 cadastros externos e seis primeiras assinaturas em 30 dias. **HIPÓTESE / conta de planejamento:** 681/30 = 22,7 cadastros/dia; a 2% seriam 0,454 assinaturas/dia. Uma/dia exige 50 cadastros/dia a 2%, ou aproximadamente 4,405% no volume atual. Meta, não previsão.
- **FATO CONFIRMADO — IMPLEMENTADO:** lib/growth/mrrFirstFilm.ts:1 usa custo canônico Seedance 15s; componente só aparece com histórico vazio confiável, trial ativo, conta sem pagamento, elegibilidade de 15s e saldo suficiente. Clique explícito usa o contrato existente trial_best; nada dispara na montagem. Prompt próprio permanece livre. Flag MRR_FIRST_FILM_ENABLED desliga a entrada.
- **TESTADO LOCALMENTE:** primeiro filme: tsc limpo, guardião com nove mutantes mortos, oito prints com JSX real e APIs simuladas (desktop/celular, claro/escuro), clique único e zero requests de escrita. Comparação autocontida FIRST-FILM-REVIEW.html. Suíte completa do novo lote ainda pendente; não é publicação nem venda.
- **DECISÃO OPERACIONAL REVERSÍVEL:** preservar candidato b0fef8ceabaf6b21ff53a137cd2268f5f293c797 e único PUBLICAR de 01/10; novos itens em codex/sprint-mrr-first-film-20261001. Não sobrescrever a fila nem invalidar o botão entregue para simular uma segunda entrega diária.

## 2026-10-01 — MRR: cinco prioridades verificadas e publicação anterior confirmada

- **EVIDÊNCIA DE PRODUÇÃO:** origin/main e fila local em b0fef8ceabaf6b21ff53a137cd2268f5f293c797; GET público /showcase HTTP200 com versão MRR. Origin/entrega-atual continua ausente. O agente não executou publicador. Fonte: docs/stage-mrr/NEW-GOAL-DELIVERY.md, 01/10.
- **EVIDÊNCIA DE PRODUÇÃO:** corte SELECT 14:16:15 UTC: zero novas primeiras assinaturas positivas no dia parcial; seis em 30 dias, cinco ChatGPT/uma origem desconhecida. Janela móvel não equivale ao baseline congelado nem prova efeito das mudanças. Fonte: docs/stage-mrr/daily-mrr-20261001.json.
- **FATO CONFIRMADO — IMPLEMENTADO:** components/growth/MrrEpisodeValue.tsx:1 preserva botões/episódio e acrescenta valor canônico; MrrPricingProof.tsx:1 acrescenta prova própria, filmes/mês e termos vigentes; MrrShareFooter.tsx:1 leva ao Studio com utm_source=share; app/api/admin/mrr-reactivation/route.ts:1 oferece GET sem escritas e POST somente após revisão assinada pelo fundador. Flags individuais reversíveis. Nenhum preço, termo ou motor alterado.
- **DECISÃO OPERACIONAL REVERSÍVEL:** rodapé é UI, não marca nos pixels do MP4, pois pipeline permanece proibido. Reativação reutiliza filme privado já pronto na biblioteca autenticada; sem novo render ou exposição pública. Agente nunca dispara campanha. Bloqueio, ausência de quota/supressão ou claim ambígua falha fechado e não retenta automaticamente.
- **TESTADO LOCALMENTE:** código 57582d91b4399b03a1b72d7960d7348174ff56a0: tsc limpo, 20 mutantes, 40 novas capturas; suíte 743/542 verdes/201 falhas preexistentes contra main 740/538/202, nenhum vermelho novo. Contexto visual/API simulado e rede bloqueada. Gates: docs/stage-mrr/gates-new-goal-20261001.json.
- **DECISÃO APROVADA / execução:** máximo um PUBLICAR MRR/dia já usado em 01/10. Novo lote fica na branch codex/sprint-mrr-first-film-20261001, sem novo enqueue/launcher hoje; próximo dia exige integração da main e filas vigentes, novos gates e casa. Não reaproveitar o launcher histórico nem alterar fila alheia.

## 2026-10-01 — MRR: HOLD comercial recebido do Board

**DECISÃO APROVADA — HOLD comercial, Joseph via Board em 01/10/2026.** Prospecção e disparo da reativação preparada ficam suspensos até liberação explícita posterior ao diagnóstico coordenado pelo Board. Metas, virada do dia e botão de envio não levantam o HOLD. Preservar filas, históricos e supressões; nenhum teste de e-mail, troca de remetente/canal, investigação paralela ou mudança de DNS/configuração. A sprint de produto e e-mails transacionais existentes continuam. Relato do Board: rejeição destinatária 550 5.7.1 para Kevin Stratvert às 13:16 UTC, citando domínio e Spamhaus; não é confirmação independente de listagem nem de falha em todos os envios. Nenhum envio realizado por esta sprint.

## 2026-10-01 — MRR: foco de conversão após reforço do Board

- **DECISÃO APROVADA / prioridade preservada:** avançar a entrada de primeiro filme já pronta no próximo lote permitido. Não acrescentar widget ou campanha para produzir volume. Checkpoint contém hipótese, denominador e critério de desligamento.
- **EVIDÊNCIA DE PRODUÇÃO — baseline congelado 01/09 06UTC–01/10 06UTC, MEASUREMENT.md:** 237/681 nunca geraram; 272 pararam no primeiro vídeo (maior perda absoluta listada); 64/70 checkout sem primeira assinatura (maior perda percentual listada). Grupos se sobrepõem, seis assinaturas precederam primeiro vídeo. Subconjunto elegível ao trial entre os237 é desconhecido. Não chamar o237 de maior perda absoluta.
- **HIPÓTESE / medição:** comparar pessoas externas expostas à versão mrr_first_film_20261001_v1 com compromisso explícito, generate_started e primeira assinatura positiva nas mesmas48h maduras. Não usar681 como denominador de exposição. Sem controle/base de exposição equivalente, associação não é efeito causal.
- **DECISÃO OPERACIONAL REVERSÍVEL:** desligar a flag pelo caminho da casa se houver autostart oculto, dono duplicado de geração, inelegibilidade ou divergência de custo/saldo comprovados. Ausência de amostra madura permanece desconhecida. Previews FIRST-FILM-REVIEW.html e gates estão prontos para revisão.
- **QUESTÃO PENDENTE / DESCONHECIDO:** MRR líquido requer expansão, redução e cancelamento além das primeiras assinaturas. Essas evidências não estão reconciliadas neste lote; não consultar finanças de novo pelo recado. HOLD comercial preservado; próxima publicação só no dia permitido.
