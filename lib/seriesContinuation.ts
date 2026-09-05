const MAX_SERIES_SEED_LENGTH = 180

export type SeriesContinuationSource =
  | 'done_screen'
  // sprint-retencao #2 (2026-09-04) — a MESMA porta, no primeiro viewport.
  // Medido em 30 dias (externos): 413 pessoas chegaram na tela de filme
  // pronto, 382 receberam a prateleira de tema NOVO (`next_shorts_shown`) e
  // so 49 chegaram a VER o botao de continuar a propria historia
  // (`series_continue_seen`): 93% recebem "troque de assunto", 12% recebem
  // "continue". E continuar e o que preve pagamento — 58 cliques em 30d
  // viraram 30 filmes em 24h (52%, contra ~19% de segundo filme na base).
  // Fonte propria para que a comparacao topo x rodape exista no banco.
  | 'done_screen_top'
  | 'generate_recent_video'
  // sprint-retencao #3 (2026-09-04) — A CAIXA VAZIA DE QUEM VOLTA.
  // Medido em 30 dias (externos): 319 pessoas fizeram EXATAMENTE 1 filme;
  // 103 delas VOLTARAM a tela de criacao e so 21 apertaram gerar de novo.
  // As outras 82 encontraram um campo em branco pedindo uma ideia nova.
  // A porta da serie e a peca mais eficiente da casa: dos 58 primeiros
  // cliques em 30d, 48 vieram de gente com 1 filme e 29 (60%) entregaram
  // outro filme em 24h — contra 6,6% de base. So que ela morava DEPOIS do
  // compositor, dentro de Recent Videos, e sem evento de exposicao.
  // Fonte propria para separar a volta a tela do fim do filme.
  | 'composer_empty'
  | 'history_milestone'
  | 'history_video_card'
  | 'landing_resume_strip' // KINEO-FAIXA-CONTINUAR-2026-09-01
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
  // KINEO-SPRINT-V1V4-2026-09-01 (#25) — o `downgraded_loss` e o e-mail que
  // alcanca MAIS gente de 1 video (200 das 285 em 30d) e o unico caminho que
  // ele oferecia era /pricing. Esta fonte identifica o segundo caminho, o de
  // fazer o episodio 2 do tema da propria pessoa.
  | 'lifecycle_loss_email'
  // KINEO-SPRINT-V1V4-2026-09-01 (#26) — o `ending_soon` e o SEGUNDO e-mail
  // que mais alcanca quem fez 1 video (184 das 285 em 30d) e, no ramo de quem
  // JA fez video, tambem oferecia um unico caminho: /pricing. Fonte propria
  // para nao misturar o CTR dele com o do `downgraded_loss`.
  | 'lifecycle_ending_email'
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
  // sprint-assinaturas #24 (02/09): e-mail "Your Short is ready" — o pico de
  // boa vontade; assinante e trial com saldo recebem o episodio 2 ali.
  | 'video_ready_email'
  // sprint-assinaturas #1 (05/09) — a MESMA porta, no ramo de saldo
  // DESCONHECIDO. Fonte propria porque e ela que prova o conserto: ate 05/09
  // esse ramo nao tinha porta nenhuma, e o evento de chegada
  // (series_continuation_landed) so carrega `source` — sem fonte propria o
  // antes/depois desta correcao seria impossivel de contar.
  | 'video_ready_unknown_balance'

// ═══ A3 (03/09/2026) — o botao "Build the next episode" e a maquina da 2a compra ═══
//
// Medido no banco (contas externas): 27 pessoas usaram o botao de serie e 3
// pagaram (11,1%), contra 12 pagantes em 751 pessoas com filme (1,6%) — quem
// faz serie converte ~7x melhor. E 9 de 43 continuacoes (21%) nasceram com o
// ASSUNTO destruido, porque a ordem inteira do gerador virava `videos.topic`
// e `videos.title` (topic cortado em ~120), e o clique seguinte usava o TITLE
// como semente: a semente do episodio 3 era a ORDEM do episodio 2, cortada no
// meio da palavra e com `. Ke` (inicio de ". Keep the topic") colado no fim.
//
// Regra nova, em ordem: DESANINHAR (tirar cabeca e cauda da ordem, quantas
// vezes for preciso), tirar rotulo (`Title:`), matar semente degenerada
// (`Untitled Short`, `5 shocking facts about`), e so entao cortar em 180 —
// em fronteira de palavra, nunca no meio.

const MAX_UNNEST_ROUNDS = 8
/** Piso de palavras. Fica em 1 DE PROPOSITO: medido no banco, so 9 dos 1.184
 *  filmes entregues tem titulo de uma palavra so — e "Chernobyl" ou "Pompeii"
 *  sao assunto de serie perfeitamente bom. Quem mata a sobra de marcador de
 *  verdade e a regra da palavra pendurada ("5 shocking facts about", que tem 4
 *  palavras), nao a contagem. Subir para 2 tiraria o botao de 9 filmes reais
 *  sem pegar nenhum caso que as outras regras ja nao peguem. */
const MIN_SEED_WORDS = 1

/** Cabeca da ordem antiga (v1, ate 03/09). As aspas ja foram removidas antes. */
const LEGACY_ORDER_HEAD = /^(?:create the next episode in the same short series about\s*)+/i

/** Rotulos que o titulo/roteiro trazem grudados no assunto ("Title: X"). O
 *  loop de desaninhamento repete este strip, entao `Topic: "Topic: "X` limpa. */
const HEAD_LABEL = /^(?:(?:title|t[ií]tulo|tema|topic)\s*:\s*)+/i

/**
 * Caudas de andaime que ficam coladas no assunto — inteiras OU cortadas em
 * qualquer ponto pelo truncamento de 120/180 (`. Ke`, `. Keep the topic and
 * forma`…). Cada entrada e [texto, tamanho minimo do fragmento aceito]: a
 * cauda com ponto aceita 4 chars (`. Ke` e o caso real do 03/08); as caudas
 * "peladas" exigem 10 para "Secrets You Should Keep" nao perder o "Keep".
 */
const SCAFFOLD_TAILS: ReadonlyArray<readonly [string, number]> = [
  ['. Keep the topic and format recognizable, but use a completely new hook, new facts, and a fresh payoff. Do not repeat the previous episode.', 4],
  ['. This is the next episode in the same Short series: same subject, same format, a completely new hook, new facts and a fresh payoff. Do not repeat the previous episode.', 4],
  ['Keep the topic and format recognizable, but use a completely new hook, new facts, and a fresh payoff. Do not repeat the previous episode.', 10],
  ['This is the next episode in the same Short series: same subject, same format, a completely new hook, new facts and a fresh payoff. Do not repeat the previous episode.', 10],
  ['Do not repeat the previous episode.', 10],
]

/** Espelho do PROMPT_SCAFFOLDING de lib/publicVideos.ts (nao importamos para
 *  este modulo continuar sem import e compilavel sozinho no teste). Se o que
 *  sobrou depois de desaninhar ainda casa aqui, nao e assunto de ninguem. */
const RESIDUAL_SCAFFOLDING =
  /(next episode in the same short series|keep the topic and format recognizable|completely new hook|do not repeat the previous episode)/i

const UNTITLED = /^(?:untitled(?:\s+(?:short|video))?|sem\s+t[ií]tulo)$/i

/** Palavra final que pede complemento = a frase foi cortada antes do assunto
 *  ("5 shocking facts about", 03/09). */
const DANGLING_WORDS = new Set(['about', 'sobre', 'de', 'the', 'a', 'an', 'of', 'com', 'para', 'and', 'to'])
const TRAILING_PUNCT = /[.,:;!?\-–—…]+$/

function stripScaffoldTail(value: string): string {
  const lower = value.toLowerCase()
  for (const [tail, minLen] of SCAFFOLD_TAILS) {
    const tailLower = tail.toLowerCase()
    const max = Math.min(tailLower.length, lower.length)
    for (let len = max; len >= minLen; len -= 1) {
      if (lower.endsWith(tailLower.slice(0, len))) return value.slice(0, value.length - len).trimEnd()
    }
  }
  return value
}

function lastWord(value: string): string {
  const words = value.split(' ')
  return words[words.length - 1] ?? ''
}

function endsWithDanglingWord(value: string): boolean {
  return DANGLING_WORDS.has(lastWord(value).replace(TRAILING_PUNCT, '').toLowerCase())
}

function endsDangling(value: string): boolean {
  return /[:,]$/.test(value) || endsWithDanglingWord(value)
}

function isDegenerate(value: string): boolean {
  if (!value) return true
  if (UNTITLED.test(value)) return true
  if (RESIDUAL_SCAFFOLDING.test(value)) return true
  if (endsDangling(value)) return true
  if (value.split(' ').length < MIN_SEED_WORDS) return true
  return false
}

/** Tira cabeca, cauda e rotulo ate nao mudar mais. Cada volta que muda algo
 *  ENCURTA a string, entao termina sempre; o teto e cinto, nao freio. */
function unnestSeed(value: string): string {
  let cur = value
  for (let round = 0; round < MAX_UNNEST_ROUNDS; round += 1) {
    let next = cur.replace(LEGACY_ORDER_HEAD, '').trim()
    for (let guard = 0; guard < 32; guard += 1) {
      const stripped = stripScaffoldTail(next)
      if (stripped === next) break
      next = stripped
    }
    next = next.replace(HEAD_LABEL, '').trim()
    if (next === cur) return cur
    cur = next
  }
  return cur
}

/** Corte em 180 na fronteira: ultima frase inteira se ela guarda ao menos
 *  metade do limite (senao "Mr." viraria a semente), senao ultimo espaco. */
function cutAtBoundary(value: string): string {
  if (value.length <= MAX_SERIES_SEED_LENGTH) return value
  const window = value.slice(0, MAX_SERIES_SEED_LENGTH)
  let cut = ''
  const sentence = window.match(/^([\s\S]*[.!?…])(?=\s)/)
  if (sentence && sentence[1].length >= MAX_SERIES_SEED_LENGTH / 2) cut = sentence[1]
  if (!cut) {
    const lastSpace = window.lastIndexOf(' ')
    cut = lastSpace > 0 ? window.slice(0, lastSpace) : window
  }
  cut = cut.trim()
  // A palavra pendurada no corte NAO e sinal de fragmento do banco (a entrada
  // era longa e inteira): tira-la e melhor que devolver ''.
  for (let guard = 0; guard < 3 && cut && endsDangling(cut); guard += 1) {
    cut = cut.replace(/[:,\s]+$/, '')
    if (endsWithDanglingWord(cut)) cut = cut.slice(0, Math.max(0, cut.lastIndexOf(' ')))
    cut = cut.replace(/[:,\s]+$/, '').trim()
  }
  return cut
}

export function normalizeSeriesSeed(value: string | null | undefined): string {
  const flat = (value ?? '')
    .replace(/\s+/g, ' ')
    .replace(/["“”]+/g, '')
    .trim()
  const seed = unnestSeed(flat)
  if (isDegenerate(seed)) return ''
  const cut = cutAtBoundary(seed)
  if (cut !== seed && isDegenerate(cut)) return ''
  return cut
}

/**
 * O assunto na FRENTE, a ordem atras e subordinada. Antes o gerador recebia
 * uma ordem com o assunto no meio dela. A frase continua casando com 3 das 4
 * alternativas do PROMPT_SCAFFOLDING (lib/publicVideos.ts) — e ele que impede
 * a ordem de virar <h1> e <meta description> no sitemap (incidente de 11/08).
 * Se mudar este texto, rode scripts/test-serie-episodio-2.mjs: ele le o regex
 * REAL do arquivo e prova que ainda casa.
 */
export function buildSeriesContinuationPrompt(value: string | null | undefined): string {
  const seed = normalizeSeriesSeed(value)
  if (!seed) return ''
  return `Topic: "${seed}". This is the next episode in the same Short series: same subject, same format, a completely new hook, new facts and a fresh payoff. Do not repeat the previous episode.`
}

export function buildSeriesContinuationHref(
  value: string | null | undefined,
  source: SeriesContinuationSource,
  // sprint-retencao #2 — o episodio 2 herdava o MOTOR do episodio 1 e nao
  // herdava a pergunta "o saldo ainda paga esse motor?". Caso vivo de 04/09
  // (pessoa d20530865c): primeiro filme no Seedance (15cr), sobraram 10,
  // clicou continuar as 10:45 e as 10:51 levou `upgrade_modal_opened`
  // reason=trial_spent com 10 creditos na mao. Quando quem chama PROVA que o
  // saldo nao cobre e que a vaga do motor gratis esta livre, o link carrega o
  // motor acessivel — o mesmo `?engine=` que o e-mail de momentum ja usa
  // (rodada #16). Sem prova, o parametro nao entra e o link e byte a byte o
  // de hoje.
  opts?: { engine?: string | null },
): string {
  const prompt = buildSeriesContinuationPrompt(value)
  if (!prompt) return '/studio'
  const params = new URLSearchParams({
    prompt,
    autoanalyze: '1',
    series: '1',
    continuation_source: source,
  })
  const engine = typeof opts?.engine === 'string' ? opts.engine.trim().toLowerCase() : ''
  if (engine) params.set('engine', engine)
  return `/studio/create?${params.toString()}`
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
/** Porta de servidor do botao de episodio 2 em E-MAIL (as telas de dentro do
 *  app nao passam por aqui: elas sempre tem sessao viva). Ver o cabecalho de
 *  app/api/episode-link/route.ts para a medicao que a criou. */
export const SERIES_EMAIL_DOOR_PATH = '/api/episode-link'

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
  // KINEO-PORTA-EPISODIO-EMAIL-2026-09-05 — com tema, o botao passa pela
  // porta de servidor (app/api/episode-link). Motivo medido em producao: as
  // SETE fontes de dentro do app produzem aterrissagem e as QUATRO de e-mail
  // marcam ZERO em 30 dias, com ~1.000 e-mails carregando o botao. O clique
  // de inbox chega SEM cookie de sessao (webview do Gmail, outro aparelho,
  // aba anonima), e a viagem /generate -> /studio/create terminava em
  // `/signup`: um formulario de CRIAR CONTA para quem JA TEM conta. A porta
  // conta o clique (degrau que nunca existiu entre 'enviado' e 'aterrissou')
  // e manda para /login com o destino inteiro preservado.
  //
  // Sem tema a URL e byte a byte a de antes — o contrato do #24 (nunca
  // inventar o assunto do video da pessoa) continua valendo.
  if (!prompt) return qs ? `${base}/generate?${qs}` : `${base}/generate`
  return `${base}${SERIES_EMAIL_DOOR_PATH}?${qs}`
}
