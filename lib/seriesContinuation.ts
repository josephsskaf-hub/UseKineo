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
