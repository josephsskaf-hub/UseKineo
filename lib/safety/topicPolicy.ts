// KINEO-MODERACAO-1410 [TRAVA 8.2 — vai do fundador 14/10] — a régua COMPLETA do texto do cliente (pura, sem import).
//
// POR QUÊ (investigação de 15/10, commit 5980f218, KINEO-MOTOR-15S-1510): a moderação do caminho do roteiro só barrava
// conteúdo SEXUAL. Violência gráfica, ódio, automutilação, instrução de arma/droga e deepfake sexual de pessoa real
// dependiam de o modelo recusar uma segunda vez — risco de marca.
//
// A REGRA — estreita de propósito. Batalha histórica, true crime, mistério, terror e documentário de guerra são o coração
// da Kineo e PASSAM. O omni-moderation dá `flagged` para história comum (medido em 14/10: 24 de 374 pedidos reais de 30
// dias, todos legítimos — Zodíaco, servos do faraó enterrados vivos, briga de rua, terror de 3h da manhã); por isso esta
// régua NUNCA lê `flagged` nem a nota genérica de `violence`, só notas específicas e altas:
//   graphic_violence  violence/graphic ≥ 0,85  (gore detalhado; o máximo REAL em 30 dias foi 0,606: true crime com cabeça decepada)
//   violent_threat    harassment/threatening ≥ 0,5 ou hate/threatening ≥ 0,4  (chamado para atacar pessoas; real: 0,020)
//   hate              hate ≥ 0,6  (ódio contra grupo; real: 0,020; documentário do Holocausto: 0,104)
//   self_harm         self-harm/intent ≥ 0,6 ou self-harm/instructions ≥ 0,4  (real: 0,005 / 0,000)
//   dangerous_instructions  illicit/violent ≥ 0,6 ou illicit ≥ 0,85  (bomba, droga; real: 0,032 / 0,169)
//   sexual_minors     sexual/minors ≥ 0,5  (no TEXTO de ideia/roteiro; real: 1 pedido, 0,764 — piada de "falo" com crianças
//                     numa cantina escolar). NÃO é o limiar de 0,02 da régua das imagens (moderationPolicy): no texto livre ele
//                     barraria "a criança esperando o protetor secar para entrar na piscina" (0,104, medido).
//   sexual_deepfake   texto pede deepfake/nudez/despir E nota sexual ≥ 0,15
//   sexual            sexual ≥ 0,5  (a Kineo não é plataforma adulta; o mesmo limiar de texto da régua de 25/09)
// Calibração (14/10): 14 controles — 5 de história/true crime/terror passam (Stalingrado, Dahmer, Holocausto, asilo
// assombrado, Ruanda), 9 proibidos barram, cada um na categoria certa. 374 pedidos reais distintos (399 com repetição) de
// 30 dias, fora as contas internas: 1 barraria (sexual_minors).

export const MODERACAO_1410_VERSAO = 'moderacao_completa_v1'

export type TopicCategory =
  | 'sexual_minors'
  | 'sexual_deepfake'
  | 'sexual'
  | 'self_harm'
  | 'violent_threat'
  | 'hate'
  | 'dangerous_instructions'
  | 'graphic_violence'

/** Ordem de gravidade: a primeira que casar é a que a pessoa lê. */
export const TOPIC_CATEGORIES: readonly TopicCategory[] = [
  'sexual_minors', 'sexual_deepfake', 'sexual', 'self_harm', 'violent_threat', 'hate', 'dangerous_instructions', 'graphic_violence',
]

export const TOPIC_THRESHOLDS = {
  graphicViolence: 0.85,
  harassmentThreatening: 0.5,
  hateThreatening: 0.4,
  hate: 0.6,
  selfHarmIntent: 0.6,
  selfHarmInstructions: 0.4,
  illicitViolent: 0.6,
  illicit: 0.85,
  sexualMinors: 0.5,
  sexual: 0.5,
  deepfakeSexual: 0.15,
} as const

/** enforce = barra; log_only = só registra content_moderation_would_block; off = não chama. */
export type TopicModerationMode = 'enforce' | 'log_only' | 'off'

/**
 * O modo vem de KINEO_MODERACAO_COMPLETA. Padrão = enforce: na medição de 14/10 a régua barraria 1 de 374 pedidos reais
 * (e era conteúdo proibido de verdade). Valor desconhecido = enforce (erro de digitação não desliga a trava).
 */
export function topicModerationMode(raw: string | null | undefined): TopicModerationMode {
  const v = (raw ?? '').trim().toLowerCase()
  if (v === 'log_only' || v === 'log-only' || v === 'log') return 'log_only'
  if (v === 'off' || v === '0' || v === 'false') return 'off'
  return 'enforce'
}

const DEEPFAKE_RE = /(?<![a-z])(?:deep[\s-]?fakes?|nudify|nudified|undress(?:ed|ing)?|unclothed|naked|nude|nudes|nsfw|topless|strip(?:ping)? (?:her|him|them)|without (?:her|his|their) clothes|sem roupas?|pelad[ao]s?|desnud[ao]s?|sin ropa)(?![a-z])/

function dobrar(t: string): string {
  return (t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

export interface TopicScoresLike {
  category_scores?: Record<string, number | undefined> | null
}

export interface TopicDecision {
  categories: TopicCategory[]
  /** As notas que decidiram (só as que importam, arredondadas — vão para o evento). */
  scores: Record<string, number>
}

const n = (s: Record<string, number | undefined>, k: string): number => Number(s[k] ?? 0) || 0

export function decideTopicModeration(result: TopicScoresLike | null | undefined, text?: string | null): TopicDecision {
  const s = result?.category_scores ?? {}
  const T = TOPIC_THRESHOLDS
  const hit = new Set<TopicCategory>()
  if (n(s, 'sexual/minors') >= T.sexualMinors) hit.add('sexual_minors')
  if (text && DEEPFAKE_RE.test(dobrar(text)) && n(s, 'sexual') >= T.deepfakeSexual) hit.add('sexual_deepfake')
  if (n(s, 'sexual') >= T.sexual) hit.add('sexual')
  if (n(s, 'self-harm/intent') >= T.selfHarmIntent || n(s, 'self-harm/instructions') >= T.selfHarmInstructions) hit.add('self_harm')
  if (n(s, 'harassment/threatening') >= T.harassmentThreatening || n(s, 'hate/threatening') >= T.hateThreatening) hit.add('violent_threat')
  if (n(s, 'hate') >= T.hate) hit.add('hate')
  if (n(s, 'illicit/violent') >= T.illicitViolent || n(s, 'illicit') >= T.illicit) hit.add('dangerous_instructions')
  if (n(s, 'violence/graphic') >= T.graphicViolence) hit.add('graphic_violence')
  const KEYS = ['sexual', 'sexual/minors', 'self-harm/intent', 'self-harm/instructions', 'harassment/threatening', 'hate', 'hate/threatening', 'illicit', 'illicit/violent', 'violence', 'violence/graphic']
  const scores: Record<string, number> = {}
  for (const k of KEYS) scores[k] = Number(n(s, k).toFixed(4))
  return { categories: TOPIC_CATEGORIES.filter((c) => hit.has(c)), scores }
}

type Lang = 'en' | 'pt' | 'es'

const HEAD: Record<Lang, string> = {
  en: "This topic can't be made into a video on Kineo.",
  pt: 'Este tema não pode virar vídeo na Kineo.',
  es: 'Este tema no se puede convertir en video en Kineo.',
}
const REASON_LABEL: Record<Lang, string> = { en: 'Reason', pt: 'Motivo', es: 'Motivo' }
const NADA: Record<Lang, string> = { en: 'Nothing was charged.', pt: 'Nada foi cobrado.', es: 'No se cobró nada.' }

/** O motivo em palavras simples e como reescrever. Menor de idade: só o motivo — nenhuma dica de como contornar. */
const PLAIN: Record<TopicCategory, Record<Lang, { what: string; how: string | null }>> = {
  sexual_minors: {
    en: { what: 'sexual content involving minors', how: null },
    pt: { what: 'conteúdo sexual envolvendo menores de idade', how: null },
    es: { what: 'contenido sexual con menores de edad', how: null },
  },
  sexual_deepfake: {
    en: { what: 'sexual or nude content of a real person', how: 'Real people can appear in factual stories, never in nude or sexual scenes.' },
    pt: { what: 'conteúdo sexual ou de nudez de uma pessoa real', how: 'Pessoas reais podem aparecer em histórias factuais, nunca em cenas de nudez ou sexo.' },
    es: { what: 'contenido sexual o de desnudez de una persona real', how: 'Las personas reales pueden aparecer en historias basadas en hechos, nunca en escenas de desnudez o sexo.' },
  },
  sexual: {
    en: { what: 'sexual content', how: 'Keep romance suggestive and non-explicit — a look, a dance, a first date.' },
    pt: { what: 'conteúdo sexual', how: 'Deixe o romance sugestivo e sem nada explícito — um olhar, uma dança, um primeiro encontro.' },
    es: { what: 'contenido sexual', how: 'Mantén el romance sugerente y sin nada explícito — una mirada, un baile, una primera cita.' },
  },
  self_harm: {
    en: { what: 'self-harm or suicide instructions', how: 'You can make a video about awareness, support or recovery. If you are struggling, please reach out to someone you trust or a local crisis line.' },
    pt: { what: 'automutilação ou instruções de suicídio', how: 'Você pode fazer um vídeo sobre conscientização, apoio ou recuperação. Se você está passando por isso, fale com alguém de confiança ou ligue para o CVV (188).' },
    es: { what: 'autolesiones o instrucciones de suicidio', how: 'Puedes hacer un video sobre concienciación, apoyo o recuperación. Si estás pasando por esto, habla con alguien de confianza o con una línea de ayuda local.' },
  },
  violent_threat: {
    en: { what: 'threats or calls to attack people', how: 'Tell what happened as a story or documentary, without calling anyone to violence.' },
    pt: { what: 'ameaças ou chamados para atacar pessoas', how: 'Conte o que aconteceu como história ou documentário, sem chamar ninguém para a violência.' },
    es: { what: 'amenazas o llamados a atacar a personas', how: 'Cuenta lo que pasó como historia o documental, sin llamar a nadie a la violencia.' },
  },
  hate: {
    en: { what: 'hate against a group of people', how: 'Focus on the facts, the history or the people affected — without attacking a group.' },
    pt: { what: 'ódio contra um grupo de pessoas', how: 'Foque nos fatos, na história ou nas pessoas afetadas — sem atacar um grupo.' },
    es: { what: 'odio contra un grupo de personas', how: 'Céntrate en los hechos, la historia o las personas afectadas — sin atacar a un grupo.' },
  },
  dangerous_instructions: {
    en: { what: 'instructions for weapons, explosives or drugs', how: 'You can tell the history or the story around it, without step-by-step instructions.' },
    pt: { what: 'instruções de armas, explosivos ou drogas', how: 'Você pode contar a história ou o caso em volta, sem o passo a passo.' },
    es: { what: 'instrucciones de armas, explosivos o drogas', how: 'Puedes contar la historia o el caso, sin el paso a paso.' },
  },
  graphic_violence: {
    en: { what: 'graphic gore', how: 'Battles, true crime and horror are welcome — tell what happened without the gory close-ups.' },
    pt: { what: 'violência gráfica (gore)', how: 'Batalhas, crimes reais e terror são bem-vindos — conte o que aconteceu sem o close sangrento.' },
    es: { what: 'violencia gráfica (gore)', how: 'Batallas, crímenes reales y terror son bienvenidos — cuenta lo que pasó sin el primer plano sangriento.' },
  },
}

function lang(raw: string | null | undefined): Lang {
  const v = (raw ?? '').toLowerCase().slice(0, 2)
  return v === 'pt' ? 'pt' : v === 'es' ? 'es' : 'en'
}

/** A frase que a pessoa lê: cabeça honesta + o motivo em palavras simples + como reescrever + nada cobrado. */
export function topicBlockedMessage(category: TopicCategory, language?: string | null): string {
  const l = lang(language)
  const p = PLAIN[category][l]
  return [HEAD[l], `${REASON_LABEL[l]}: ${p.what}.`, p.how, NADA[l]].filter(Boolean).join(' ')
}

/** HTTP e código das recusas desta régua: 422 (reescrever resolve; tentar de novo igual não). */
export const TOPIC_BLOCKED_STATUS = 422
export const TOPIC_BLOCKED_REASON = 'content_not_allowed'
