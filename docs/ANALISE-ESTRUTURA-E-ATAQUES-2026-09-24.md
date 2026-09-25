# Estrutura, pontos inesquecíveis e ataques — 24/09/2026 (noite)

Pedido do fundador: "dá uma olhada em toda a estrutura que estamos montando desde UI e UX no GPT até Kineo entrando
com ads por aqui no Claude, reforça os principais pontos que não posso esquecer, e onde precisamos atacar".
Método: workflow de 93 agentes (8 leitores de docs + medidor no banco, 2 sínteses independentes, juiz, 2 céticos por
afirmação, crítico de completude). 10 afirmações derrubadas e 11 contestadas pelos céticos; as correções estão
aplicadas abaixo. Banco medido em 24/09 22:16–22:43 BRT, contas externas; docs da main 4f6d0526/5df6ce7b.

## Placar (corrigido pelos céticos)

- Cadastros externos em 14 dias: ~287 (a janela móvel variou de 283 a 289 ao longo de 24/09).
- Recebem filme em até 48 h: ~58% (149 de 256 com a janela fechada). Mistura dois regimes: trial de 30 cr = 70%;
  trial de 10 cr (desde 16/09) mais baixo — queda em 17-18/09 (35%, 31%), voltou a 50-65% desde 19/09.
- Assinantes externos: 10, todos mensais. MRR estimado pelo banco ≈ US$144 (NÃO é o da Stripe; a fonte oficial
  stripeMrrUsd() não foi lida). Se o Studio de US$29 em cobrança recusada (cartão de débito, África do Sul, 23/09)
  não renovar, cai para ≈ US$115.
- Pagantes NOVOS por semana (primeiro pagamento por pessoa), 17/08 → 21/09: 3 · 0 · 2 · 0 · 2 · 2.
  (A série 3·0·2·2·2·3 que circulava conta eventos de pagamento, não pessoas.)
- Último pagante novo: 21/09 13:50 BRT (3 dias de seca). Dos 6 pagantes novos em 30 dias, 5 vieram do ChatGPT e
  5 pagaram em menos de 1 h de conta criada. Na história, 14 de 16 pagantes externos pagaram em menos de 48 h.
- Meta vigente: 10 → 50 assinantes (fundador, 21/09). O ritmo real é ~2 por semana.

## A. O mapa (quem faz o quê, o que está no ar)

- Fundador: preço público, oferta, dinheiro saindo, apagar dados, "vai" nominal da trava 8.2, Enviar dos e-mails,
  configuração da Stripe.
- Claude (CEO): servidor, fluxo, assinaturas, medição, motores. Kineo Ads (sessão Claude) constrói o Studio Ads.
- Codex: visual de todas as páginas + programas de aquisição (diretórios, citações, parcerias, afiliados) desde 10/09.
- Cowork: Payment Links, TAAFT, diretórios, editor do GPT.

| Porta | Estado |
|---|---|
| Trial 10 cr (em filme só o Kineo 1 cabe; Seedance 35 s custa 15) + Kineo 1 grátis semanal (15 s, com marca) | No ar; mantido pelo fundador em 24/09 |
| Planos US$9,90 / 19,90 / 39,90 (60 / 150 / 300 cr/mês), anual com recarga mensal | Congelados até 09/10 |
| Barra de créditos 50–2.000 (só pagante) | No ar desde 23/09; 0 compra externa ainda |
| Studio Ads: passe US$19,90 = 60 cr (R$99,90) | No ar desde ~20h de 24/09; 0 comprador externo; sem painel de operação nem alerta |
| Kineo Empresas Express US$35 / Pro US$75 (feito por pessoas) | No ar; pedido pago grava evento mas não avisa o fundador |
| Motores públicos: Kineo 1, Seedance 1.5, Veo 3.1, Kling 2.5, Kling 3, H3, Avatar | No ar; Omni e Seedance 2.5 pausados |
| ChatGPT por citação orgânica | O canal que paga (5 de 6 pagantes em 30 d) |
| GPT "Short Video Maker by Kineo" | Rascunho PRIVADO; nunca foi à loja (a OpenAI não permite mais compartilhar publicamente) |
| Identidade visual | Prévias do Codex; a mais recente é a "polished v3" (22:38 de 24/09) |

## B. Pontos que não pode esquecer (ordenados pelo dano se esquecidos)

1. **Pedido pago do Kineo Empresas sai com a marca da Kineo.** Tudo que é renderizado na conta do fundador sai com
   marca d'água e cartão final (FORCE_WATERMARK_EMAILS, app/api/compose/route.ts:143, e endCard em :3097), e a
   decisão de 24/09 manda produzir Express/Pro "no Studio da casa, na conta do fundador". Os 3 anúncios de vitrine
   aprovados em 24/09 também. Produzir em conta que renderize como cliente pagante, ou abrir exceção explícita.
2. **Stripe: nunca ligar Pix ou Boleto antes de inscrever `checkout.session.async_payment_succeeded/failed`** no
   endpoint we_1TTmlF… O código trata os dois desde 01/09; o endpoint não os recebe. Hoje o risco é latente (a conta
   só oferece cartão, Apple Pay, Google Pay e Link).
3. **Studio Ads promete revisão humana sem operação:** não há /admin/ads nem alerta de compra. É o "caso Rick"
   armado. Desligar em emergência: `NEXT_PUBLIC_ADS_PASS_LIVE=0` na Vercel **e** redeploy (env só vale em deploy novo).
4. **Preço e oferta congelados até 09/10.** Várias exceções já foram abertas (trial 30→10 em 16/09, Studio50, barra,
   Empresas, passe), cada uma registrada num lugar diferente. Nova exceção = registrar em docs/DECISIONS.md no mesmo dia.
5. **A compra acontece no dia zero.** 5 de 6 pagaram em menos de 1 h; cartas depois do D2 nunca venderam (1.527
   envios de D5/D10 e 313 de momentum em 30 d → 0 pagantes). Esforço de conversão vai no primeiro filme e na primeira hora.
6. **Venda = dinheiro confirmado pelo webhook:** `payment_success` (source stripe_webhook) para compra e
   `subscription_invoice_paid` para renovação. Visita, clique, checkout iniciado e checkout_success_viewed não são
   venda. Todo conserto se mede com corte na hora do deploy.
7. **Trava 8.2** (lib/compose, lib/hollywood, lib/cinematic, lib/broll, lib/lyriaMusic, lib/narrationFit,
   analyze-idea, generate-script, generate-video-*): só com "vai" nominal. Esperando "vai": V4 (Kineo 1 16:9 com
   cenas 9:16), V5 (hindi em Kling 3/H3 morre depois da análise), V6 (narração clássica cortada em 3.800 caracteres).
8. **Contatos proibidos:** den.higgins, noelrss21, emiliomontinari, akajitin — sem fonte única no código; faltam em
   5 remetentes (entre eles studio50 e winback-25). akajitin aparece nas renovações da Stripe.
9. **Nunca prometer o que o produto não entrega sozinho.** Crédito só pelo /admin/people (ou com admin_credits_granted);
   resposta a cliente vai para rascunho. Exceção aprovada: Empresas é serviço humano (teto de 3 pedidos abertos).
10. **Dry-run de US$0 antes de todo render pago.**
11. **Link de review é só o TAAFT** (theresanaiforthat.com/ai/kineo). O "kineo" do Product Hunt é outro produto.
12. **Prazos:** 25/09 02:10 BRT fecha a semana das pistas (sem renovação automática); 09/10 fim do congelamento;
    ~26/10 fecha a criação de GPTs; 11/12 GPTs e ações morrem (migração não iniciada). A revisão do trial de 30/09
    já foi decidida em 24/09: manter 10 cr.

## C. Onde atacar (por impacto medido)

1. **Provar que "apertou e não saiu" acabou.** 13 de 77 pessoas em 7 dias apertaram Gerar e ficaram sem filme, todas
   contas novas, 11 do ChatGPT; 7 morreram sem registrar motivo (6 no 409 de encaixe de motor). O conserto 09b303e7
   (24/09 12:55 BRT) ainda tem 0 oportunidades medidas. Somam-se os consertos desta noite (V1: roteiro da nossa IA
   não é recusado; pedido repetido; resgate sem duplicata). Medir com docs/queries/APERTOU-NAO-SAIU-2026-09-24.sql
   cortado no deploy. 48 h: nenhum 409 sem motivo; 7 d: sem-filme perto de 3 em 13.
2. **Parede dos 10 créditos.** Converte ~12% (4 de 34) em países que pagam; o Starter fecha 3 de 13, o Creator
   "recommended" 1 de 21. 14 d: ≥2 `payment_success` com intent_campaign=wall_v1; 0 com ≥15 expostos → reverter a copy.
   Destacar o Starter mexe na oferta: decisão do fundador.
3. **Levar o ChatGPT à página que vende.** /seedance: 35 contas, 3 pagantes (8,6%); /kineo-1: 103 contas, 0. 87% dos
   pousos do ChatGPT caem em 4 páginas de motor. As pontes subiram em 23/09. 7 d: engine_bridge_clicked ≥8%.
4. **Segurar o MRR / renovação — frente sem dono.** 2 renovações em 30 d; 6 de 16 pagantes sumiram; 12 de 14 com
   plano estão com crédito parado. Primeiro passo: carta de renovação recusada ao Studio de US$29 (rascunho; conferir
   proibidos antes).
5. **Studio Ads e Empresas: operar antes de vender.** Alerta ao fundador em payment_success{ads_pass} e
   dfy_order_paid; /admin/ads; resolver a marca d'água dos pedidos (B1); compra de teste; rascunho novo aos ~10
   negócios que já pediram anúncio (6 fotos + logo). 48 h de venda: ≥3 passes abrem a semana 2.
6. **Tirar as frases que mentem no trial.** "every engine unlocked — Kling 3 included" com 10 cr (lib/freeTierOffer.ts
   e mais 3 arquivos; Kling 3 de 60 s custa 150) e "watermark after the trial" (vídeo de trial já sai com marca).
7. **O grátis custa mais que a receita.** ~475 filmes grátis/mês ≈ US$150–280 de fal contra ~US$134 de receita
   bruta em 30 d; o custo do Seedance aparece com 4 valores no código. Entrada obrigatória da mesa de preço de 09/10.

## D. O que não repetir

- Porta de US$1 / Versão B: cadastros de ~22 para 7 por dia, 0 pagamentos.
- Crédito de presente: winback-25, 95 pessoas, 0 cliques em 24 h. Studio50: 61 envios, 1 clique, 0 pagamentos.
- Cartas depois do D2 (ver B5). Seguem no ar e sem venda: hotlead (38, 0), next_episode_wall (121, 0), season_letter (31, 0).
- Tráfego frio: Reddit US$50 (10–13/09): 984 sessões, 0 contas, 0 pagantes. Product Hunt 3×, 0 cadastros.
  Toolify pago: 13 cadastros, 0 pagantes. Google /for: 100 páginas, 0 sessões humanas.
- GPT próprio: 21 handoffs, 0 com conta. Séries (0 em 195), /v/ público (451 sessões, 0 cadastros), Autopilot (0 de 9).
- Remédio que mutila ou peça escondida: "Trim to fit" 437 exibições, 0 usos; pack US$4,90 escondido, 0 cliques.

## E. Riscos da semana

- Seca: 3 dias sem pagante novo.
- Um canal só: ChatGPT trouxe 5 de 6 pagantes e 44% dos cadastros; em 21/09, 0 citações em 48 perguntas testadas.
- fal: auto top-up (US$100) e alerta (US$75) pendentes desde 21/09; saldo zerado derruba render grande.
- Brasil: 31 cadastros, 8 checkouts, 0 pagamentos desde 10/09; /ads só em inglês.
- Afiliados: 4 falhas reproduzidas no livro de comissões e webhook sem case de refund/dispute
  (docs/growth/AFILIADOS-SEMANA-2026-09-18.md:35).
- Régua financeira sem dono: três MRRs diferentes nos docs (US$205, US$144, "desconhecido"); a frente MMR foi arquivada em 23/09.
- Filtro de contas internas vaza: 4 contas com "skaf" no e-mail não casam com '%josephsskaf%'.

## Conflito aberto (24/09 noite): navegação

Às 22:38 BRT o fundador disse ao Codex: **Image / Video / For Ads / Pricing** (docs/kineo-polished-v3-2026-09-24.md,
prévia em public/design/polished-v3-20260924). Pouco depois aprovou no chat do CEO: **Criar vídeo / Para empresas /
Exemplos / Preços**, com Imagem e Áudio dentro de "Criar". Três itens coincidem; a diferença é Imagem vs Exemplos no
topo. Dados (14 d, contas externas): imagem 4 pessoas e 0 dos 9 pagantes de 45 d; vídeo 172 pessoas e 9 de 9.
Uma escolha só, comunicada ao Codex e à Kineo Ads.
