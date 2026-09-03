# PLANO COWORK — SÓ ASSINATURAS NOVAS (03/09/2026)

> Pedido do fundador (03/09, tarde): "atue somente em novas assinaturas. Tudo que
> a gente puder fazer para ter novas assinaturas, mais fluxo e mais pessoas
> pagando. Meta número um. Mais criativo, sem repetir ações."
>
> Este arquivo tem duas partes: (A) o plano, com os dados que o sustentam, e
> (B) o PROMPT pronto para colar numa sessão do Cowork (ou numa tarefa
> programada, se o fundador decidir religar). Quem executa deve ler o CLAUDE.md
> e `docs/MEMORIA-SESSAO-CEO-2026-09-02.md` antes.

---

## 0. PLACAR DE BASE — 03/09 ~13:00 BRT (contas externas)

| dia | cadastros | origem dominante | vídeos | pessoas no checkout | assinou |
|---|---:|---|---:|---:|---:|
| 27/08 | 18 | chatgpt 14 | 9 | 1 | 0 |
| 28/08 | 29 | chatgpt 14 · direto 13 | 9 | 2 | 0 |
| 29/08 | 26 | chatgpt 21 | 16 | 7 | 0 |
| 30/08 | 24 | chatgpt 16 | 20 | 0 | 0 |
| 31/08 | 23 | chatgpt 13 | 15 | 1 | **1** (godofloki, Pro, chatgpt) |
| 01/09 | 24 | chatgpt 19 | 17 | 1 | 0 |
| 02/09 | **57** | **taaft 33** · chatgpt 16 | 43 | 11 | **1** (cintia, Starter, chatgpt) |
| 03/09 (parcial) | 26 | taaft 18 | 26 | 5 | 0 |

**7 dias: ~230 cadastros → ~155 filmes → 28 pessoas no checkout → 2 assinaturas.**
Pagantes na vida: 12. MRR ~$120.

### Os 5 fatos que mandam no plano

1. **Os 3 últimos assinantes vieram do ChatGPT** (salswina 23/08 Pro, godofloki
   31/08 Pro, cintia 02/09 Starter). O ChatGPT manda 13-21 pessoas/dia e é o
   ÚNICO canal que converte. O TAAFT mandou 51 pessoas em 2 dias, 85% fizeram
   vídeo, **0 pagaram**.
2. **11 das 28 pessoas no checkout tinham ZERO vídeos e 25 créditos intactos**,
   a maioria entre 0 e 6 minutos de vida da conta. Isso não é desejo, é o
   paywall aparecendo antes do produto (regra de 02/09 §4). Tirando essas 11,
   o funil real é 17 pessoas com filme no checkout → 2 pagaram (12%).
3. **A Cintia pagou ANTES de fazer o 1º vídeo, com roteiro pronto colado.**
   50 pessoas/14d chegam do ChatGPT com `finished_script`. É o perfil que menos
   precisa ser convencido e o que mais bate no gate de narração (§3 da noite).
4. **O gate `narration_too_short` matou 41 renders de 31 pessoas em 14 dias; 16
   nunca fizeram um vídeo.** É ~9% do topo do funil destruído pelo nosso código
   por "faltam 2 palavras". Terceira vez que aparece em auditoria; nunca consertado.
5. **Crédito não é isca** (winback-25: 2.375 créditos, 0 cliques). A isca é o
   FILME PRONTO sobre o tema que a pessoa já fez. 264 elegíveis esperando.

Pessoas no checkout que não pagaram, por país: IN 5, NG 5, BR 2, DE 2, ES 2,
FR 2, US 2, e 1 de CH/AZ/JP/KG/MW/PS. **Preço é a parede (conclusão fechada de
19/08, não reabrir). Preço público é decisão do fundador — o plano não mexe.**

---

## 1. O QUE JÁ FOI FEITO — NÃO REPETIR (leia antes de escolher qualquer jogada)

Sprint-assinaturas #1→#26 (01→02/09, em produção ou na fila): abandono com
cenas prontas (#1), recovery que re-despachava (#2/#8), cron de resgate honesto
(#3/#5/#19), e-mail "video ready" 16× (#4), momentum com tema (#6/#23), compose
recusando filme pago a mais (#7), teto/contador do /studio (#9/#27), rota
subscriber-idle em dry-run (#10, PROIBIDA para den/noel/emilio/akajitin — 15
e-mails pessoais, 0 respostas), fim de trial com clipes (#11), parede do
/animate (#12), 402 de images/audio (#13), no_authorized_urls (#14),
failure-recovery ao contrário (#15), Data Cache da Vercel force-no-store (#17),
filmes montados jogados fora (#18), copy de perda/D5/D10/video-ready/stranded
(#20-#26).

Codex (02-03/09, push direto na main, ~60 commits): transparência de preço no
/studio + /models-pricing, multi-formato 16:9/1:1/4:5, botões sem porteiro,
Guardião CI, /ai-shorts-for-agencies, /business-*, /free-script-generator,
/product-to-video-script, /scripts/[vertical], /youtube-shorts-script-timer,
share-to-kineo, ShareVideoButton no /v/, Viral Score share, daily ideas feed,
afiliados B2B, dezenas de medições em lib/growth/**. **Antes de criar página ou
CTA novo, `git ls-tree origin/main app/ lib/growth/` — provavelmente já existe.**

Campanhas já esgotadas: winback-25 por crédito (0 cliques), hot lead (19 dias,
0 checkouts), comeback50 D5/D10, e-mails pessoais para os 4 dormentes.

Fechado por decisão: preço (19/08), régua de palavras/segundo (03/09, não mexer),
copy 16:9 (Codex já corrigiu), afiliados/painel/tier de 90s (02/09: "não vendem hoje").

---

## 1b. SINERGIA COM O CODEX (decidido 03/09 tarde) — QUEM É DONO DE QUÊ

O Codex roda 24h em paralelo, na pista dele (oferta, caixa, landing, canal,
prova pública): `docs/PROGRAMA-CODEX-ASSINATURAS-2026-09-03.md`. Regras:
mesmo marco zero e mesmo SQL canônico (seção 5 do programa); cada um lê o
diário do outro antes de escolher; pedidos entre pistas em
`docs/PEDIDOS-ENTRE-PISTAS-2026-09-03.md` (append-only, `- [ ] DE claude PARA
codex · hora · o quê/arquivo/por quê/como medir`); um dono por arquivo.

| jogada | dono | motivo |
|---|---|---|
| A1 gate → degrau · A2 billing · A3 série · A4 cron 72h | **Claude** | máquina de render, cobrança, crons |
| B2 preâmbulo do ChatGPT | **Claude** | parsing no pipeline de geração |
| C3 winback com filme pronto · D1 Cintia · D2 caixa vazia no /studio · D3 Godofloki · E4 alerta de assinatura | **Claude** | admin, crons, dashboard, rascunhos |
| C1 paywall (= K1) · B1 landing (= K2) · B3 classificação (= K3) · C2 2º download (= K4) · C4 cancelado (= K9) · B4 TAAFT (= K6) · E1 /v/ (= K7) · E2 idioma (= K8) · E3 /made-with (= K10) | **Codex** | oferta, caixa, landings, share page |

O Claude NÃO executa jogada do Codex. Se o dado do dia apontar para uma delas,
o Claude escreve um PEDIDO e pega a próxima jogada dele.

## 2. CARDÁPIO DE JOGADAS — ordem de retorno em ASSINATURAS

Cada rodada pega UMA. Tamanho: P = <1h, M = 1-3h, G = meio dia. Todas
respeitam: worktree limpa, teste, `bash scripts/enfileirar.sh`, diário, "hora de
clicar". Nenhuma mexe em preço.

### Frente A — O PRIMEIRO FILME SAI (o produto é o vendedor)

**A1 · Gate de narração vira degrau, não porta** — G, retorno máximo.
`lib/narrationFit.ts:148` `MIN_COVERAGE=0.95` + `generate-video-cinematic/route.ts
~2094-2152`. Quando a fala não enche o botão, DESCER o alvo sozinho para o
`suggestedDuration` (que o 422 já devolve) e renderizar — espelho exato do
`script_duration_autofit` que já sobe o botão no caso oposto. Evento
`script_duration_autofit_down`. Piso mínimo absoluto (ex.: 20s) para não montar
filme de 3 palavras; abaixo disso, expansão automática (`script_expand_autostarted`
já existe e provou funcionar com chukwuebukastanley). **Medição:**
`narration_too_short` de primeiro-vídeo → 0; pessoas com 1º vídeo entregue/dia.
Retorno histórico: 24 dos 41 bloqueios viram filme = ~16 pessoas/quinzena vendo o
produto funcionar.

**A2 · Billing mismatch: entregar o filme e registrar a diferença** — P.
`lib/cinematic/claim.ts:440-446`: tirar `creditCost !== cost` da recusa, gravar
`cinematic_cost_drift`, alargar o regex para as 7 razões `_refunded$`. Investigação
fechada em `docs/BILLING-MISMATCH-2026-09-03.md` §7. 100% dos casos = filme
perdido, 18 de 27 nunca viram vídeo. ~15 linhas.

**A3 · Continuação de série entrega filme inteiro** — M.
22% das continuações no Kineo 1 saem com <90% do pedido (17s e 20s para 35s).
Causa provável: o gerador recebe a ORDEM ("Create the next episode in the same
Short series about…") em vez do ASSUNTO. Consertar o prompt de continuação para
mandar tema + gancho do episódio anterior. **É a jogada da 2ª compra:** série é
a única razão para voltar amanhã, e a única assinante nova está fazendo "Teil 1".

**A4 · Cron de resgate olha além de 20h** — P.
`finish-stranded-renders` `MAX_AGE_MS=20h`: 110 renders/87 pessoas com compose
submetido e sem linha em `videos`, 100% fora da janela. Subir para 72h com teto
de tentativas por claim (para não ficar eterno). Cada filme resgatado é um
e-mail "your video is ready" para alguém que já desistiu.

### Frente B — QUEM CHEGA COM ROTEIRO PRONTO (o assinante que já decidiu)

**B1 · Landing `/paste-your-script`** — M.
"Cole seu roteiro, escolha voz e motor, filme em 3 minutos." Caixa grande no
alto, sem onboarding de 3 metas, `script_mode: verbatim` já marcado, seletor de
duração escondido (o autofit A1 decide). CTA para cadastro com o roteiro
preservado na query (o porteiro já repassa query intacta). Apontar no
`/llms.txt`, no `lib/kineoFacts.ts` e nos GPTs/prompts do quickstart do ChatGPT
(`lib/growth/chatgptQuickstart.ts`). **Medição:** `signup_surface='paste_script'`
→ 1º vídeo → checkout. Meta: ser a página de pouso nº1 do canal que converte.

**B2 · Preâmbulo do ChatGPT descartado antes de virar filme** — P.
"Absolutely. Below is a **complete content package…" ainda vira narração ou
tema de e-mail (7 dos 25 momentum de 02/09 tinham instrução como tema). Filtro
determinístico no `finished_script` e no `momentumTopic`: descartar linhas antes
do primeiro marcador/primeira frase falada, e blocos `STYLE:`/`Create a…`.

**B3 · Checkout do roteiro-pronto conta como desejo, não defeito** — P.
Separar no painel e no `plan_fit`: `checkout sem vídeo COM finished_script`
(Cintia) vs `checkout sem vídeo SEM input` (dd292444, 10s de vida). Só o segundo
grupo aciona a jogada C1. Sem isso, C1 vai esconder o paywall de quem quer pagar.

**B4 · TAAFT: converter o canal que ativa e não paga** — M (metade é do fundador).
33+18 cadastros em 2 dias, 85% fazem vídeo, 0 pagam. Duas coisas: (a) fundador
troca o screenshot "Five engines" e o texto "40cr/$9.90" no dashboard do TAAFT
(hoje 50cr/$7 — o listing mente para 30 pessoas/dia); (b) no produto, quem vem
`utm_source=taaft` cai na mesma esteira do ChatGPT (roteiro-pronto em destaque,
Kineo 1 como padrão), e o e-mail pós-1º-filme deles pede o filme 2, não review.
Descobrir o que causou 33/dia (posição/ranking) é pergunta ao Nick, no rascunho.

### Frente C — O MOMENTO DA COMPRA (checkout de desejo, não de frustração)

**C1 · Paywall só depois do 1º filme** — M, 2º maior retorno.
11 de 28 checkouts/7d = conta com 25cr intactos, 0 vídeos, 0-6 min de vida. Achar
o gatilho exato (`upgrade_modal_opened` reason `trial_ended`/`trial_spent` com
`video_credits=25` e `videos_ok=0`; suspeita: motor escolhido custa mais que 25 e
o modal aparece em vez de oferecer o Kineo 1 que cabe). Regra nova: com 0 vídeos
entregues e crédito ≥ custo do Kineo 1, o modal NÃO abre — abre "Make it now
with Kineo 1 (fits your free credits)" com 1 clique. O paywall só existe para
quem já viu um filme seu. **Medição:** checkout_started com `videos_ok=0` e
`cr=25` → ~0; taxa checkout→pago sobe porque o denominador limpa.

**C2 · A oferta aparece no pico: o 2º download** — P.
Cintia baixou o filme 2× e pagou; ninguém que baixou 2× foi convidado. No 2º
`video_download` de uma conta free com crédito < 1 filme do motor usado, mostrar
o `plan_fit` (já existe: `plan_fit_card_rendered`) com o filme dela como prova
("seu próximo é assim, sem marca d'água, em 4K"). Sem preço no card (preço é
do Codex/fundador); só o botão que já leva ao checkout.

**C3 · Winback com FILME PRONTO, não crédito** — G (aprovada em 02/09, não construída).
Para os 264 elegíveis: gerar em lote (Kineo 1, 35s, dry-run primeiro, depois
custo real ~5cr interno cada) um filme novo sobre o ÚLTIMO tema que a pessoa fez,
hospedar em `/v/[id]`, e-mail "your film about [tema] is ready — 1 click to
watch". 25cr entregues NO clique (rota já existe: adaptar `send-winback-25` para
`credit_on_click`). Lotes de 30, medir por clique e por vídeo, nunca por envio.
Custo interno de fal ~$0,10-0,15/filme = $30-40 pelos 264; parar o lote se os
primeiros 30 derem <10% de clique.

**C4 · Checkout cancelado → filme grátis no motor que cabe** — P.
`checkout_cancelled_trial_delivery_offered` já dispara (1 vez, 03/09). Ligar de
verdade: quem cancela com 0 vídeos recebe na hora o botão "make your first film
free with Kineo 1" e o e-mail 1h depois com o mesmo botão. É a saída digna do C1
para quem já tinha chegado no checkout.

### Frente D — QUEM JÁ PAGA VIRA 2ª ASSINATURA (indicação, série, upgrade)

**D1 · Cintia** — P, fundador decide o tom.
Única assinante nova da semana, série em alemão, veio do ChatGPT. Rascunho no
Gmail (nunca enviar): perguntar da série, oferecer que a gente monte o Teil 2 a
partir do Teil 1, e pedir 1 frase para o TAAFT. Se ela responder, é o 1º
depoimento de quem pagou antes de testar.

**D2 · Caixa vazia do pagante = 3 ideias prontas** — M (zona compartilhada, avisar).
Den (Creator, 140cr, 1 vídeo do autostart) abriu o /studio 2× e não tinha o que
escrever. Pagante com `videos_ok ≤ 1` e crédito ≥ 1 filme vê 3 cards do Viral Now
inline acima da caixa ("Pick one — ready to render"). Alternativa 100% fora da
zona do Codex: pouso pós-pagamento → `/viral-now` quando `videos_ok ≤ 1`.

**D3 · Godofloki (Pro, 4 vídeos, ativo hoje) = candidato a review + série** — P.
Está usando. Rascunho curto pedindo 3 frases no TAAFT (link certo:
https://theresanaiforthat.com/ai/kineo/) com os 100cr pelo botão do /admin/people
DEPOIS da review, nunca antes.

### Frente E — CRIATIVAS (uma por dia, no máximo, depois de A1 e C1)

**E1 · "Made in 3 minutes" como prova pública automática.** Todo `/v/[id]` de
filme completo ganha rodapé "Made from N words of text in M minutes — try yours
free" com o tempo REAL medido (created_at do claim → completed). É o ângulo
aprovado do pacote de publicação, virando página de aquisição sem esforço.

**E2 · Idioma da pessoa como prova no checkout.** IN/NG/BR/ES/DE/FR dominam o
checkout. Quem fez filme em hindi/português/alemão vê no card do plano o próprio
filme com "narrated in [idioma] — every plan, every engine". A dúvida "funciona na
minha língua?" morre com o exemplo dela mesma.

**E3 · Do vídeo do dia do fundador para o funil.** Cada vídeo publicado nas 3
redes ganha uma página `/made-with/[slug]` com o script original + botão "remix
this one" (o `exampleRemix` do Codex já existe) — o conteúdo vira landing sem
copy nova.

**E4 · Alerta de assinatura em tempo real para o fundador.** Toda `checkout_
success_viewed` externa vira e-mail/push para ele com nome, canal, motor do 1º
filme e link do /admin/people — para o "obrigado" pessoal sair em <1h, quando
ainda vale como retenção e como pedido de review.

---

## 3. REGRAS DE OPERAÇÃO DESTE PLANO

1. **Modelo:** rodada mecânica (teste, commit, enfileirar, painel, rascunho) em
   Opus/Sonnet. Fable só para A1, A3 e C1 (código difícil). O limite do Fable
   reinicia 07/09.
2. **Uma jogada por rodada, completa.** Nada de "5 min e uma hora parado", e
   nada de meia jogada. Se não cabe na rodada, quebrar em 2 rodadas com o
   primeiro pedaço entregando algo medível.
3. **Anti-repetição obrigatória:** antes de codar, `grep -n "<palavra-chave>"
   docs/SPRINT-ASSINATURAS-2026-09-02.md docs/PLANO-COWORK-ASSINATURAS-2026-09-03.md`
   e `git log origin/main --oneline -80 | grep -i <palavra>`. Se já existe, a
   rodada vira MEDIÇÃO do que existe, não reconstrução.
4. **Entrega:** `git fetch origin` → worktree `--detach` de origin/main →
   typecheck + testes do arquivo → `bash scripts/enfileirar.sh` → entrada no
   diário → avisar "hora de clicar no SUBIR-SITE.bat". NUNCA `git branch -f
   entrega-atual`. NUNCA push direto.
5. **Zonas do Codex** (GenerateClient, UpgradeModal, engineCost, pricing, lib/growth):
   tocar só o mínimo, avisar no diário. Preço público: nunca.
6. **E-mail = rascunho no Gmail** (create_draft na thread certa). Disparo em massa
   = link de 1 clique com `?confirm=SEND` para o fundador, sempre dry-run antes.
7. **Render pago = dry-run $0 antes.** Lote do C3 só com "vai" explícito.
8. **Diário:** `docs/SPRINT-ASSINATURAS-2026-09-03.md` (novo), uma entrada por
   rodada no formato do de 02/09: o que estava errado (com número), o que mudou,
   para o cliente/receita, SHA, risco, como medir, placar, próximo item.
9. **Placar de toda rodada mede ASSINATURA, não atividade:** assinaturas novas
   7d · checkout de desejo (com filme) vs de defeito (sem filme e 25cr) · 1º filme
   entregue/cadastro · pagantes por canal. Cadastro e vídeo são meio, não fim.
10. Toda resposta ao fundador fecha com ✅ O QUE VOCÊ PRECISA FAZER e 📋 O QUE
    ACONTECEU, e traz a PRÓXIMA JOGADA no corpo.

## 4. META E COMO SABER SE FUNCIONOU

| métrica (externos, 7d móveis) | hoje | meta em 14 dias |
|---|---:|---:|
| assinaturas novas | 2 | **6+** |
| checkout de defeito (0 vídeos, 25cr) | 11 de 28 | ≤ 2 |
| checkout de desejo → pago | 2 de 17 (12%) | 20% |
| 1º filme entregue / cadastro | ~67% | 80% (A1 + A2 + A4) |
| pessoas do ChatGPT que pagam | 2 de ~110 | 5 |
| pessoas do TAAFT que pagam | 0 de 51 | 2 |

Marco zero deste plano: `created_at > '2026-09-03 16:00:00+00'`. Nunca "últimos
N dias" para provar efeito — sempre antes/depois do marco.

---

## B. PROMPT DA TAREFA PROGRAMADA DO CLAUDE (já instalado em Cowork → Scheduled → `kineo-assinaturas-24h-0309`)

> A versão viva é a da tarefa programada. Esta seção é referência. Mudou a
> tarefa, mude aqui; mudou aqui, mude a tarefa. Diferenças em relação à 1ª
> versão (03/09 16:00): ordem do cardápio só com jogadas do Claude (A1, A2, B2,
> A3, C3, A4, D2, D1, D3, E4); leitura obrigatória do último handoff do Codex e
> do PEDIDOS-ENTRE-PISTAS antes de escolher; pedido do Codex viável em 40 min
> vem primeiro; proibido tocar arquivo da pista do Codex; Fable só em A1 e A3
> (C1 passou para o Codex como K1); placar pelo SQL canônico da seção 5 do
> programa do Codex; autonomia total (nunca chamar o fundador); janela de 24h
> com fechamento automático depois de 04/09 16:30 BRT.

Texto integral: `C:\Users\josep\.claude\scheduled-tasks\kineo-assinaturas-24h-0309\SKILL.md`.
O prompt do Codex está na seção 6 de `docs/PROGRAMA-CODEX-ASSINATURAS-2026-09-03.md`.
