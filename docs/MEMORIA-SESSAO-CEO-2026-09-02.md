# MEMÓRIA DA SESSÃO CEO — 02/09/2026

> Escrito porque a sessão de chat onde isto foi decidido perdeu o shell (bug do
> Cowork: a negativa de permissão fica presa na conversa e não há como
> revertê-la). Nada aqui existia em arquivo antes. Toda sessão nova deve ler
> este documento junto com o CLAUDE.md.

---

## 1. MODO DE TRABALHO A PARTIR DE 02/09 — AÇÕES PONTUAIS, SEM SPRINT

O fundador **desligou todas as tarefas programadas** (sprint-assinaturas-24h e
sprint-v1-ao-v4-30min). Motivo, nas palavras dele: *"o 5.1 está consumindo muito
do meu crédito do Fable; em um dia praticamente já consumiu tudo"*. Em 02/09 o
limite do Fable estava em **79% consumido, com reinício só em 07/09**.

Regras que nascem daí:
- **Nada de sprint automática** sem ordem explícita nova.
- Trabalho é **pontual**: uma ação por vez, decidida no chat.
- **Tarefa mecânica (rodar teste, commit, publicar vídeo, mexer em painel) →
  Opus/Sonnet.** Fable fica para análise densa e código difícil.
- Toda entrega continua terminando com os dois blocos (o que fazer / o que
  aconteceu) e com a próxima jogada.

## 2. AS 5 AÇÕES DO DIA 02/09 (ordem decidida com o fundador)

1. **Subir a fila** (26 commits parados) — feito, deploy READY 11:35 BRT.
2. **Contrato de duração nos 2 motores de entrada** — feito (ver §5).
3. **Trocar a isca do winback: filme pronto em vez de crédito** — PENDENTE.
4. **Responder quem escreveu** (Nick/TAAFT, fal, Emilio) — feito pelo fundador.
5. **Vídeo do dia 19-21h BRT nas 3 redes** — Voynich publicado 01:20 BRT.

Descartado de propósito naquele dia: screenshot do TAAFT, afiliados, tier de
90s, painel admin. Nenhum deles vende hoje.

## 3. WINBACK-25: CRÉDITO NÃO É ISCA (dado que muda a estratégia)

Campanha de 01/09: **95 pessoas receberam +25 créditos (2.375 créditos doados)
e um e-mail honesto sobre os motores novos**. Medido 24h depois:
**ZERO cliques. Zero vídeos. Zero checkouts.** Restavam 264 pessoas elegíveis.

Conclusão para toda campanha futura: **quem gastou tudo não volta por saldo.**
O saldo não é o que falta — falta motivo. A jogada aprovada, ainda não
construída (ação 3):

> O e-mail deixa de oferecer crédito e passa a oferecer **o filme pronto**
> sobre o tema que a pessoa já fez, no motor novo. Assunto do tipo "seu filme
> sobre [tema dela] está pronto — 1 clique para assistir". Os 25 créditos são
> entregues **no clique**, não antes. O produto vira a isca, o crédito vira a
> consequência.

Corolário: nunca mais medir campanha por "quantos receberam"; medir por
cliques e vídeos feitos.

## 4. O CHECKOUT DE 02/09 FOI FRUSTRAÇÃO, NÃO DESEJO

Pico aparente de checkouts (4 em 24h contra média de 2,6). Ao abrir pessoa por
pessoa: **3 dos 4 tinham ZERO vídeos completos.** Dois deles (wummm709,
adrianwells) tinham acabado de falhar um render; o modal `trial_ended` /
`trial_spent` apareceu em contas com **menos de uma hora de vida e 25 créditos
intactos**. O único checkout de desejo real foi thiagomineiro (2 vídeos, saldo
zerado) — e esse cancelou: é preço, a conclusão fechada de 19/08 que não se
reabre.

Regra: **checkout de conta sem vídeo não é sinal de compra, é sinal de defeito
ou de paywall disparando cedo demais.** Contar os dois separados em qualquer
placar.

## 5. RÉGUA DE NARRAÇÃO: UMA POR VOZ, NUNCA UMA SÓ PARA TUDO

Existiam quatro números diferentes de palavras-por-segundo vivos no código
(2,3 / 2,5 / 3,1 / 4,0). A correção **não** é unificar tudo num número — é
unificar **por voz**:

- **Caminho clássico** (Seedance 1.5, Kineo 1, Veo, Kling 2.5) → TTS `tts-1-hd`
  a **3,1 pal/s**. É a régua de `lib/compose.ts targetWordCount` e agora também
  a de `durationPlanFor`: 35s = 100-115 palavras · 60s = 175-195 · 90s = 265-290.
- **Caminho hollywood** (Kling 3, MiniMax H3, Omni, Seedance 2.5) → voz própria
  a **2,3 pal/s**. É a régua do `narrationFit` e do gate de coerência.

Quem mexer nisso e "padronizar" os dois no mesmo número vai quebrar um dos
lados. Está escrito aqui porque a tentação é enorme.

Consertos de 02/09 que dependem disso (já em produção):
- `analyze-idea` aceitava só 45/60/90 e coagia o 35 do seletor para 45 — o
  roteiro de 35s nascia com 130-150 palavras. Agora 35/60/90 reais; 45 (alvo
  fantasma das landings antigas) vira 35.
- Verbatim longo (fala > alvo×1,2) sobe sozinho para o maior botão que a fala
  enche, ANTES de gastar (`script_duration_autofit`); se não cabe nem em 90,
  grava `script_duration_overflow`.
- Caminho hollywood: gate por PALAVRAS faladas (92% de alvo×2,3) com replan
  até 2× e ordem de fechar a história; teto de 60s chumbado do planner virou
  alvo+6 (ele arrancava o PAYOFF de todo plano de 68); dialogue em modo
  faceless vira cena narrada.

## 6. O PRIMEIRO VÍDEO É O PRODUTO (dados de 14 dias, 174 pessoas externas)

| Caminho | Pessoas | Motor | Fez o 2º | Pagou |
|---|---|---|---|---|
| Auto-start (landing → render sozinho) | 69 (40%) | 55 Kineo 1 · 14 Seedance | 17% | **0** |
| Manual (a pessoa escreveu a ideia) | 71 | 40 Seedance · 31 Kineo 1 | 35% | **4 (todos)** |
| Onboarding de 3 metas | 22 | **17 Kineo 1** · 5 Seedance | 36% | 0 |
| ChatGPT quickstart | 12 | Seedance | 8% | 0 |

Leituras que valem para sempre:
- **Os 4 pagantes vieram da própria ideia.** Vídeo automático não vende.
- O onboarding mandava 77% para o Kineo 1 por **corrida**: a pessoa clicava
  antes de `/api/credits` responder, e `credits === null` caía no else.
  Consertado (consulta o saldo antes de escolher o motor).
- O auto-start renderizava **texto colado do ChatGPT ao pé da letra**
  ("Absolutely. Below is a **complete content package…"). Agora esse texto fica
  na caixa e a pessoa aperta o botão.
- **Kineo 1 e Seedance 1.5 são os motores de 100% dos primeiros vídeos.** É
  onde a qualidade importa mais, não nos motores caros.

## 7. KINEO 1 — O QUE ELE É POR DENTRO (e o que foi feito em 02/09)

Pipeline real: **Pixabay** (Pexels foi desligado no #351), 2 clipes por cena,
corte seco 2,5-4s com Ken Burns, grade de cor por nicho em alpha "primeira luz",
legenda karaokê, música a 12%, sem transição/vinheta/letterbox.

Melhorias escritas em 02/09 (todas só no `fast`, todas reversíveis):
1. **Letterbox** 6% em cima e embaixo (`FAST_LETTERBOX_PCT = 0` desliga).
2. **Abertura do preto** — fade 0,5s só no 1º corte.
3. **Grade um degrau acima** — wash +0,03, glow +0,02 (era o passo que o
   próprio código pedia "depois que alguém assistir"; o fundador assistiu).
4. **Nitidez vira penalidade dura no ranking do footage** — paisagem <2560 px
   −2, retrato <1080 px −3. Motivo: `fit: 'cover'` recorta 9:16 e um master
   1920×1080 vira ~608 px úteis esticados 1,78×. Relevância continua mandando
   (1 token = 4 pontos > qualquer penalidade).
5. **Corte máximo 4 → 4,5s** — o plano assenta e lê como filme.

**O que NÃO foi feito, de propósito:** `color_filter`, `playback_rate` e
vinheta radial. São propriedades do Creatomate que este repositório nunca
exercitou; se o render rejeitar, **o primeiro vídeo de todo mundo falha**.
Vinheta de verdade exige um PNG com gradiente, não uma `shape`. Só entrar com
render de validação na mão.

## 8. PUBLICAÇÃO NAS REDES — ATALHOS DO FUNDADOR

- **"subir para as redes"** = Instagram + TikTok + YouTube.
- **"abre os anexos"** = eu abro as três telas de upload, ele solta o arquivo,
  eu preencho e publico.
- Enquadramento: 9:16 nas três. No Instagram, forçar o corte 9:16 na tela
  "Cortar" (o padrão vem 1:1) e ligar o **rótulo de IA**.
- Horário: mirar **19-21h BRT** (pico EUA). Publicado fora disso, o Shorts/Reels
  ainda acumula, mas não é o ideal.
- O pacote de publicação segue o modelo do Lago Natron (CLAUDE.md).

## 9. CELULAR / MOBILE

**Projeto ligado a uma pasta local só roda no desktop.** Sessões locais não
aparecem no app do celular — não é bug. Para trabalhar do celular existe o
**Despacho** (Configurações → Cowork → Despacho, já ligado): a mensagem sai do
celular e executa neste computador, que precisa estar ligado e com o app aberto.

## 10. BUG DO COWORK QUE CUSTOU MEIO DIA (02/09)

Numa sessão longa, uma negativa de permissão do shell ficou **gravada para
sempre**: toda chamada volta `Permission denied` e o app **não mostra mais o
diálogo** para reaprovar. Nem "Aprovar automaticamente", nem ligar a execução
de código em Capacidades, nem reiniciar o app reverteu — porque a sessão
carrega as ferramentas quando nasce. Feedback enviado à Anthropic.

Lição operacional: **o que só existe no chat está a um clique de sumir.**
Decisão nova → escrever em `docs/` no mesmo dia. Este arquivo é o exemplo.
