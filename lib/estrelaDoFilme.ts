// KINEO-ESTRELA-DO-FILME-2026-09-29 [TRAVA 8.2 — vai do fundador 29/09 'vai pra todas as 4'] — a régua PURA da "Estrela do filme".
//
// PEDIDO DO FUNDADOR (29/09): o filme do amigo lutando na guerra de Troia como Aquiles, "forte, bolado", com o ROSTO do amigo
// em todas as cenas. O cliente sobe 1–3 fotos do rosto (com autorização), escreve a história, escolhe motor e duração no
// /studio; o filme sai com AQUELA pessoa como protagonista em toda cena onde há protagonista.
//
// COMO: os motores de filme já partem de um still-âncora nosso por cena (image-to-video). Com a estrela, o still das cenas
// COM protagonista humano passa a sair do `fal-ai/nano-banana-pro/edit` (o mesmo endpoint da foto de referência do /images)
// com as fotos da PRÓPRIA conta; cena sem pessoa (paisagem, objeto, mapa) segue o still FLUX de hoje. Still da estrela que
// falha ou que a moderação barra cai no still de hoje — nunca mata o filme.
//
// Este módulo decide tudo o que não precisa de rede: quem pode, em que motor, quanto custa (ANTES do débito), quais cenas
// levam a estrela, o texto do pedido ao edit e o payload. Importa só a régua de dono/limite da foto de referência
// (./imageReference, também pura) — as MESMAS regras do /images, sem cópia. O servidor (lib/estrelaServer.ts) assina as
// URLs, chama a fal e modera; a rota (app/api/generate-video-cinematic) só liga as pontas. Guardião:
// scripts/test-estrela-do-filme-2026-09-29.mjs (transpila e EXECUTA este arquivo).
import { REFERENCE_MAX_PHOTOS, isOwnReferencePath } from './imageReference'

export const ESTRELA_VERSION = 'estrela_do_filme_20260929'
export const ESTRELA_EDIT_SLUG = 'fal-ai/nano-banana-pro/edit'
/** A instrução fixa de identidade que vai em TODO pedido de still da estrela. */
export const ESTRELA_IDENTITY_INSTRUCTION = 'The protagonist is the person in the reference photo(s): keep the exact face and identity.'
/** Só o protagonista ganha o rosto; figurantes não viram clones. */
export const ESTRELA_ONLY_PROTAGONIST = 'Only the protagonist has this face; anyone else in the frame has a clearly different face.'
/** A foto decide rosto/cabelo/idade; o texto da cena decide figurino, ação e lugar. */
export const ESTRELA_PHOTO_WINS = 'Ignore any face, hair color, age or ethnicity the text gives the protagonist: the reference photo(s) decide them.'
const ESTRELA_ONE_FRAME = 'One single continuous composition filling the whole frame, no split screen, no collage, no picture-in-picture, no text, no letters, no watermark, no logo.'

// ═══ Motores ═══════════════════════════════════════════════════════════════════════════════════════════════════════
// COM âncora (image-to-video a partir do nosso still): a estrela entra no still.
//   seedance (Seedance 1.5), kling (Kling 2.5), veo (Veo 3.1) — estrada clássica, still por cena (KINEO-ANCORA-3-MOTORES);
//   hollywood (Kling 3 / O3 i2v), h3 (MiniMax H3 i2v), omni (Omni Flash i2v) — estrada hollywood, retrato + still por cena.
export const ESTRELA_MOTORES = ['seedance', 'kling', 'veo', 'hollywood', 'h3', 'omni'] as const
export type EstrelaMotor = (typeof ESTRELA_MOTORES)[number]
/** SEM caminho de âncora para a estrela — a opção some da tela e o servidor recusa ANTES do débito. */
export const ESTRELA_MOTORES_SEM_ANCORA: Readonly<Record<string, string>> = {
  fast: 'Kineo 1 edits stock footage — there is no generated first frame to put a face in.',
  sora: 'Sora runs text-to-video only here — no first-frame image.',
  s25: 'Seedance 2.5 sends every scene with a person as text-to-video (the provider refused face stills, KINEO-S25-PESSOA-T2V).',
  avatar: 'Avatar has its own photo flow.',
  presenter: 'Avatar has its own photo flow.',
}

/** Motor da ROTA (`body.engine`; ausente = Seedance 1.5, o padrão da rota cinematic). */
export function motorDaEstrela(engine: unknown): string {
  return typeof engine === 'string' && engine.trim() ? engine.trim().toLowerCase() : 'seedance'
}

export function estrelaDisponivelNoMotor(engine: unknown): boolean {
  return (ESTRELA_MOTORES as readonly string[]).includes(motorDaEstrela(engine))
}

// ═══ Preço — calculado ANTES do débito, igual na tela e no servidor ═══════════════════════════════════════════════
// Custo real: um Nano Banana Pro por cena com protagonista (US$ 0,15/imagem na fal = os 5 cr do /images). O número de cenas
// só existe depois do planejador — e a tela precisa do preço ANTES do clique. Regra simples e honesta: 2 cr a cada 6 s de
// filme (≈ uma cena), arredondado para cima. Nunca muda depois do clique; se o filme encurtar, a diferença volta junto
// com a do motor (V2-PRECO-DA-DURACAO-ENTREGUE). Motor sem âncora = 0 (e o servidor recusa).
export const ESTRELA_CR_POR_BLOCO = 2 // PREÇO B, decisão do fundador 29/09 ("2B"): +2 cr a cada 6 s (era a proposta A, 5)
export const ESTRELA_SEGUNDOS_POR_BLOCO = 6
/** Teto de stills da estrela por filme (proteção de custo: 90 s no Veo planeja até ~20 planos). */
export const ESTRELA_MAX_STILLS = 24

export function estrelaSobretaxa(engine: unknown, seconds: number): number {
  if (!estrelaDisponivelNoMotor(engine)) return 0
  const s = Number(seconds)
  if (!Number.isFinite(s) || s <= 0) return 0
  return Math.ceil(s / ESTRELA_SEGUNDOS_POR_BLOCO) * ESTRELA_CR_POR_BLOCO
}

// ═══ O pedido ══════════════════════════════════════════════════════════════════════════════════════════════════════
export type EstrelaDecision =
  | { ok: true; ativa: false }
  | { ok: true; ativa: true; paths: string[]; engine: EstrelaMotor }
  | { ok: false; status: number; error: string; code: string }

export const ESTRELA_MSG = {
  invalid: 'Invalid star photos — upload them again. Nothing was charged.',
  notAvailable: 'Star of the film is not available on your account yet. Nothing was charged.',
  consent: 'Please confirm you have permission from the person in the photo. Nothing was charged.',
  tooMany: `Up to ${REFERENCE_MAX_PHOTOS} star photos. Nothing was charged.`,
  owner: 'Invalid star photo — upload it again. Nothing was charged.',
  missing: 'Star photo not found — upload it again. Nothing was charged.',
} as const

export function estrelaMotorSemAncoraMensagem(engine: unknown): string {
  const m = motorDaEstrela(engine)
  const why = ESTRELA_MOTORES_SEM_ANCORA[m] ?? 'This engine has no first-frame image to put a face in.'
  return `Star of the film works on Seedance 1.5, Kling 2.5, Veo 3.1, Kling 3, MiniMax H3 and Omni Flash. ${why} Nothing was charged.`
}

/**
 * Lê `body.estrela` ({ paths, consent }) da rota de filme. Ausente → inativa (comportamento de hoje, byte a byte).
 * Ordem (falha fechada, tudo ANTES do débito): interruptor (conta de fora = 403) → motor com âncora → consentimento do
 * servidor → 1..3 fotos sem repetição → todas da pasta da PRÓPRIA conta (a mesma régua do /images).
 */
export function decideEstrelaRequest(args: {
  raw: unknown
  engine: unknown
  userId: string
  /** estrelaVisible(email) — ESTRELA_PUBLIC || conta da casa. */
  visible: boolean
  /** O caminho de âncora do motor está ligado (clássicos: CINEMATIC_ANCHOR_ENABLED; hollywood: sempre). */
  anchorEnabled: boolean
}): EstrelaDecision {
  const raw = args.raw
  if (raw === undefined || raw === null || raw === false) return { ok: true, ativa: false }
  if (typeof raw !== 'object' || Array.isArray(raw)) return { ok: false, status: 400, error: ESTRELA_MSG.invalid, code: 'estrela_invalid' }
  if (!args.visible) return { ok: false, status: 403, error: ESTRELA_MSG.notAvailable, code: 'estrela_not_available' }
  if (!estrelaDisponivelNoMotor(args.engine) || !args.anchorEnabled) {
    return { ok: false, status: 422, error: estrelaMotorSemAncoraMensagem(args.engine), code: 'estrela_engine' }
  }
  const r = raw as { paths?: unknown; consent?: unknown }
  if (r.consent !== true) return { ok: false, status: 400, error: ESTRELA_MSG.consent, code: 'estrela_consent' }
  const paths = r.paths
  if (!Array.isArray(paths) || paths.length === 0) return { ok: false, status: 400, error: ESTRELA_MSG.invalid, code: 'estrela_invalid' }
  if (paths.length > REFERENCE_MAX_PHOTOS) return { ok: false, status: 400, error: ESTRELA_MSG.tooMany, code: 'estrela_too_many' }
  if (new Set(paths).size !== paths.length) return { ok: false, status: 400, error: ESTRELA_MSG.invalid, code: 'estrela_invalid' }
  if (!paths.every((p) => isOwnReferencePath(p, args.userId))) return { ok: false, status: 400, error: ESTRELA_MSG.owner, code: 'estrela_owner' }
  return { ok: true, ativa: true, paths: paths as string[], engine: motorDaEstrela(args.engine) as EstrelaMotor }
}

/** Presença SOLTA (antes de o motor ser lido): liga o formato "história com personagem". Pedido recusado depois = a rota
 * volta antes de qualquer trabalho, então isto nunca muda um filme sem estrela. */
export function estrelaPedida(raw: unknown): boolean {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return false
  const r = raw as { paths?: unknown; consent?: unknown }
  return r.consent === true && Array.isArray(r.paths) && r.paths.length > 0
}

/** Sufixo da impressão digital do claim: mesmo generationId com e sem estrela NÃO é o mesmo pedido. Inativa = ''. */
export function estrelaFingerprintSuffix(d: EstrelaDecision): string {
  return d.ok && d.ativa ? `|estrela:${[...d.paths].sort().join(',')}` : ''
}

// ═══ Formato: com estrela o filme MOSTRA a pessoa ══════════════════════════════════════════════════════════════════
// documentary_faceless (o padrão para história/mistério) tira rosto do quadro — o oposto do pedido. Com estrela vira
// character_story (pessoa muda em cena, narrador por cima). Presenter (1ª pessoa) fica presenter: o retrato É a estrela.
export function formatoComEstrela<T extends { modo: string; motivo: string }>(decisao: T, ativa: boolean): T {
  if (!ativa || decisao.modo !== 'documentary_faceless') return decisao
  return { ...decisao, modo: 'character_story', motivo: `estrela do filme: a pessoa das fotos é a protagonista (antes: ${decisao.motivo})` } as T
}

// ═══ A exceção ESTREITA da regra REAL PEOPLE ═══════════════════════════════════════════════════════════════════════
// app/api/analyze-idea/route.ts manda o escritor nunca fazer o rosto reconhecível de uma pessoa real NOMEADA (histórica ou
// viva) — proteção de figura pública. A estrela é outra coisa: pessoa comum, SEM nome no texto, que deu autorização (caixa
// conferida no servidor) e cujo rosto vem das fotos. A exceção cobre SÓ esse protagonista sem nome; qualquer pessoa real
// nomeada no texto segue a regra de sempre. Celebridade atual nomeada no texto com estrela ligada é RECUSADA antes do débito
// na rota do filme (CONTEMPORARY_FIGURE_RE, lib/hollywood/router.ts). A regra-base NÃO é editada — a exceção é anexada.
export const ESTRELA_REAL_PEOPLE_EXCEPTION =
  'STAR EXCEPTION (applies ONLY to the unnamed protagonist): this film\'s protagonist is a private person who supplied reference photos with consent and is NOT named in the text. ' +
  'Show that protagonist clearly as the hero of the action — face-forward shots and close-ups are allowed. ' +
  'Every NAMED real person (historical or living) and every public figure in the text still follows REAL PEOPLE: never their recognizable face.'

/** O texto da regra de pessoas reais que o escritor recebe: sem estrela, a regra de sempre, byte a byte; com estrela, + a exceção. */
export function regraDePessoasReais(regraBase: string, estrela: boolean): string {
  return estrela ? `${regraBase}\n- ${ESTRELA_REAL_PEOPLE_EXCEPTION}` : regraBase
}

// ═══ A ficha do protagonista (continuidade de figurino e idade) ════════════════════════════════════════════════════
// Cada still sai de um pedido independente: o rosto vem da foto, mas o FIGURINO precisa estar escrito igual em toda cena.
// Ordem: a ficha que o autor escreveu (deriveExplicitCharacter/deriveStoryCharacter, lidas pela rota) → a do cenário
// reconhecido abaixo → um figurino genérico. Sempre termina com a cláusula de continuidade. Os papéis ('soldier', 'knight',
// 'pirate', 'astronaut') estão no léxico de lib/cinematic/sceneStyle (PAPEL_NA_FICHA_RE): a cena que fala do papel recebe
// a ficha também no prompt do CLIPE, não só no still.
const FIGURINOS: Array<{ re: RegExp; ficha: string }> = [
  { re: /\b(troy|troia|tr[oó]ia|trojan|troian[oa]s?|sparta|esparta|spartan|espartan[oa]s?|achilles|aquiles|hector|heitor|agamemnon|agam[eê]non|leonidas|le[oô]nidas|thermopylae|term[oó]pilas|greek hero|her[oó]i grego|hoplit\w*)\b/i, ficha: 'an ancient Greek soldier-hero in a polished bronze cuirass, a crested bronze Corinthian helmet, a crimson cloak, leather pteruges and sandals, carrying a round bronze shield and a spear' },
  { re: /\b(roman legion\w*|legion[aá]ri[oa]|gladiat\w*|gladiador\w*|ancient rome|roma antiga|romano|roman)\b/i, ficha: 'a Roman soldier in segmented steel armor, a red tunic and cloak and a crested helmet, carrying a gladius and a rectangular red shield' },
  { re: /\b(viking\w*|v[ií]king\w*|n[oó]rdic[oa]|norse)\b/i, ficha: 'a Viking soldier in chainmail over a wool tunic and a fur-trimmed cloak, with a round wooden shield and an axe' },
  { re: /\b(samurai|samurais|ronin|shogun)\b/i, ficha: 'a samurai soldier in lacquered dark lamellar armor, carrying a katana' },
  { re: /\b(knight|cavaleiro medieval|caballero|crusade\w*|cruzad\w*|medieval)\b/i, ficha: 'a medieval knight in steel plate armor over chainmail with a surcoat, carrying a longsword' },
  { re: /\b(pirate\w*|pirat[ae]s?)\b/i, ficha: 'a pirate captain in a long weathered coat, a tricorn hat, a loose linen shirt and boots' },
  { re: /\b(astronaut\w*|astronauta\w*|spacewalk|moon landing)\b/i, ficha: 'an astronaut in a white pressurized spacesuit' },
  { re: /\b(world war ii|ww2|wwii|segunda guerra|second world war|d-day|normandy|normandia)\b/i, ficha: 'a WWII infantry soldier in an olive drab uniform and a steel helmet' },
  { re: /\b(cowboy\w*|vaqueir\w*|velho oeste|wild west|faroeste)\b/i, ficha: 'a cowboy traveler in a weathered leather hat, a duster coat, boots and a gun belt' },
]
export const ESTRELA_FIGURINO_PADRAO = 'the hero of the story in one consistent outfit that fits the setting'
export const ESTRELA_CONTINUIDADE = 'the same outfit in every scene; face, hair and apparent age exactly as the person in the reference photo(s)'

export function fichaDaEstrela(historia: string, fichaDoAutor?: string | null): string {
  const autor = (fichaDoAutor ?? '').replace(/\s+/g, ' ').trim()
  const texto = String(historia ?? '').slice(0, 6000)
  const base = autor || FIGURINOS.find((f) => f.re.test(texto))?.ficha || ESTRELA_FIGURINO_PADRAO
  return `${base.replace(/[\s.;,]+$/, '')} — ${ESTRELA_CONTINUIDADE}`
}

// ═══ Quais cenas têm o protagonista ════════════════════════════════════════════════════════════════════════════════
// Lexical e determinístico (mesmo espírito do KINEO-S25-PESSOA-T2V): pessoa no SINGULAR, pronome de 3ª pessoa, ou a cláusula
// de ficha que o construtor de cena já cola ("The same main character appears"). Plural sozinho (soldiers, army, crowd)
// não é o protagonista — a cena fica genérica, sem clonar o rosto na tropa. Negação explícita de gente ganha de tudo.
const SEM_GENTE_RE = /\b(no (?:people|person|humans?|human figures?|one|foreground human faces?)|without (?:people|humans?|anyone)|nobody|empty (?:scene|street|room|beach|battlefield|landscape|city)|unpopulated|deserted|uninhabited)\b/i
const PROTAGONISTA_RE = /\b(main character|protagonist|hero|heroine|he|his|him|himself|she|her|herself|man|woman|boy|girl|friend|warrior|soldier|soldier-hero|fighter|knight|king|prince|princess|queen|captain|rider|archer|gladiator|legionary|samurai|viking|pirate|astronaut|cowboy|traveler|traveller|figure|person|face|portrait|close-up of (?:the|his|her) \w+)\b/i
// O plano visual pode sair na língua do texto quando o supervisor fala×imagem falha (ele é fail-open e a pista do Kling/Veo em
// verbatim é a própria fala): português e espanhol também contam. Sem \b nas pontas com acento (o \b do JS é ASCII).
const PROTAGONISTA_PT_ES_RE = /(?:^|[^\p{L}])(ele|dele|ela|dela|amigo|amiga|guerreiro|guerreira|her[oó]i|hero[ií]na|soldado|homem|mulher|rei|rainha|pr[ií]ncipe|princesa|cavaleiro|protagonista|rosto|olhos|[ée]l|guerrero|guerrera|h[ée]roe|hombre|mujer|caballero|su rostro|sus ojos)(?=$|[^\p{L}])/iu
const SEM_GENTE_PT_ES_RE = /(?:^|[^\p{L}])(sem (?:ningu[ée]m|pessoas|gente)|vazi[oa]s?|desert[oa]s?|sin (?:nadie|gente|personas)|vac[ií][oa]s?|desiert[oa]s?)(?=$|[^\p{L}])/iu

/**
 * O NOME que o autor deu ao papel da estrela ("meu amigo … como Aquiles", "my friend as Achilles", "como el rey Leónidas"):
 * a cena que cita o nome mostra o protagonista, mesmo sem pronome. Só palavra com inicial maiúscula logo depois do "como/as".
 */
export function nomesDoProtagonista(historia: string): string[] {
  const t = String(historia ?? '').slice(0, 6000)
  const re = /\b(?:como|as|like|as the|como o|como a|como el|como la|no papel de|in the role of)\s+(?:(?:o|a|el|la|the|rei|king|rey|general)\s+)?(\p{Lu}[\p{L}'-]{2,})/gu
  const nomes = new Set<string>()
  for (const m of t.matchAll(re)) nomes.add(m[1])
  return [...nomes].slice(0, 4)
}

export function cenaComProtagonista(visual: string, tipo?: string | null, nomes: readonly string[] = []): boolean {
  if (tipo === 'dialogue') return true
  const v = String(visual ?? '')
  if (!v.trim()) return false
  if (SEM_GENTE_RE.test(v) || SEM_GENTE_PT_ES_RE.test(v)) return false
  if (nomes.some((n) => new RegExp(`(?:^|[^\\p{L}])${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?=$|[^\\p{L}])`, 'iu').test(v))) return true
  return PROTAGONISTA_RE.test(v) || PROTAGONISTA_PT_ES_RE.test(v)
}

// ═══ O pedido ao edit ═════════════════════════════════════════════════════════════════════════════════════════════
const PROMPT_MAX = 2400

export function promptEstrelaDaCena(scenePrompt: string, ficha: string): string {
  const cena = String(scenePrompt ?? '').replace(/\s+/g, ' ').trim().slice(0, PROMPT_MAX - 900)
  return `${cena}\n\nThe protagonist in this scene: ${ficha}.\n${ESTRELA_IDENTITY_INSTRUCTION} ${ESTRELA_ONLY_PROTAGONIST} ${ESTRELA_PHOTO_WINS} ${ESTRELA_ONE_FRAME}`
}

/** Retrato-âncora das cenas de diálogo da estrada hollywood (o que o FLUX faria com a ficha, agora com o rosto da foto). */
export function promptRetratoEstrela(args: { characterSheet: string; environmentSheet: string; styleSheet: string; ficha: string }): string {
  const cena = `${String(args.characterSheet ?? '').trim()}. Standing in: ${String(args.environmentSheet ?? '').trim()}. Cinematography: ${String(args.styleSheet ?? '').trim()}. Medium shot, looking directly at the camera, real skin texture, filmic color, sharp focus on the face`
  return promptEstrelaDaCena(cena, args.ficha)
}

/** Aspecto do pedido → aspect_ratio do Nano Banana Pro (aceita os 4 formatos da casa). */
export function aspectoDaEstrela(aspect: unknown): '9:16' | '16:9' | '1:1' | '4:5' {
  return aspect === '16:9' || aspect === '1:1' || aspect === '4:5' ? aspect : '9:16'
}

/** Corpo do `fal-ai/nano-banana-pro/edit` para o still de uma cena. */
export function buildEstrelaEditInput(prompt: string, imageUrls: string[], aspect: unknown): Record<string, unknown> {
  return {
    prompt,
    image_urls: imageUrls,
    aspect_ratio: aspectoDaEstrela(aspect),
    num_images: 1,
    resolution: '1K',
  }
}

// ═══ O plano cena a cena (rota, ensaio de $0 e guardião usam o MESMO) ═══════════════════════════════════════════════
export interface EstrelaCenaPlano { indice: number; protagonista: boolean; prompt: string | null }

/**
 * `visual` = o plano CRU da cena (o que o escritor/supervisor disse que aparece), quando existe: a decisão "tem pessoa?"
 * lê ele, não o prompt final (que carrega moldura, look e sufixos da casa). `prompt` = o prompt final da cena, que vai ao edit.
 * A cláusula de ficha que o construtor cola ("The same main character appears in this scene") conta como protagonista.
 */
export function planoDaEstrela(cenas: Array<{ prompt: string; visual?: string | null; tipo?: string | null }>, ficha: string, ativa: boolean, historia?: string): EstrelaCenaPlano[] {
  let usados = 0
  const nomes = ativa && historia ? nomesDoProtagonista(historia) : []
  let anterior = false
  return cenas.map((c, indice) => {
    const leitura = typeof c.visual === 'string' && c.visual.trim()
      ? `${c.visual}${/The same main character appears in this scene/.test(c.prompt) ? ' main character' : ''}`
      : c.prompt
    // Plano que começa NO MEIO da frase (minúscula: o divisor de planos do Kling/Veo corta a fala por tempo — "Ele veste a |
    // armadura de bronze…") continua o sujeito do plano anterior: herda o protagonista, salvo negação explícita de gente.
    const continua = typeof c.visual === 'string' && /^\s*\p{Ll}/u.test(c.visual) && anterior && !SEM_GENTE_RE.test(leitura) && !SEM_GENTE_PT_ES_RE.test(leitura)
    const protagonista = ativa && usados < ESTRELA_MAX_STILLS && (cenaComProtagonista(leitura, c.tipo, nomes) || continua)
    anterior = protagonista
    if (protagonista) usados++
    return { indice, protagonista, prompt: protagonista ? promptEstrelaDaCena(c.prompt, ficha) : null }
  })
}

/** Metadado do evento estrela_scene_anchored — contagens, nunca caminho, URL ou texto (sem dado pessoal). */
export function relatoDaEstrela(engine: string, plano: EstrelaCenaPlano[], ancoradas: number): { engine: string; scenes: number; anchored: number; fallback: number; version: string } {
  const comProtagonista = plano.filter((p) => p.protagonista).length
  return { engine, scenes: plano.length, anchored: ancoradas, fallback: Math.max(0, comProtagonista - ancoradas), version: ESTRELA_VERSION }
}

// ═══ KINEO-ESTRELA-SOBRETAXA-ASSINADA-2026-10-01 — a sobretaxa viaja ASSINADA no claim ═══════════════════════════════
// O claim do filme cobra filme + sobretaxa (ex.: 38 + 6 = 44) e o /api/compose conferia só o preço do filme (38) →
// "These AI clips do not match their signed generation" nos 3 primeiros filmes reais com estrela (01/10). A rota do filme
// passa a gravar, dentro da resposta do claim (coberta pelo hash + assinatura do servidor), a sobretaxa que ELA somou ao
// `cost`; o compose LÊ esse número — nunca recalcula, nunca aceita do navegador. Claim sem o campo = 0 (o de sempre).
export const ESTRELA_SOBRETAXA_CAMPO = 'estrela_sobretaxa_cr'

/** A sobretaxa assinada no claim (0 = sem estrela ou claim antigo). Valor fora de (0, custo) = 0 — falha fechada: a
 * conferência dura do compose volta a comparar só o preço do filme e recusa, como antes. */
export function sobretaxaAssinadaDaEstrela(response: Record<string, unknown> | null | undefined, creditCost: number): number {
  const v = response ? response[ESTRELA_SOBRETAXA_CAMPO] : undefined
  if (typeof v !== 'number' || !Number.isInteger(v) || v <= 0) return 0
  if (!Number.isInteger(creditCost) || v >= creditCost) return 0
  return v
}
