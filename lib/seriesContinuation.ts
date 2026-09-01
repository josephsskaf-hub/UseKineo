const MAX_SERIES_SEED_LENGTH = 180

export type SeriesContinuationSource =
  | 'done_screen'
  | 'generate_recent_video'
  | 'history_milestone'
  | 'history_video_card'
  // KINEO-SPRINT-V1V4-2026-08-31 (#1) — a Library era a unica tela do acervo
  // sem nenhuma saida para criar; agora cada video de la tambem leva o tema.
  | 'library_video_card'
  // KINEO-SPRINT-V1V4-2026-08-31 (#2) — o marco do /history e a peca que mais
  // gera 2o video (7 de 11 cliques em 7d) e vive na tela de 23 pessoas; o
  // /studio tem 87. Mesmo padrao, onde o publico esta.
  | 'studio_milestone'
  // KINEO-SPRINT-V1V4-2026-08-31 (#3A) — a pilula flutuante de "video pronto"
  // e o unico aviso de pico de alegria que aparece em TODA pagina logada, e
  // so oferecia "Watch" ou "x". O tema do video ja viajava do servidor ate o
  // cliente (campo `title` do /api/compose/active) e era jogado fora.
  | 'render_pill'
  // KINEO-SPRINT-V1V4-2026-08-31 (#3B) — o rodape da tela de video pronto
  // renderizava `null` para o maior grupo ativado (gratuito, nao pagante,
  // render Fast). Este e o unico caminho de criacao que aquele grupo ve ali.
  | 'done_footer'
  // KINEO-SPRINT-V1V4-2026-08-31 (#4) — o aviso "seu video ficou pronto
  // enquanto voce estava fora", no TOPO da tela de criacao. Em 30 dias 160
  // pessoas o viram (`server_active_render_detected` com state='completed').
  // E o unico cartaz que pega a pessoa exatamente na VOLTA pos-video-1, com o
  // compositor logo abaixo — e as duas acoes dele ("Watch now", "Open My
  // Videos") mandavam a pessoa EMBORA da tela de criar. O `title` do video ja
  // viajava no probe /api/compose/active e era usado so como enfeite.
  | 'returning_ready_banner'
  // KINEO-SPRINT-V1V4-2026-08-31 (#8) — as miniaturas "Your latest videos" do
  // /studio. Medido no banco: das 59 pessoas externas com EXATAMENTE 1 video
  // em 7 dias, 59 passam por /studio/create e 35 passam por /studio — a
  // segunda maior superficie do cohort-alvo. Ate hoje cada miniatura era um
  // <a> unico para o MP4 cru em outra aba: beco sem saida, e a unica
  // afordancia era um :hover que nao existe em telefone. Agora cada video do
  // acervo carrega o PROPRIO tema para o episodio seguinte — nao so o mais
  // recente, como faz o marco (studio_milestone).
  | 'studio_video_tile'
  // KINEO-SPRINT-V1V4-2026-09-01 (#24) — o e-mail `send-momentum-nudge`, o
  // unico da casa escrito para mover o video 1 ate o 4. Ele ja CITA o tema no
  // texto ("Your film about X is sitting in your library") e depois joga o
  // tema fora: o botao apontava para um `/generate` PELADO. Medido no banco em
  // 30 dias: quem volta e cai no Studio em branco vira 2o video em 24% dos
  // casos (123 voltas reais -> 30 videos); quem chega pela continuacao de
  // serie vira em 53% (59 chegadas -> 31 videos). O mesmo clique, dois
  // destinos, mais que o dobro de conversao.
  | 'momentum_email'

export function normalizeSeriesSeed(value: string | null | undefined): string {
  return (value ?? '')
    .replace(/\s+/g, ' ')
    .replace(/["“”]+/g, '')
    .trim()
    .slice(0, MAX_SERIES_SEED_LENGTH)
}

export function buildSeriesContinuationPrompt(value: string | null | undefined): string {
  const seed = normalizeSeriesSeed(value)
  if (!seed) return ''
  return `Create the next episode in the same Short series about "${seed}". Keep the topic and format recognizable, but use a completely new hook, new facts, and a fresh payoff. Do not repeat the previous episode.`
}

export function buildSeriesContinuationHref(
  value: string | null | undefined,
  source: SeriesContinuationSource,
): string {
  const prompt = buildSeriesContinuationPrompt(value)
  if (!prompt) return '/generate'
  const params = new URLSearchParams({
    prompt,
    autoanalyze: '1',
    series: '1',
    continuation_source: source,
  })
  return `/generate?${params.toString()}`
}

/**
 * KINEO-SPRINT-V1V4-2026-09-01 (#24) — versao ABSOLUTA do href de continuacao,
 * para uso em e-mail (onde caminho relativo nao existe) preservando os
 * parametros de campanha que a rota ja mandava.
 *
 * Contrato deliberado:
 *  - SEM tema utilizavel devolve a mesma URL de antes (base + utm). Nunca
 *    inventamos o assunto do video da pessoa — a regra do selo honesto vale
 *    para o e-mail tambem.
 *  - os utm entram DEPOIS do prompt, entao a atribuicao de campanha continua
 *    igual e some nenhum parametro que ja existia.
 *  - funcao pura, zero import: da para provar em teste sem subir servidor.
 */
export function buildSeriesContinuationEmailUrl(
  appUrl: string,
  value: string | null | undefined,
  source: SeriesContinuationSource,
  utm: Record<string, string> = {},
): string {
  const base = appUrl.replace(/\/+$/, '')
  const params = new URLSearchParams()
  const prompt = buildSeriesContinuationPrompt(value)
  if (prompt) {
    params.set('prompt', prompt)
    params.set('autoanalyze', '1')
    params.set('series', '1')
    params.set('continuation_source', source)
  }
  for (const [k, v] of Object.entries(utm)) if (v) params.set(k, v)
  const qs = params.toString()
  return qs ? `${base}/generate?${qs}` : `${base}/generate`
}
