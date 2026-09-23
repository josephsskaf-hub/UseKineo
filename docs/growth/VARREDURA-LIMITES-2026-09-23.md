# Varredura de limites desalinhados — 23/09/2026

Pedido do fundador (23/09, caso mayankkuntal77): "arrumar de uma forma em que as pessoas já cheguem com a gente já
adiantando o problema delas". Camada 1 da prevenção: achar, sem cliente nenhum, todo lugar onde uma etapa ACEITA o
que a seguinte RECUSA ou TROCA em silêncio (texto, duração, idioma, formato, motor × modo × plano).
Método: 3 varreduras de código em paralelo (só leitura) + medição no banco (paredes 4xx por pessoa, 30 d) +
conferência manual dos achados graves antes de agir.

## O que o banco mostrou (30 d, `generation_stage_error` 4xx, causa)

| Parede | Pessoas | Nunca tiveram filme |
|---|---|---|
| narration_too_short | 97 | 27 |
| compose_daily_free_limit | 10 | 1 |
| fast_dispatch_not_ok | 6 | 3 |
| prompt_too_long | 4 | 2 |

`narration_too_short` desde 20/09 é quase só **Kineo 1 a 35 s** (21-22/09: 9/dia, todos fast/35). Onde o modo é
conhecido, 57 tentativas eram "IA estrutura" (roteiro escrito por NÓS) contra 8 literais. Piso de 35 s: o portão não
tem para onde descer e recusa um roteiro de 32 s para 35 s. Conserto na rota do Kineo 1 (trava 8.2) — ver "Aguarda".

## Consertado neste lote (fora da trava 8.2) — guardião `scripts/test-varredura-limites-2026-09-23.mjs`

1. **"Use my script as is" em prosa no Kineo 1 era reescrito.** O navegador nunca mandava `script_mode`; o conserto do
   caso Emily (22/09) só valia no robô de resgate. Agora vai no envio.
2. **Kineo 1 cobrava a duração do seletor, não a do filme.** A rota desce/sobe a duração para caber no roteiro e
   devolve `duration`; o cliente passa a adotá-la (montagem, desbloqueio, checkpoint). Evento
   `fast_duration_adopted_from_route`.
3. **Resgate de aba fechada recebia o texto da tela** (o longo); acima de 5.000, descartado em silêncio. Agora recebe
   o texto enviado.
4. **Motores de IA recusavam 12.001–20.000 caracteres** que o Studio aceita no modo ideia. O Diretor conhece o teto
   (12.000, espelho do literal da rota, conferido pelo guardião) e o /generate condensa antes do envio. Alvo do
   condensado ≤ 4.500 (cabe na resposta do modelo).
5. **Modo clipe:** Studio mostrava teto 20.000 e o formato 4:5; a rota do clipe aceita 6.000 e só 9:16/16:9/1:1
   (4:5 saía 9:16 cobrado). Fonte única `CLIP_PROMPT_MAX_CHARS`/`CLIP_ASPECTS` em lib/analyzeLimits; 4:5 some no modo
   clipe; teto conferido antes de gastar; a rota diz o número.

**Reembolso (defeito nosso, `admin_credits_granted`, campanha `varredura_limites_20260923`):** 54 cr para 5 pessoas
que pagaram a duração pedida por um filme encurtado — axel.dickburt +41 (Veo 60→35 s, pagou 100, real 59),
deanwiegand2709 +5, drniravkumarrjoshi +4 (2 filmes), pav359236 +2, balaj.dxb +2.

## V1 — AUTORIZADO E FEITO (fundador: "V1", 23/09) — trava 8.2 em app/api/generate-video-fast

Roteiro marcado vindo do modo "IA estrutura" (escrito por NÓS) que não enche a duração pedida deixa de ser lido palavra
por palavra e vira o TEMA do escritor de cenas da rota, que dimensiona a fala pela duração (`V1-ROTEIRO-NOSSO-CABE`).
Roteiro literal continua intocado. Medição: evento `ai_script_rewritten_to_fit`; esperado: `narration_too_short` com
`engine=fast` no modo ai cair a ~0 e o 1º filme sair sem tela de falha. Depende do lote 1 (o cliente passou a mandar
`script_mode`). Guardião: scripts/test-varredura-limites-2026-09-23.mjs (bloco V1, executa a regra com 5 casos + 3 mutantes).
As travas test-memoria-episodio e test-caixa-vazia acusam o toque em `generate-video-` só enquanto não commitado (diff
contra HEAD) — esperado, autorizado.

## Aguarda "vai" nominal do fundador (trava 8.2)

| # | Onde | Defeito | Medido |
|---|---|---|---|
| V1 | `generate-video-fast` portão de narração | Kineo 1 a 35 s recusa roteiro de 24–33 s (piso sem degrau abaixo); roteiro é nosso na maioria | 97 pessoas/30 d, 27 sem filme |
| V2 | `generate-video-cinematic` custo | preço calculado ANTES de "duração segue o roteiro"; filme encurtado cobra a duração pedida | 1 caso (Axel, reembolsado) |
| V3 | `generate-video-fast:733`, `generate-video-cinematic:3068/3153`, `lib/hollywood/router.ts:572` | escritor de cenas lê só os primeiros 1.200 caracteres (Hollywood 600): resto do briefing ignorado | explica parte da coerência 55 do caso Mayank |
| V4 | `generate-video-fast` recuperação no servidor + `lib/fastAiHook`/`fastAiClips` chamados pela rota | Kineo 1 em 16:9/1:1: cenas geradas sempre 9:16; filme resgatado volta a 9:16 | a medir |
| V5 | `generate-video-cinematic:1515` | Hindi etc. + Kling 3/H3 morre DEPOIS da análise (Studio só avisa) | a medir |
| V6 | `lib/compose.ts` | narração clássica cortada em 3.800 caracteres; fonte de legenda "herdada" no desbloqueio | suspeito |

## Próximo lote sem trava (ordem por dinheiro/confiança)

- `compose/unlock` (desbloqueio PAGO da marca d'água) refaz o filme em 9:16, inglês, fonte errada (M1 idioma/formato).
- `finish-stranded-renders` e `render-recovery` perdem formato e idioma no resgate.
- `retry-hollywood-scene` refaz cena em 9:16 dentro de filme 16:9.
- Studio: Hindi + Kling 3/H3 bloquear ANTES (hoje só dica); plano/trial vs motores pagos (402 depois da análise).
- Links de Omni (pausado) caem no Kineo 1 sem aviso (arena, engineWall, EngineCycleCard); páginas /veo/<lang> entregam Seedance/Kineo 1.
- Free Kineo 1: corte de 15 s nunca avisado antes (se `KINEO_REVERSE_TRIAL_ENABLED` ligado — conferir a env).
- Retomada de render de 35 s vira 45; caminho de campanha do trial corta o texto em 1.000; apply-suggestion 35→45 e 6.000.
- Detector de idioma conhece 6 das 16 línguas; escolher inglês explicitamente não se distingue do padrão.

## Camadas seguintes da prevenção (propostas ao fundador em 23/09)

2. Clientes de mentira: ~30 textos realistas e esquisitos passando todo dia pelo caminho $0 (dry-run/análise/Diretor).
3. Alarme de causa NOVA: avisar na primeira ocorrência de um `reason` nunca visto (ou que voltou), não por volume.
