# 5 TAREFAS DA SEMANA — de 10 para 50 assinantes (21→28/09/2026)

Pedido do fundador (21/09, 13h): "5 tasks pra semana pra a gente poder crescer de 10 pra 50 assinantes; monta tudo e executa."

## A conta antes das tarefas (30 dias, contas externas, banco de produção)
- 339 pessoas fizeram um filme → 76 começaram checkout (22%) → **7 pagaram** (9% do checkout; 2% de quem fez filme).
- Os 7 pagantes: 6 fizeram filme ANTES de pagar; 5 dos últimos 5 vieram do ChatGPT. 10 de 12 pagantes históricos pagaram em 48 h do cadastro (a janela é o dia zero).
- Paredes de crédito: 345 pessoas bateram numa (modal de limite 55 → 8 clicam = 15% · chip da barra 311 → 32 clicam = 10% · 39 viram "top-up indisponível") → 27 foram ao checkout → 4 pagaram.
- Momento "filme pronto": o gêmeo limpo (jogada 7, 18/09) foi mostrado a 18 pessoas, **0 cliques**.
- Pacotes: 1 vendido em setembro (US$ 12,90) contra 435 exposições do chip.

**Matemática honesta:** 50 assinantes = +40. Hoje entram ~7/mês. As 5 tarefas atacam os três fatores do funil (cadastros × filme→checkout × checkout→pago). Se cada um subir o que o dado permite (cadastros +30%, 22%→30%, 9%→15%), o ritmo vai para **~6-8 pagantes/semana** — 50 é meta de 5-6 semanas nesse ritmo, não de uma. Preço está congelado até 09/10 (decisão da casa), então nenhuma tarefa mexe nele.

---

## T1 — Existir para o ChatGPT nas 16 línguas nas páginas que convertem (cadastros ×1,3)
**Por quê:** todos os pagantes recentes vêm do ChatGPT; a página que mais converte chegada em cadastro é a de motor (`/ai-video-generator/kineo-1`: 98 chegadas → 36 cadastros em 14 d) e a porta grátis (51%). A porta grátis já está em 16 línguas (20/09); as de motor só em inglês.
**O quê:** `/ai-video-generator/kineo-1`, `/seedance-1-5` e `/veo-3-1` em 13 línguas (mesmo molde de `lib/seo/freeShortsGeneratorLangs.ts`), hreflang cruzado, sitemap, IndexNow; `/llms.txt` e `/facts` citando as 16 portas.
**Quem:** Claude (código, 21-22/09). Fundador: 3 perguntas ao ChatGPT por dia em línguas diferentes (fr/de/hi/es/pt) e me dizer onde a Kineo aparece.
**Medida:** cadastros com `utm_source=chatgpt.com` por dia e por língua (`?language=` no handoff); alvo +30% na semana.

## T2 — A parede de crédito vira o filme da pessoa (filme→checkout 22% → 30%)
**Por quê:** 345 pessoas/mês batem na parede; só 15% (modal) e 10% (chip) clicam. O modal fala de planos; a pessoa quer O FILME que acabou de pedir. O caminho de volta já existe e funciona (rascunho atravessa o Stripe; `/studio/create?resume=card_entry` dispara sozinho — 1 caso provado depois de 19/09).
**O quê:** (a) modal de limite reescrito em torno do pedido: "Seu roteiro no Seedance custa 25 cr · o Starter dá 60 (este filme + mais 1) · depois de pagar ele gera sozinho" — um botão; (b) chip da barra com o mesmo texto quando há pedido travado; (c) evento `wall_offer_shown/clicked` com o motor e o custo do pedido (medir por pedido, não por tela).
**Quem:** Claude (22/09).
**Medida:** parede→checkout (hoje 7,8%) e parede→pagou (hoje 1,2%) com corte no deploy.

## T3 — Quem abandona o checkout recebe o próprio filme de volta em 24 h (checkout→pago 9% → 15%)
**Por quê:** 76 pessoas/mês chegam ao checkout e 69 saem. A conclusão de preço está fechada — mas 6 dos 7 pagantes tinham um filme pronto antes de pagar: o que convence é o filme, não o texto. Hoje ninguém volta a falar com essas 69.
**O quê:** carta única, 24 h depois do abandono, com o pôster/link do último filme da pessoa + link de 1 clique do plano que cabe no motor que ela pediu (sem desconto, sem crédito de isca; regra da casa). Rota `send-checkout-recovery` dry-run por padrão; disparo = link do fundador; 1 e-mail por pessoa, carimbo em `lib/lifecycle/emailEvents`.
**Quem:** Claude (22-23/09); fundador clica o link uma vez por dia.
**Medida:** cliques e pagamentos dos destinatários em 72 h; se 0 clique em 40 envios, para (regra "carta nova só depois da velha mover alguém" — esta é a primeira carta deste tipo).

## T4 — Distribuição própria: 2 vídeos/dia com link rastreável (cadastros +10-20%)
**Por quê:** TikTok subiu 30% com os 2 últimos vídeos; hoje nenhum cadastro é atribuível a TikTok/YouTube (o link é digitado, sem utm).
**O quê:** `usekineo.com/s/tiktok`, `/s/youtube`, `/s/instagram` (redirect com utm_source/medium/campaign=serie_submersa) no perfil das 3 redes e nas descrições; série "cidades submersas" 2/dia (10h e 22h BRT), cada roteiro fechando com o próximo nomeado.
**Quem:** Claude (rotas hoje; 2 roteiros/dia); fundador/Cowork (render + subida + trocar o link do perfil).
**Medida:** cadastros com utm_source in (tiktok, youtube, instagram) por dia; alvo ≥ 5/dia até domingo.

## T5 — Assinante que quer mais compra em 1 clique (receita avulsa ×5)
**Por quê:** o fundador vê assinantes comprando pacotes, mas o banco mostra 1 pacote em setembro contra 435 exposições do chip e 39 pessoas vendo "top-up indisponível". O degrau de 35 s (21/09) resolve metade (o motor caro cabe); a outra metade é quem quer o motor a 60 s e não tem crédito.
**O quê:** (a) medir os 39 "indisponível" (quem são, por que); (b) no seletor, quando a duração pedida não cabe mesmo a 35 s, oferecer o pacote que cobre ESTE filme ("+120 cr por US$ 12,90 → este filme + 3") com checkout de 1 clique e volta automática (mesmo rascunho de T2); (c) receita avulsa no card do admin (feito 21/09).
**Quem:** Claude (23-24/09).
**Medida:** pacotes/semana (hoje 0-1) e receita avulsa 30 d no admin.

## Ordem de execução (o que sobe quando)
- 21/09 (hoje): T4 rotas `/s/*` + roteiros 5 e 6; T1 código das páginas de motor em 13 línguas (começa).
- 22/09: T1 publicado + IndexNow; T2 modal/chip.
- 23/09: T3 carta + link; T5 medição e pacote de 1 clique.
- 24-28/09: medir com corte no deploy de cada uma; ajustar copy onde o clique não vier; relatório de sábado com o ritmo semanal real.

## O que NÃO entra (para não gastar a semana)
- Preço/plano novo (congelado até 09/10). Crédito como isca (provado 0 cliques em 95 pessoas). Diretórios pagos (TAAFT/Toolify/Reddit: 0 pagantes em 30 d). Motores exóticos (2 pagantes em 30 d; ficam no plano de motores, não no de vendas).
