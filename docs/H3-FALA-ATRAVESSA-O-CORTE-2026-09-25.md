# H3 — a fala atravessa o corte (25/09/2026)

Pedido do fundador (25/09, 14:40 BRT): "motor h3 com problema, preciso que você arrume ele e deixe ele dentro de
todos os padrões".

## O caso

Render **7127d8b4** (fundador, 25/09 17:18 UTC): furacão Polo, roteiro pronto de 191 palavras, "Use my script as
is", 60 s, H3. Linha do tempo:

| hora (UTC) | o que aconteceu |
|---|---|
| 17:18:28 | claim de 45 cr; planejador: 12 cenas [4,9,6,11,7,10,10,9,5,10,7,7] s = 95 s, custo estimado US$ 5,70 na fal |
| 17:19:53 | 12/12 cenas aceitas pela fal (H3 image-to-video) |
| 17:19:58 | cena 9 morreu na fal (422 terminal, "unclassified"); a tela declarou `failed` e a retentativa (17:23:51) trouxe o clipe |
| 17:24:25 | 12 clipes prontos → `/api/compose` |
| 17:24:25 | **compose: 422 `scene_speech_exceeds_footage`** — cena 7: fala medida 10,9 s + 0,4 s de respiro num clipe de 10 s (×1,13 > ×1,10 do FALA-CABE) |
| 17:26:20 | 45 cr estornados; os ~US$ 6 pagos à fal (12 clipes + 1 retentativa) foram jogados fora |
| 17:26:22 | na tela: "failed" sem motivo; no banco: `generation_stage_error` com `reason=unreported_stage_failure` (sintetizado pela transição de fase) |

Zero eventos com `scene_speech_exceeds_footage` em 30 dias: a recusa só existia no log da Vercel.

## A causa raiz (quatro réguas para a mesma fala)

A cena 7 ("Its pressure dropped to eight hundred ninety-two millibars. Only one Pacific hurricane in recorded history
has ever gone lower: Patricia, in 2015.", 22 palavras) nasceu com 11 s (`round(22/2,3)+1`). No mesmo escritor:

1. **KINEO-APARA-RESPIRO** (C1) media a folga **a 2,3 pal/s fixo**: 11 − 22/2,3 = 1,43 s → "folgada" → tirou 1 s;
2. **KINEO-APARA-NO-RITMO** e a apara final mediam no ritmo da voz (2,07) — mas a cena já tinha 10 s;
3. **reguaDoFilme** (proporcional, 23/09) aprovou o plano;
4. a **montagem** mediu a voz real (luxury-narrator, 0,9 × 2,3 = 2,07 pal/s): 10,9 s. 10,9 + 0,4 = 11,3 > 10 × 1,1.

A régua mais frouxa decidia primeiro e a mais dura decidia por último, depois de pagar. O ensaio de $0 tinha a mesma
frouxidão (`fala > segundos + 1`, a 2,3): aprovava a cena.

## O conserto — em DUAS entregas, por causa da trava 8.2

`app/api/generate-video-cinematic/route.ts` é arquivo da trava 8.2 (docs/coordination/motores/CLAUDE.md: "publicar é
código de produto em route.ts → palavra do fundador"). Por isso o conserto sobe em dois commits:

- **Entrega 1 (sobe agora, fora da trava):** montagem + tela + guardiões. Sozinha ela já salva o Polo: a fala que o
  escritor deixou 0,9 s maior que o clipe atravessa o corte em vez de matar o filme.
- **Entrega 2 (segurada na branch `codex/h3-mesma-regua-do-escritor-0925`, sobe com a palavra do fundador):** o
  escritor mede no ritmo da voz e o ensaio de $0 usa a tolerância da montagem — a parede volta a nascer no escritor.

### Entrega 1 — Montagem: `app/api/compose/route.ts` (KINEO-FALA-ATRAVESSA-O-CORTE)
- **Parte 1:** dentro de ×1,10 a cena é re-sintetizada um fio mais rápida, como o FALA-CABE de 15/09 já fazia; acima do
  teto ela fica como está e quem decide é a travessia.
- **Parte 2:** antes do 422, sobre a timeline final, cada fala que ainda passa do slot atravessa o corte como num
  documentário: **J-cut** (começa na cauda muda da cena anterior) e **L-cut** (avança sobre a cabeça da seguinte, cuja
  narração espera, guardando respiro antes E depois dela). Respiro de 0,4 s de preferência nos dois lados; 0,2 s no
  aperto; nunca menos — inclusive antes de um diálogo/host (voz nativa no primeiro frame) e no fim do filme. Só entre
  cenas narradas por TTS (support/cinematic com narração medida); diálogo/host nunca cede nem recebe. O slot da imagem
  não muda (H3 nunca encolhe; o clipe nunca passa da footage — `loop:true` repetiria o começo).
- Revisão adversarial (3 agentes, 25/09) encontrou 2 defeitos na 1ª versão da travessia — a narração adiada terminava
  colada na próxima voz; um J-cut podia terminar no primeiro frame de um diálogo — e 3 arestas (aceleração ×1,10
  deixando 0,1 s de respiro; estimativa da folga ignorando a apara do TAIL; fim de filme no último frame). Todos
  fechados e cobertos pelo guardião antes de subir.
- **Parte 3 (2ª entrega da montagem, depois da revisão):** quando a travessia recusa numa cena que passou do teto e a
  sobra a ×1,10 cabe no vão que ELA mediu (`capacidade`), a cena é re-sintetizada a ×1,10 e encolhe/cresce, TAIL e
  travessia rodam de novo do slot pós-verificação — uma aceleração por cena, e o log e a recusa vêm da mesma conta
  (a 1ª versão estimava a folga antes do TAIL e dos L-cuts: gastava síntese à toa ou deixava de salvar filme que cabia).
- A recusa honesta continua para quem não tem de onde tirar — agora com **`compose_refused`** (motivo, cena, segundos
  do clipe e da fala, estouro) e mensagem que nomeia a cena.

### Entrega 1 — Tela: `app/(dashboard)/generate/GenerateClient.tsx` (KINEO-RECUSA-COM-NOME)
Os três ramos que aceitam a recusa de qualidade (`acceptQualityFailure`) passam a relatar a causa
(`trackGenerationFailure` com o `reason` do 422) ANTES da saída, que continua um `return` seco. Nunca mais
`unreported_stage_failure` para um 422 com nome.

### Entrega 2 — Escritor: `app/api/generate-video-cinematic/route.ts` (KINEO-MESMA-REGUA-DO-ESCRITOR)
- A apara do respiro do C1 mede no **ritmo da voz** (`ritmoC1`, um MIRROR da conta de `ritmoVoz`; o guardião compara
  os dois textos). No Polo: folga da cena 7 = 0,37 s → não é aparada → fica com 11 s.
- FRASE-MAIOR faz a cena crescer até a fala inteira no ritmo da voz (`ceil(palavras/ritmo)`), até o teto da família;
  acima do teto, o teto-rede divide na frase (nada recusa aqui).
- O ensaio de $0 usa a tolerância REAL da montagem: `fala + 0,4 > segundos × 1,1` = FAIL (espelho de
  `FALA_CABE_RESPIRO_S`/`FALA_CABE_MAX_FATOR`; o guardião compara as constantes).
- As aparas de 16/09 e 23/09 (> 1,0 s) ficam como a rotação anterior deixou.

## Prova
- **Entrega 1:** `scripts/test-h3-fala-atravessa-o-corte-2026-09-25.mjs` (40): reproduz a recusa na origin/main com o
  mundo do Polo; no candidato a cena 7 acelera e o filme segue; com TTS fora na correção a fala atravessa (J 0,42 s +
  L 0,47 s, narração da 8 adiada 0,87 s e ainda com 0,4 s antes da 9); o Polo com a voz real (6 cenas em cascata)
  fecha; sem folga ou entre diálogo/host a recusa continua com evento; J-cut antes de diálogo guarda 0,2 s; L-cut
  sobre a última cena nunca termina no último frame; os 3 cenários da revisão (nenhuma síntese desperdiçada, o filme
  que cabe é entregue); fuzz 300 filmes com respiro ≥ 0,2 s em TODA fronteira; tela. `scripts/test-fala-cabe-2026-09-15.mjs` re-ancorado
  (23/23): "TTS fora → recusa" virou "TTS fora → a fala atravessa"; o estouro de 45 % continua recusado.
  `test-quality-route-integration` (363) e `test-quality-failure-ui` (141) verdes com o contexto novo.
- **Entrega 2:** `scripts/test-h3-mesma-regua-do-escritor-2026-09-25.mjs` (12): reproduz a apara a 2,3 na origin/main
  (cena 7: 11 → 10 s); no candidato fica com 11 s e as 12 cenas guardam a fala inteira a 2,07; fuzz 300 planos;
  espelhos. `test-fala-maior-que-a-cena` re-ancorado à régua nova.
- Vizinhos verdes nas duas: test-h3-verbatim-corte (fuzz 300), test-h3-palavras, test-enche-silencio,
  test-silencio-na-tela, test-regua-do-escritor, test-fidelidade-h3, test-auditoria-motores, test-compose-falha-com-nome,
  test-cena-presa, test-juiz-ve-a-cena-1, test-regua-unica-e-entrega-medida. `test-silencio-na-cena` está vermelho na
  origin/main também (herdado, âncora de texto de outra rotação). tsc limpo.

## O que NÃO mudou
- Régua de silêncio (1,5 s/cena; 8 s por 60 s de filme), verbatim intocado, H3 nunca encolhe, custo por segundo.
- `lib/compose`, `lib/hollywood/`, `lib/cinematic/` (trava 8.2): intocados nas duas entregas.

## Padrões do H3 conferidos hoje
| padrão | estado |
|---|---|
| recusa antes de pagar, nunca depois | ✅ montagem atravessa o corte antes de recusar (entrega 1); escritor na mesma régua (entrega 2, segurada) |
| nenhuma palavra cortada, verbatim intacto | ✅ |
| cena presa/morta na fal → retentar a cena | ✅ (22/09) — hoje a cena 9 morreu e voltou em 4 min |
| tela diz o motivo | ✅ painel de qualidade + evento com `reason` |
| evento no banco com o motivo | ✅ `compose_refused` + `generation_stage_error` com reason |
| juiz de coerência vê todas as cenas | ✅ (22/09) |
| filme reaproveita clipes pagos numa retomada | ✅ `hollywood_resume` (2 h) — id da cena retentada corrigido à mão para o Polo |
| custo | ⚠ 60 s pedidos com 191 palavras = 95 s de H3 = US$ 5,70 na fal por 45 cr. Decisão de preço é do fundador. |

## Remontar o Polo sem pagar a fal de novo
`hollywood_resume` guarda o plano e os 12 ids (o id da cena 9 foi trocado pelo da retentativa, 01a0d998…). Com a
entrega 1 no ar, o mesmo texto no Studio (H3, 60 s, "Use my script as is") reaproveita as 12 cenas prontas e só refaz
voz + montagem. Custa 45 cr (o render de hoje foi estornado). Aviso: numa retomada o estorno automático por qualidade
não é autorizado (`submission_uncertain` ausente na retomada) — se, contra a prova acima, a montagem recusar, o
crédito volta pelo `/admin/people`.
