# ANÁLISE CEO — a empresa inteira e as 3 oportunidades (23/09/2026)

Pedido do fundador (23/09, noite): "analise toda a empresa como ela está hoje, leia os códigos e traga duas ou três oportunidades de ganhar mais dinheiro e trazer mais clientes; a maior parte vem do GPT; pense fora da curva".

Método: 40 agentes em uma varredura orquestrada. 7 leitores (superfícies que a IA lê, dinheiro, produto, ciclo de vida, banco de produção, mercado em set/2026, cemitério de ideias já tentadas), 6 geradores com lentes diferentes (18 ideias), fusão em 8 candidatas, 3 refutadores por candidata (dados no banco, viabilidade no código limpo `origin/main 6600d12c`, mercado com fonte datada), síntese e crítico de completude. Código lido só na worktree limpa `C:\kineo-wt\analise-0923`. Banco: `cqqukkvjjrguayiyjvhh`, contas internas excluídas por `lib/internalAccounts.ts`. Transcrições em `C:\Users\josep\.claude\projects\C--kineo\df542aa8-8ff3-45ea-be17-d5778c85eecb\subagents\workflows\wf_699046c9-e16\journal.jsonl`.

Resultado bruto que o fundador precisa ouvir antes de qualquer proposta: **as 8 candidatas foram refutadas 3 em 3 como estavam escritas.** Nenhuma ideia "fora da curva" sobreviveu ao banco com a conta de receita original. O que sobrou são três jogadas com número honesto, construídas em cima do que os refutadores provaram. Somadas, valem +US$60-130 de MRR e US$200-500 avulsos em 90 dias sobre ~US$205 de MRR. A meta de 10-15 pagantes/dia (70-105/semana) exige 700-1.050 cadastros/semana de países que pagam, 40-60× o ChatGPT de hoje. Isso não sai de conversão. Sai de distribuição que ainda não existe.

---

## 1. Retrato honesto (medido em 23/09)

| O quê | Número | Fonte |
|---|---|---|
| Cadastros externos, 30 d | 684 · 340 (49,7%) vindos do ChatGPT | profiles × signup_utm_source/signup_referrer |
| Pagantes externos na vida | **16** (não 18: 3 dos 19 com has_paid são internos) | profiles + payment_success |
| Pagamentos, 30 d | 9 (7 pessoas) · 2 renovações · MRR ~US$205 | events payment_success / subscription_invoice_paid |
| Pagantes novos por semana | 3 · 0 · 2 · 2 · 2 · 3 (17/08 → 21/09) | payment_success por semana |
| ChatGPT paga | 1,17% dos cadastros contra 0,66% das outras fontes; mediana **19 min** do cadastro ao pagamento (347 min nas outras) | coorte 60 d |
| Sessões ChatGPT por semana | ~200 · pico 301 (semana de 31/08), depois 184 · 199 · ~215 = **platô** | landing_session_started |
| Outras IAs, 30 d | Copilot 67 sessões (10,1 mil citações → 1 visita) · Perplexity 5 · Gemini 0-1 · Claude 0 | landing_session_started |
| Onde o ChatGPT pousa (60 d: sessões → contas → pagantes) | `/` 366→163→1 · `/state-of-ai-shorts-2026` 238→26→0 · `/ai-video-generator/kineo-1` 228→103→0 · `/free-ai-shorts-generator` 132→70→0 · `/text-to-video-shorts` 130→54→0 · **`/ai-video-generator/seedance` 68→35→3 (8,6%)** · `/veo` 10→2→1 | events por session_id |
| Geografia | 14 dos 16 pagantes são EUA/Europa/Golfo. Índia+Brasil+Paquistão = 30% dos cadastros e **1 pagante na vida** (julho) | profiles.signup_country |
| Quem paga | 5 dos 7 últimos pagaram com **0 filmes**, em 0-6 min, pousando em /seedance, /veo, /pricing, /ai-shorts-for-agencies. Chegam decididos pelo que perguntaram ao ChatGPT | payment_success × videos |
| Trial de 10 cr (16/09) | ChatGPT: **3/59 (5,1%)** contra 2/145 (1,4%) no regime em que o Seedance saía de graça. Parede antes do 1º Seedance em 7 d: 13 → 2 checkout → 1 pagou | profiles por regime de created_at |
| Retenção | 6,3% voltam em outro dia. 25% fazem o 2º filme, **68% deles na 1ª hora de vida** | events com ip_hash × videos |
| E-mail | 6.024 cartas em 30 d. **0 dos 8 pagamentos** tiveram clique de e-mail antes. D5/D10: 1.527 envios/30 d → 0 | eventos *_sent × payment_success |
| Motores, 30 d | Kineo 1 366 filmes (267 pessoas) · Seedance 222 (182) · Veo 10 (2) · Omni 10 (1) · Kling 2.5 8 (3) · H3 5 (1) · Kling 3 5 (1). 92% é Kineo 1 + Seedance; motores caros quase só o fundador | videos.quality_mode |
| Custo do grátis (estimativa) | ~475 filmes grátis/mês, quase todos Kineo 1 a US$0,33-0,60 = US$150-280/mês de fal para quem não paga, mais que o bruto de 30 d (~US$134). O custo real do Seedance nunca foi reconciliado: 4 números diferentes no código (US$1,61 / 1,89 / 2-2,5 / 3,30) | lib/checkoutPricing.ts:316, lib/offers/studio50.ts:15, lib/primeiroFilme.ts:16, lib/credits/engineCost.ts:96 |
| Séries | 202 pediram o próximo episódio, 195 receberam, 63 renderizaram; 107 dos 139 que não renderizaram estão com 0 crédito; cadeado da temporada visto por 34 pessoas/30 d; **0 pagantes novos** | next_episode_*, season_* |
| Pedidos de anúncio de empresa | jul 2 · ago 1 · **set 9** (até 23/09), metade do ChatGPT com brief completo; 11 sem pagar; maior pagamento único da história: US$29 | videos.prompt lidos à mão |
| Reddit Ads (US$50) | 956 visitantes → 2 contas → 0 filmes → 0 pagantes | utm_source=reddit |
| Renovação (flanco aberto) | 2 renovações em 30 d; 6 de 16 pagantes sumiram com crédito; 12 de 14 com plano têm 32-172 créditos parados | profiles × events |

Leitura de dono em uma frase: **a máquina de converter está boa (cerca de 10% dos cadastros ChatGPT de países que pagam viram cliente em minutos); a empresa está faminta de gente certa no topo e gasta o tempo dos 3 agentes em canais de volta, robôs e páginas que nunca trouxeram um pagante.**

## 2. O que o mercado diz (set/2026, com fonte)

- **Sora**: app fechou em 26/04/2026; a API fecha em **24/09/2026**. O ChatGPT não gera vídeo e precisa indicar ferramenta. É por isso que ele cita a Kineo.
- **Como o ChatGPT cita**: desde 08/08 usa `site:` em 16,8% das buscas (era 0,37%); Reddit caiu 86% nas citações; comparativos e listas são 32,5% das citações (caso Tally). O que pesa é cobertura de tema no domínio oficial e menção de terceiros (G2/Capterra/Trustpilot: 2,5-3,5× citações). O `llms.txt` não move nada (97% nunca são lidos, Ahrefs).
- **Dentro do ChatGPT**: Plugin Directory com revisão de 14-120 dias; proibido vender bem digital, mostrar plano ou fazer upsell dentro do app; ChatGPT Free **não instala** conector por URL (só Plus/Pro na web, modo dev, aviso de risco); invideo, HeyGen, Revid, OpusClip já estão lá. GPT Store em manutenção.
- **ChatGPT Ads**: self-serve sem mínimo desde 05/05/2026, CPC US$3-5, cobrança por ação, disponível no Brasil.
- **Criador**: a partir de 01/02/2027 o YPP exige 20 M de views de Shorts em 90 d e o Shorts Creator Pool 10 M; RPM do TikTok caiu para ~US$0,40. A tese "ganhe dinheiro com canal faceless" está morrendo. O valor migra para quem paga pelo filme em si.
- **Empresa**: UGC humano US$212/vídeo; UGC de IA US$6-11; anúncio de IA no Fiverr US$25-300; agência white-label US$4-8 mil/mês por 6-12 vídeos. Higgsfield: US$700 M de ARR, crescimento com anúncio para marca/agência.

## 3. As três oportunidades

### TOP 1 — A loja é a parede dos 10 créditos: vender o Starter de propósito onde já se vende, e tirar 3 armadilhas do caminho de 5 minutos

**Por quê.** Quem chega do ChatGPT com roteiro pronto escolhe Seedance (15-25 cr), bate na parede dos 10 créditos antes do 1º filme e, quando paga, paga ali, em minutos. É o único ponto do produto com conversão de dois dígitos em países que pagam (~12% desde 16/09; 4 pagantes em 34 cadastros). O trial de 10 cr converte mais do que dar o Seedance de graça (5,1% contra 1,4%). O fundador marcou a revisão do 10 cr para 30/09 (`lib/reverseTrial.ts:137-141`): o número diz manter.

**O que a parede diz hoje.** "One-time credit packs are a Creator and Studio feature" (`components/TopupUnavailableNote.tsx:58-67`), três planos com o pior fechador marcado "recommended" (Creator fecha 1/21 desde 09/09; Starter 3/13), e quem compra crédito avulso cai em `/checkout/success` preso em "plan_pending" para sempre (`lib/growth/checkoutSuccessEntitlement.ts:34-37`; `app/api/stripe/checkout/route.ts:2541-2544`).

**O que muda (nenhum preço).**
1. A parede mostra o filme, não o crédito: *"[6 primeiras palavras do roteiro] no Seedance 1.5 = 15 créditos. Seu trial tem 10. Starter US$9,90/mês = este filme + 3 iguais. Seu roteiro fica guardado 45 min; depois de pagar, 1 clique."* Starter primeiro e grande; Creator/Studio como links menores. O motor não é trocado por conta própria. Embaixo, a saída grátis continua ("renderize agora no Kineo 1").
2. Volta ao Studio com o roteiro restaurado pelo rascunho que já existe (`lib/growth/cardEntryResumeDraft.ts`, 45 min) e render só no clique da pessoa.
3. Conserto 1: `TopupUnavailableNote` passa a dizer o que o Starter cobre (a função `filmsCoveredByTier` já calcula).
4. Conserto 2: `buildPackAndRedirect` ganha `return=studio` e grava `intent_campaign` no metadata do pack (hoje só `supabase_user_id/pack/pack_credits`, então todo pack sai como campanha nula).
5. Conserto 3: `/pricing` abre em **anual** por padrão (`lib/growth/pricingPlanChoiceAttribution.ts:25`, `requestedBilling ?? 'annual'`) e o anual concede `TIER_CREDITS` **por fatura** (webhook, comentário em :1371), ou seja, uma vez por ano, enquanto o FAQ promete "credits reset each month" (`app/pricing/PricingClient.tsx:176,1451`). 0 vendas anuais até hoje, por sorte. Decisão do fundador: recarga mensal no anual ou esconder o anual.
6. A porta do formato: o produto recusa exatamente o que o ChatGPT gera. `generate-video-fast/route.ts:441` corta em 5.000 caracteres e `:485` recusa "shot plan"; em 30 d foram ~50 eventos de prompt longo e 12 de shot plan. Quem cola diretiva do ChatGPT paga **2,2% contra 0,7%** de quem não cola. Conferir antes o que `lib/pastedScript.ts` já cobre e o que está em voo na outra pista.

**Conta honesta.** Base: 25 pessoas/mês de países que pagam na parede dura → 2 checkout → 2 pagaram (8%). Premissa (sem âncora): 12-15% com o filme na copy e Starter primeiro. 30 d: +1-2 pagantes; 90 d: +3-6 acumulados com churn observado → **+US$30-50 de MRR**. Os 3 consertos são defeito, não aposta: entram sem "vai".

**Teste.** Corte no deploy. 7 d lê o clique (`wall_v1_clicked` ≥ 25% dos expostos de países que pagam; hoje 2/25 chegam ao checkout). 14 d lê pagamento: ≥2 `payment_success` com `intent_campaign=wall_v1` → mantém e estende à parede suave; 0 com ≥15 expostos → reverte a copy em 1 commit e mantém os consertos. Guarda: `checkout_started` de Starter no mesmo grupo não pode cair.

**Notas dos refutadores.** A candidata de origem era "vender este filme por US$4,90 na parede". Caiu: o mesmo pack já é exibido a 100 pessoas (IN/NG/PK/BD/KE) com 2 cliques e 0 vendas; o único pagamento que passou por essa parede (21/09) comprou Starter recorrente, então um cartão de US$4,90 ao lado canibaliza; o pack liga `has_paid` e tira a cota grátis semanal. Achado de história a favor: entre 05 e 12/07 o pack de US$4,90 vendeu 5 vezes em 8 dias (melhor semana da história) e foi retirado em 14/07 como "beco sem saída"; 1 dos 5 virou Creator 20 dias depois. Vai para a mesa de 09/10 como segunda porta, só depois da recusa do Starter.

### TOP 2 — Kineo Empresas vendido antes de construído: Payment Link de US$100, cartão "quer que a gente faça?" no instante em que alguém escreve um pedido de anúncio no Studio, e o fundador opera os 3 primeiros

**Por quê.** Nove pedidos de anúncio de empresa foram escritos dentro do Studio em setembro (2 em julho, 1 em agosto), metade vindos do ChatGPT com briefing completo (Ascend AI/US, eCredit.ng/NG, Help Me Tenerife/CO, restaurante em Amã/JO, SmartTender/IN, ADMITIY/IN, MadLabs/IN, RUIS/NL). Todos receberam um Short de curiosidades e saíram com 0 crédito. Um filme operado a US$100 vale 10 Starters, tem 85-94% de margem e cabe num Payment Link sem uma linha no checkout. O YouTube está matando o comprador "criador faceless"; o comprador que paga pelo filme é a empresa. O fundador já fixou US$100/vídeo e US$500/5 (`docs/product/KINEO-EMPRESAS-2026-09-23.md:7`) e está gastando sessões num protótipo HTML com 0 pilotos. O jeito mais barato de saber se alguém paga US$100 é vender antes de construir.

**Como funciona.**
1. Regex **estrita** (advertisement | video ad for | promo video | founder story | software demo | my/our business | restaurant | clinic | minha empresa | mi negocio | call now | whatsapp) casa ~8-12 pessoas/mês. A larga tinha 27 falsos positivos em 39 (bilionários com "commercial airports", Mônaco, oração).
2. Na análise, antes do render, um cartão ao lado da escolha grátis/pago: *"Isso parece um anúncio do seu negócio. Quer que um editor humano faça com o motor certo, seu logo/fotos e 1 revisão? US$100, em 72 h. Ou renderize você mesmo agora."* Eventos `dfy_card_shown/clicked {source, country}`.
3. Clique → Stripe Payment Link criado pelo fundador (produto "Kineo Empresas — 1 filme 35-60 s, 1 revisão", **US$100, nunca US$99**: 9900 colide com Starter anual e piloto, `lib/checkoutPricing.ts:677`), com `client_reference_id=<user_id>` e `metadata kind=dfy`. O webhook grava `payment_success` (`:1079`, resolve por `client_reference_id` em `:703`) e cai em "unexpected amount_total" sem conceder plano nem crédito (`:1150-1158`). O SKU `autopilot_pilot` **não serve**: grava `plan='autopilot_pilot'` com expiração, sobrescreve plano de assinante e o recibo promete YouTube.
4. Página de sucesso do link = formulário de brief (Tally/Google, zero código): nome do negócio, oferta, CTA, língua, 1-3 fotos ou 1 clipe via "My footage" (o bucket já aceita jpeg/png/mp4, `lib/userFootage.ts:22-25`).
5. Produção: Diretor Kineo para o roteiro; Kineo 1 em modo "ai" quando a foto/clipe do cliente tem que entrar (só entra fora do verbatim, `generate-video-fast/route.ts:1198`) **ou** Seedance/Kling 3 com cenas geradas (o cinematic **não** costura a mídia do cliente: `generate-video-cinematic/route.ts:4600-4617`, "NOT spliced into the render yet"). Enhance 10 cr, entrega por `/v/<id>` privado + MP4, 1 revisão, teto de 3 pedidos abertos, alarme de 72 h (regra de 24/08: nunca prometer o que o produto não executa sozinho).
6. Depois da entrega: "US$500 por 5" e, para quem quer fazer sozinho, Creator.
7. Os 4 quentes (último acesso 21-23/09) recebem rascunho pessoal no Gmail do fundador respondendo ao que **eles** escreveram. Decisão dele: o registro de 04/09 (PEDIDOS:125) diz que não há consentimento afirmativo gravado.

**Conta honesta.** Fluxo 8-12 briefs/mês, metade de países que pagam. Taxa nunca observada (maior pagamento único US$29; a DFY de US$97/30 Shorts por e-mail em julho deu 0/160, mas era outro comprador e canal morto). Premissa: 5-10% (padrão de gig Fiverr). 30 d: 0,6-1,2 vendas = US$60-120; por pedido US$85-94 líquidos (fal US$2-12); 1-2 h de operador. 90 d: 2-4 vendas = US$200-400 + 1 pacote de 5 se alguém repetir. Não é MRR; é a linha de ticket alto que paga a fal do trial de todo mundo. Se 0 em ~25 expostos/30 d: a coorte IN/NG-pesada não paga US$100 → US$49 é decisão dele depois de 09/10, ou o Empresas é arquivado com número na mão.

**Teste (14 d, o fluxo é de 2-3 briefs/semana).** Denominador `dfy_card_shown` ≥ 8 (≥3 de países que pagam). ≥1 `payment_success amount_total=10000` → constrói fila + página /empresas + certifica 72 h; 0 com ≥2 cliques → preço/formato para 09/10; 0 cliques em 8 → copy do cartão (+7 d). O protótipo HTML fica congelado até o 1º pagamento.

**Risco.** Coorte IN/NG-pesada (Fiverr básico custa US$25-75): medir por país antes de concluir sobre preço. Diferenciação vendida: "narrado em 35-60 s na sua língua, 8 motores, QA humano", não "anúncio de IA" (Meta Ads Manager e o Veo do Google Ads fazem foto-vira-vídeo de 10 s de graça). Dizer "com seu logo/fotos" só quando for Kineo 1.

**Notas dos refutadores.** A coorte original ("48 que já pediram") caiu para 11; as 15 pessoas do checkout de Autopilot/piloto/bulk são donos de canal, interseção 0 com os negócios, e já recusaram US$99 (0/5) e US$299 (0/9). Por isso o ponto de venda é a sessão em que o brief é escrito, não e-mail para o estoque (os 11 já receberam ~7 cartas cada).

### TOP 3 — As 5 páginas que o ChatGPT já cita viram portas do motor pago, e a casa passa a medir toda semana quais prompts a citam

**Por quê.** O ChatGPT é 6 de 7 pagantes desde 22/08 e ~200 sessões/semana, paradas. 87% dos pousos caem em 4 páginas de motor **grátis** que converteram 0 em 60 d; a página do motor **pago** converte 8,6% das contas. O que decide em qual página a citação cai é o que está escrito no domínio, e ninguém na casa mede quais prompts citam a Kineo. Desde 08/08 o ChatGPT consulta o domínio oficial com `site:`; a Sora API morre em 24/09; a citação não vai para página nova por vontade nossa, vai para o que ele já indexou. Por isso: mexer nas 4 que ele cita, não fabricar mais 100.

**O que muda.**
1. As 4 páginas grátis mais citadas (`/ai-video-generator/kineo-1`, `/free-ai-shorts-generator`, `/text-to-video-shorts`, `/state-of-ai-shorts-2026`) ganham, **acima da dobra e sem trocar título/H1**, o bloco *"Paste the script ChatGPT wrote → Seedance 1.5, the engine people publish with · from US$9,90 = 4 films"* com evento `engine_bridge_clicked {from,to}` (a ponte de 22/09 está abaixo da dobra, só no kineo-1, e `?from=` em Link do Next não gera evento: 0 de 73). Kineo 1 passa a ser descrito como ensaio grátis.
2. A camada que a IA lê para de mentir (higiene, 1 commit, vale 0 em receita medida): `public/gpt/openapi.json:31,97,240` promete "25-credit trial" e Seedance grátis (trial é 10 cr); `lib/kineoFacts.ts:816` diz "per month" (é por semana desde 17/09); `:138` "since August 7"; `:410` "Kling 3: one fits" (são 2); `app/llms.txt/route.ts:464` "US$4,90 single video unlock" (é pack de 30 cr); `lib/comparisons.ts:54` preços de concorrentes de 26/07; `app/models-pricing/page.tsx:166` trial de 25; `lib/pricing.ts:81` free.credits=3.
3. As `/for` param de roubar a atribuição: `app/ai-video-generator/for/[slug]/page.tsx:49-52` crava `utm_source=google` no CTA; quem vem do ChatGPT e se cadastra por ali vira "google". Repassar a origem real.
4. **Uma** página nova pelo padrão que o ChatGPT já cita (a `/state-of-ai` é a 2ª mais citada, 30/semana, página de dados): "Seedance vs Veo vs Kling for Shorts — N renders medidos", alimentada pelo banco (mediana de duração, créditos, taxa de sucesso por `quality_mode`). É a página cujo leitor está escolhendo motor pago.
5. Painel semanal de prompts (Cowork): 30 prompts × 3 rodadas × 7 línguas (EN + ES/FR/DE/IT/NL/PT, as línguas dos pagantes), registrando página citada e posição. A casa já fez "bateria de 10" (Kineo ausente em 9) e "48 perguntas em 16 línguas" (0 citações) à mão; vira medição por página e por semana. É a única peça que compõe em 90 dias.

**Conta honesta.** Páginas de motor pago hoje = 12-18 sessões ChatGPT/semana → ~25-30 contas/mês → 2-3 pagantes/mês. Isso **é** a máquina inteira. Alvo: share de pousos em página que vende o motor pago de 9-12% para 20% em 30 d; contas nascidas em `/kineo-1` → pagantes de 0/103 para ≥2/100 (o refutador está certo que quem pergunta "grátis" é outra pessoa; por isso 2%, não 8,6%). 30 d: +1-3 pagantes; 90 d: **+US$30-80 de MRR**. Teto honesto: muda quem chega em qual página, não quantos chegam.

**Teste.** 7 d: `engine_bridge_clicked` ≥ 8% dos ~110 pousos/semana nas 4 páginas. 14 d: ≥1 pagante entre contas pousadas em página grátis (baseline 0/173 em 60 d). Guarda de citação: sessões ChatGPT/semana de `/kineo-1` não podem cair >30% depois da copy → reverte o corpo, mantém o bloco. Página de dados: <10 sessões ChatGPT em 30 d → não fazer a 2ª.

## 4. Reservas (quase entraram)

1. **Pack de US$4,90 como 2ª porta**, só depois da recusa do Starter: único ponto de preço que já subiu a taxa de pagantes (julho: 9 cliques → 5 pagantes). Plateia pós-recusa em países que pagam ~19/mês; margem US$0,5-2; liga `has_paid` e tira a cota semanal. Mesa de 09/10.
2. **ChatGPT Ads self-serve com CPA**: o único canal que põe a Kineo dentro da conversa que já converte. CPC US$3-5 × 50% cadastro × 8,6% = CAC US$70-116 contra LTV ~US$18 (1,3 pagamentos por pagante). Só com lance por CPA ≤ US$15 por compra, teto US$100, morte em CAC > US$20. Dinheiro saindo: decisão do fundador.
3. **Conector MCP** (a Kineo dentro do ChatGPT/Claude/Gemini renderizando na conta): ChatGPT Free não instala por URL, 49% da coorte é mercado emergente, 64% chega pelo celular, o render conduzido pelo servidor só existe para Kineo 1 e morre em 54% (409 engine-fit, `lib/renderJobs.ts:88-97`), Seedance não tem modo serviço, diretório sem prazo. Esforço real 10-15 dias. Volta a valer quando o 409 estiver consertado e houver listagem aprovada.
4. **Portas em ES/FR/DE/IT/NL para Seedance/Veo**: as 39 páginas existem desde 21/09; o único tráfego de língua real é PT (6 cadastros BR/PT, 0 pagos). Entram no painel de prompts: se derem ≥5 sessões ChatGPT/semana, ganham o bloco. hi/ur/vi/id/ar e PT-BR não (0 pagantes IN/BR/PK).

## 5. Parar de fazer (cada item consome sessão e reputação, e tem número de morte)

1. Cartas pós-D5 e de volta: D5/D10 (1.527/30 d → 0), weekly_quota (480 → 0), winback25 (120 → 0), momentum (313 → 0), studio50 (61 → 0), next_episode_wall (121 → 0), season_letter (31 → 0), hotlead (38 → 0). Desregistrar do `vercel.json`; libera ~3.000 e-mails/mês e a supressão de 24 h que cala a carta quente das primeiras 48 h.
2. Crons mortos ou perigosos: `send-second-try-1usd` (`vercel.json:152`) e `send-affiliate-wakeup-1usd` (`:156`) prometem a porta de US$1 morta desde 09/09; `send-credits-back`, `refresh-viral-now` (tabela vazia).
3. Projeto 1 Google: 100 páginas, **0 sessões humanas** desde 17/09 (7 bots). Página nova congelada até o Search Console provar indexação; consertar o `utm_source=google` cravado antes de qualquer leitura.
4. Protótipo HTML do Kineo Empresas: parar até 1 pagamento no Payment Link.
5. GPT Store, rascunho g-6a9e…, `/make`, `/chatgpt`, handoff, MCP: 16 handoffs na vida, todos sondas internas de 07/09.
6. Autopilot US$299 / Lite US$59 / piloto: o robô nunca renderizou (4 runs: 401 Protected deployment + 3 session_unavailable), `channel_id` NOT NULL, Lite 0 cliques em 65 pessoas no /pricing. Parar até a auditoria do OAuth do Google.
7. Qualquer Seedance grátis no trial: 145 Seedance grátis ChatGPT → 2 pagantes; o regime de 10 cr converte 3-4×.
8. Página pública `/v/` por padrão, laço viral, post-to-earn, review in-app, referral: regime público de 09/06-27/08 = 451 sessões em /v/ → 0 cadastros com origem /v/ → 0 pagantes; post_invite 218 viram/1 postou; review 247/1 clique.
9. Séries como oferta de conversão: manter o produto, parar de vender por ali e parar as cartas (0 pagantes novos de 195).
10. Tráfego pago frio e lançamentos: Reddit (956 → 2 → 0), Product Hunt (3 lançamentos, 0 cadastros; a página /products/kineo é de outro produto), Toolify pago (13 cadastros, 0).
11. Páginas de motor em línguas de mercado emergente e tradução de Kling 3/H3/Kling 2.5 (páginas EN com 4-7 sessões/60 d).

## 6. Defeitos com dinheiro achados de passagem (consertar sem "vai", são defeito)

| Defeito | Onde | Efeito |
|---|---|---|
| Anual concede créditos por fatura (1/ano) e o FAQ promete reset mensal; `/pricing` abre em anual | webhook :1360-1371 · `pricingPlanChoiceAttribution.ts:25` · `PricingClient.tsx:176,1451` | Quem pagar US$99/ano recebe 1 mês de crédito. 0 vendas até hoje |
| Comprador de pack cai em `/checkout/success` "plan_pending" | `checkout/route.ts:2541-2544` · `checkoutSuccessEntitlement.ts:34-37` | Atinge o `handleBuyCreditsOnly` que está no ar |
| Pack não grava `intent_campaign` | `checkout/route.ts:2561-2565` × webhook :750 | Toda medição de pack dá 0 |
| Resgate de aba fechada morre em 409 engine-fit | `lib/renderJobs.ts:88-97` · `generate-video-fast/route.ts:489-505` | 50 de 94 jobs do servidor falham |
| A IA lê promessas falsas | `openapi.json:31,97,240` (25 cr) · `kineoFacts.ts:816` (per month) · `llms.txt:464` | Isca e troca para o público que mais paga |
| `/for` carimba `utm_source=google` | `for/[slug]/page.tsx:52` | Rouba do ChatGPT a atribuição |
| Regra de 60 s+ para TikTok Rewards e páginas "ganhe com canal faceless" | copy e docs | RPM ~US$0,40; YPP 2027 exige 20 M views. Revisar promessa |

## 7. O que nenhuma lente cobriu (flancos abertos)

- **Filme que falha antes da parede**: "apertou e não saiu" (29 pessoas/7 d na memória) e os 22 erros de prompt >5.000 caracteres. A coorte ChatGPT pode estar sumindo antes de chegar à parede.
- **Renovação**: 2 renovações em 30 d, 6 de 16 sumiram, 12 de 14 com crédito parado. É a principal fuga de MRR e não há jogada sobre ela. Os 2 únicos que gastam de verdade são Studio do ChatGPT (GB com 10 cr, SA com 6): candidatos a top-up/upgrade agora.
- **Celular**: 64% chegam pelo celular e ninguém olhou a parede nem o checkout no celular.

## 8. Ordem de execução

**Semana 1 (23-30/09)** — TOP 1 e a parte grátis do TOP 3. Sem "vai" (Claude, servidor): `return=studio` + `intent_campaign` no pack, commit das mentiras que a IA lê + guardião, utm pass-through nas `/for`, leitura do trial de 10 cr com corte em `cf6e9e15` pronta para a revisão de 30/09. Com "vai" de uma palavra: parede v1 Starter-first (Codex, pista visual, 1 PEDIDO) e o padrão mensal do `/pricing` com a decisão sobre o anual. Operação (1 commit no `vercel.json`): desregistrar os crons mortos.

**Semana 2 (30/09-07/10)** — TOP 2: depende de 20 minutos do fundador (Payment Link US$100 + formulário). Codex sobe o cartão dfy; Claude a linha no /admin e o alarme de 72 h. Leitura da parede v1 com ≥12 expostos de países que pagam.

**Semanas 3-4 (07-21/10)** — TOP 3 inteiro: blocos acima da dobra nas 4 páginas, página de dados, rotina semanal do painel de prompts. **09/10**: a mesa de preço recebe os números destes três testes mais o que o congelamento segurou: pack US$4,90 como 2ª porta, escada invertida Studio/Creator (US$0,1330 × 0,1327 por crédito; Studio 0 vendas a US$39,90), Creator "recommended" 1/21 contra Starter 3/13, custo real do Seedance reconciliado.

## 9. Decisões que são do fundador

1. "Vai" para a parede v1 (copy nova numa superfície existente, mecânica sob o congelamento).
2. Manter o trial de 10 cr até 09/10 (revisão que ele marcou para 30/09: 5,1% × 1,4%).
3. Anual: recarga mensal ou esconder até existir; padrão mensal no `/pricing`.
4. Selo "recommended" do Creator na parede (1/21 contra 3/13): é oferta, é dele.
5. "Vai" para vender o Empresas antes de construir (inverte a decisão de 23/09) e criar o Payment Link de US$100 na Stripe.
6. Os 4 rascunhos pessoais aos briefs quentes (consentimento não gravado).
7. Quem opera os 3 primeiros pedidos (ele, ou Claude renderiza com dry-run e ele faz QA).
8. "Vai" para a copy "Seedance é o motor de quem publica; Kineo 1 é o ensaio" nas 4 páginas citadas.
9. Ferramenta paga de rastreio de prompts (US$50-200/mês) ou painel manual do Cowork.
10. Desregistrar os crons mortos (operação, 1 commit).
11. ChatGPT Ads com CPA (dinheiro saindo), só se quiser testar o teto de US$100.

## 10. Correções do crítico incorporadas

- "ChatGPT é 100% dos pagantes desde 22/08" era falso: 6 de 7 (o de 21/09 veio de billing.stripe.com).
- A soma das três é +US$60-130 de MRR, não +100-250. O TOP 2 é avulso.
- "~12%" vem de 4/34 e "8,6%" de 3/35: amostras pequenas, leitura em 14 d, não 7.
- Custo do grátis (US$150-280/mês) sai de custo por filme nunca reconciliado: estimativa.
- O TOP 2 publica um preço novo (US$100) durante o congelamento: por isso é decisão nominal dele, não execução.
