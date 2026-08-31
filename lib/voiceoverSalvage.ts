// ═══ sprint-v1v4 #21 (2026-08-31) — O 400 MAIS CARO DA CASA AINDA MATA ══════
//
// `voiceover_script is required.` e a pior forma de perder alguem no produto:
// a pessoa ja esperou o roteiro, ja esperou os clipes (B-roll PAGO e baixado),
// esta em `clips_ready` — e o estagio seguinte responde com uma mensagem de
// desenvolvedor. Tudo que era caro ja foi gasto; o que quebra e o barato.
//
// O QUE FOI MEDIDO (30 dias, so externos, `events`): 4 pessoas, 4 dias
// diferentes — 07/08, 11/08, 13/08 e HOJE 31/08 as 23:04 UTC. E o padrao que
// ninguem tinha visto:
//
//   TODAS as ocorrencias, sem excecao, tem `mode=fast` e `duration=45`.
//
// Quarenta e cinco e a duracao FANTASMA da rodada #20 — a que o seletor nao
// oferece desde 20/08. No caso de hoje da para ver o fantasma se mexendo
// DENTRO da mesma tentativa (`attempt_id` 530673b1): as 23:03:53 o evento
// grava `duration=45`, e 21 segundos depois, as 23:04:14, o MESMO attempt
// grava `duration=35`. O estado da tentativa mudou de duracao no meio do
// caminho, e o roteiro se perdeu na travessia.
//
// POR QUE O RESGATE DE 13/08 NAO BASTOU:
// `app/api/compose/route.ts` ja tinha uma escada de tres degraus
// (KINEO-VOICEOVER-SALVAGE-2026-08-13): saneamento estrito -> saneamento
// tolerante -> `topic`. Ela foi escrita para o caso em que o SANEAMENTO come o
// roteiro (roteiro do ChatGPT em bullets/MAIUSCULAS). Ela nao cobre o caso em
// que o texto NAO CHEGA — e a escada inteira e pulada, porque o degrau 2 so
// roda `if (rawVoiceover.trim())`.
//
// E aqui esta o defeito de diagnostico, que e o mais grave: o 400 final NAO
// GRAVA NADA. Nem log, nem evento, nem um campo dizendo se o texto chegou
// vazio ou se o limpador comeu. Tres semanas depois do conserto de 13/08, o
// produto ainda nao sabe qual das duas metades esta quebrada. Esta rodada
// conserta as duas coisas: um degrau novo e o nome da causa.
//
// O DEGRAU QUE FALTAVA — AS LEGENDAS DE CENA:
// O MESMO pedido que chega sem `voiceover_script` traz `scene_captions`: o
// texto de cada cena, que foi ESCRITO A PARTIR da narracao. Se a narracao
// sumiu mas as legendas sobreviveram, as legendas SAO a narracao, cena a cena.
// Por isso o degrau novo entra ANTES do `topic`: `topic` e a ideia crua que a
// pessoa digitou; as legendas sao o roteiro dela. Ordem final da escada:
//
//   1. saneamento estrito   (fiel, inalterado)
//   2. saneamento tolerante (fiel, inalterado)
//   3. LEGENDAS DE CENA     <- NOVO, e mais fiel que o degrau 4
//   4. `topic`              (bruto, inalterado)
//
// (!) NAO AFROUXA NADA. Todo degrau novo passa pelo MESMO limpador dos outros
// (`stripScriptMarkers`, injetado aqui para manter esta lib pura). Nenhum
// marcador, direcao de cena ou `[Pexels: ...]` chega a TTS ou a legenda por
// este caminho. Se as legendas tambem estiverem vazias, o 400 continua sendo a
// resposta certa — so que agora ele diz por que.

/** Junta as legendas de cena em uma narracao, passando pelo limpador canonico. */
export function narracaoDasLegendas(
  legendas: unknown,
  limpar: (s: string) => string,
): string {
  if (!Array.isArray(legendas)) return ''
  const partes: string[] = []
  for (const bruta of legendas) {
    if (typeof bruta !== 'string') continue
    const limpa = limpar(bruta).trim()
    if (!limpa) continue
    // Cada legenda e uma cena: vira frase. Sem isto a TTS lê tudo emendado.
    partes.push(/[.!?]$/.test(limpa) ? limpa : limpa + '.')
  }
  // Uma legenda so nao e roteiro — e o titulo da cena unica. Exigir duas
  // evita transformar "Money" em um video narrado com uma palavra.
  if (partes.length < 2) return ''
  return partes.join(' ').slice(0, 10000)
}

export type CausaDaPerda =
  | 'nunca_chegou'        // o cliente nao mandou texto nenhum
  | 'saneamento_comeu'    // veio texto, os dois limpadores devolveram vazio
  | 'sem_legendas'        // nao havia legendas de cena para resgatar
  | 'sem_topico'          // nao havia topic para resgatar

/**
 * Diz, em uma palavra, POR QUE a narracao se perdeu — a informacao que este
 * 400 nunca gravou. Devolve a lista de causas, da mais decisiva para a menos.
 */
export function diagnosticarPerda(args: {
  brutoRecebido: unknown
  legendasRecebidas: unknown
  topicoRecebido: unknown
}): { causa: CausaDaPerda; detalhes: Record<string, number | boolean> } {
  const bruto = typeof args.brutoRecebido === 'string' ? args.brutoRecebido : ''
  const brutoLen = bruto.trim().length
  const legendas = Array.isArray(args.legendasRecebidas)
    ? args.legendasRecebidas.filter((c) => typeof c === 'string' && c.trim().length > 0)
    : []
  const topico = typeof args.topicoRecebido === 'string' ? args.topicoRecebido.trim() : ''

  const detalhes = {
    bruto_len: brutoLen,
    legendas_n: legendas.length,
    topico_len: topico.length,
  }

  // A distincao que decide o proximo conserto: se o texto NUNCA CHEGOU, o
  // defeito e de ESTADO no cliente. Se chegou e sumiu, o defeito e do LIMPADOR.
  if (brutoLen === 0) return { causa: 'nunca_chegou', detalhes }
  if (legendas.length === 0) return { causa: 'sem_legendas', detalhes }
  if (topico.length === 0) return { causa: 'sem_topico', detalhes }
  return { causa: 'saneamento_comeu', detalhes }
}
