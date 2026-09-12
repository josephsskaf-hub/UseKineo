# DECISÃO — Pente fino de $0 nos motores e a leva de qualidade (12/09/2026)

Ordem do fundador (12/09 00:00): "cinco ações voltadas a melhorar a qualidade
dos renders, aqui nesta sessão" + "pente fino em todos os motores por dry-run"
+ "guardião dos próximos 20 vídeos". Preço do clipe: 5 créditos MANTIDO.

## O pente fino de $0 (12/09 00:10–00:40 BRT, tudo estornado)

Mesmo roteiro (Tomás, o faroleiro, 138 palavras, 1ª pessoa), 60 s, "Use my
script as is":

| motor | veredito | por quê |
|---|---|---|
| Kling 3 | PASS | presenter · onyx masculino idoso · 2 diálogos · plano 66 s · mudo 0 |
| MiniMax H3 | PASS | idem |
| Omni Flash | PASS | idem, mas ficha "late 60s" lida como adult (velocidade 1,0) → **consertado** |
| Seedance 1.5 | **FAIL** | 138 palavras = 44,5 s a 3,1 pal/s (clássico); o compose REESCREVERIA o "as is" (−26%) |
| Kling 2.5 | **FAIL** | idem |
| Veo 3.1 | **FAIL** | idem (footage 56 s) |
| Seedance, modo IA | **FAIL** | escritor entregou 74 palavras (24 s) para 60 s — o mesmo defeito do Kineo 1 de 11/09, não plugado no clássico |
| Kineo 1, modo IA | **FAIL** | faixa 27-35 pedida, gpt-4o entregou 15-20/cena (105 palavras) |

Achado colateral: o prompt de cena chamava o Tomás de **"ás"** — o filtro de
cenário (rotação 3 do vigia) usava `[A-Z][a-z]` sem Unicode.

Antes de hoje o dry-run só existia para Kling 3/H3/Omni: nos clássicos o flag
seguia para o POST pago. Agora `dry_run:true` cobre os 7 motores (Kineo 1
incluído) e devolve a régua clássica + o risco de reescrita do compose.

## As cinco ações (todas executadas nesta sessão)

1. **Pente fino de $0 em todos os motores** — validador estendido aos clássicos
   (`lib/cinematic/classicDryRun.ts`, ganchos em generate-video-cinematic e
   generate-video-fast); resultados acima.
2. **Guardião "os próximos 20 filmes"** — rotina `kineo-proximos-20-filmes`
   (a cada 2 h, ímpares :45): o que a pessoa escreveu, o que clicou, o que saiu,
   link do MP4, nota e "coerente?", em `docs/PROXIMOS-20-FILMES-2026-09-12.md`.
3. **"Use my script as is" literal** — o compose lê `verbatim` da resposta
   assinada do claim e pula o escalador e a correção de ritmo; o Kineo 1
   verbatim viaja com `speed` padrão 1. Decisão (a) do vigia: o filme pode sair
   mais curto que o botão; o portão de narração continua avisando antes.
4. **Voz na língua do texto** — `lib/textLanguage.ts` (en/pt/es por vocabulário
   funcional); escolha explícita vence, padrão "en" cede ao texto claro; vale
   para o escritor clássico (campo 8), o planner hollywood e o Kineo 1. Evento
   `narration_language_autodetected`.
5. **Cron enxerga cena morta** — `collectFinishedClips`: cena COMPLETED cujo
   `result()` falha é morta (não "rodando"); claim com 2 h+ trata cena na fila
   como morta; `pending` com 45 min+ vira `stranded_outcome` (`pending_stale`).
   O H3 de 11/09 (4/6 prontas, 51 min, estorno) teria saído com 4 cenas.

Extras da mesma leva: escritor clássico recebe faixa de palavras + idioma
(`lib/cinematic/sceneWords.ts`); segunda passada (gpt-4o-mini) reescreve só as
cenas curtas quando a soma fica abaixo de 85% do piso; filtro de cenário com
classes Unicode; "in his late 60s" = idoso.

## Prova

`scripts/test-qualidade-classicos-2026-09-12.mjs` (29): libs executadas
(idioma, expansão com openai falso, coletor do cron com fal falso — o caso do
walid dá ready 4/6 com dead=2), rotas e compose por âncora. Guardiões das
rotas/cron verdes; vermelhos herdados da main pristina: clique-perdido,
data-cache-no-store, leva-confiabilidade, porta-email, stranded-extra-attempt,
stranded-email-dedupe (2), visual-contract (crash), narracao-degrau,
scene-disposition, multiformato, alvo-fantasma, espiral-recusa, preco-visivel.

⚠ `test-despacho-vazio` 8.2 ("não toca lib/cinematic e lib/hollywood") é a
trava de caminhos da sprint de 04/09, medida sobre o diff não commitado; esta
leva toca os dois de propósito, por ordem explícita do fundador de 11-12/09
(motores). Fica registrado, não escondido.

## Para o fundador

- Nada de preço mudou. Nenhum render pago foi feito.
- O próximo Seedance/Kineo 1 em modo IA nasce com a fala do tamanho certo; o
  próximo "as is" sai com o texto da pessoa, palavra por palavra.
- Quem escrever em espanhol/português com o seletor no padrão ouve a narração
  na própria língua.

## Prova no ar (bedb21fb, 12/09 ~01:35 BRT, tudo a $0)

| motor | antes | depois |
|---|---|---|
| Kineo 1, modo IA, 60 s | 105 palavras (34 s) | **184 palavras, 59,4 s — PASS** |
| Seedance 1.5, modo IA, 60 s | 74 palavras (24 s), "ás" no prompt | **203 palavras, 65,5 s — PASS**, Tomás inteiro |
| Kineo 1, texto em espanhol, seletor "en", 35 s | narração em inglês | **narração em espanhol**, 116 palavras, PASS |
| Seedance/Kling 2.5/Veo, "as is" 138 palavras, 60 s | compose reescreveria | texto literal (sai ~45 s; o dry-run avisa) |

Evento narration_language_autodetected gravado na prova. Nenhum render pago.
