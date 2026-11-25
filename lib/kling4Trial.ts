// Trial only. Submit once and return the queue receipt; status polls rendering, never birth.
import { KLING4_TRIAL_COST_USD } from '@/lib/kling4TrialBudget'
import { narrationWordCount } from '@/lib/textLanguage'
import { visualMostraAlguem } from '@/lib/cinematic/personagemAjuste' // KINEO-REFERENCIA-UNICA-PUBLIC-2411 — o detector de alguém na cena que a rota já usa no visual do plano
import { planoNegaGente } from '@/lib/cinematic/folhaDePersonagem' // KINEO-REFERENCIA-UNICA-PUBLIC-2411 — a ausência que a rota já marca ("No people, no human figures…", gente negada)

export const KLING4_T2V_MODEL = 'kling/v4/text-to-video'
export const KLING4_I2V_MODEL = 'kling/v4/image-to-video'
export const KLING4_REFERENCE_MODEL = 'kling/v4/reference-to-video'
export type Kling4CharacterReference = { imageUrl: string; continuity: string }

export function buildKling4ReferenceInput(shots: readonly { prompt: string; duration: number }[], reference: Kling4CharacterReference) {
  const duration = shots.reduce((sum, shot) => sum + shot.duration, 0)
  if (!Number.isInteger(duration) || duration < 3 || duration > 30 || shots.some(s =>
    !Number.isInteger(s.duration) || s.duration < 1 || !s.prompt.trim())) throw new Error('invalid_kling4_reference_plan')
  const multi_prompt = shots.map(shot => {
    // Keep scene action first and reserve its own space independently of the identity lock.
    const tail = ' ' + reference.continuity + ' Mouth closed, no speaking.'
    const budget = KLING4_TETO_DO_PLANO - Array.from(tail).length
    const raw = shot.prompt.trim().replace(/\s*Mouth closed, no speaking\.$/i, '')
    const chars = Array.from(raw)
    const action = chars.length <= budget ? raw : chars.slice(0, budget).join('').replace(/\s+\S*$/u, '').trimEnd()
    return { prompt: action + tail, duration: shot.duration }
  })
  return { model: KLING4_REFERENCE_MODEL, input: { image_urls: [reference.imageUrl], multi_prompt, duration, resolution: '720p', aspect_ratio: '9:16' } }
}
export const KLING4_TRIAL_TIMEOUT_MS = 8 * 60_000

type StillReport = {
  cena: number; url_final: string; escolhida_tentativa: number
  tentativas: readonly { n: number; url: string | null; veredito: string }[]
}

/** Approval belongs to the exact selected URL at that scene, not an earlier image or original verdict. */
export function approvedKling4TrialStills(
  stills: readonly (string | null)[], reports: readonly StillReport[],
  extra: readonly { cena: number; url: string | null; veredito: string | null }[] = [],
): (string | null)[] {
  return stills.map((url, i) => {
    if (!url) return null
    const approved = reports.some(r => r.cena === i + 1 && r.url_final === url &&
      r.tentativas.some(t => t.n === r.escolhida_tentativa && t.url === url && t.veredito === 'PASS')) ||
      extra.some(r => r.cena === i + 1 && r.url === url && r.veredito === 'PASS')
    return approved ? url : null
  })
}

// KINEO-K4-PLANO-DA-SECAO-1111 — teto de 512 code points por plano (esquema KlingV4Shot da fal). O corte cai em FRONTEIRA DE FRASE e nunca no meio de uma
// proibição; a cauda protegida " Mouth closed, no speaking." vai inteira ou não vai (a lição do "menino da bolha" de 27/08: proibição
// decapitada vira pedido — "Mout" de "Mouth closed", "color g").
export const KLING4_TETO_DO_PLANO = 512
const CAUDA_DA_BOCA = ' Mouth closed, no speaking.'
export function cabeNoTetoDoPlano(texto: string, teto = KLING4_TETO_DO_PLANO): string {
  const cp = (s: string) => Array.from(s).length
  if (cp(texto) <= teto) return texto
  const temCauda = texto.endsWith(CAUDA_DA_BOCA)
  const corpo = temCauda ? texto.slice(0, -CAUDA_DA_BOCA.length) : texto
  const orcamento = teto - (temCauda ? cp(CAUDA_DA_BOCA) : 0)
  const caberia = Array.from(corpo).slice(0, orcamento).join('')
  // 1º: a última frase inteira que cabe; 2º: a última oração (vírgula) que não comece por proibição; nunca o meio da palavra
  const fimDeFrase = Math.max(caberia.lastIndexOf('. '), caberia.lastIndexOf('! '), caberia.lastIndexOf('? '), caberia.endsWith('.') ? caberia.length - 1 : -1)
  let base: string
  if (fimDeFrase >= Math.floor(orcamento * 0.5)) base = caberia.slice(0, fimDeFrase + 1)
  else {
    const partes = caberia.split(/,\s*/)
    partes.pop() // a última oração pode estar cortada no meio
    while (partes.length > 1 && /^(?:no|not|never|without)\b/i.test(partes[partes.length - 1].trim())) partes.pop()
    base = partes.join(', ').replace(/[\s,;:—-]+$/u, '') + '.'
  }
  const final = base + (temCauda ? CAUDA_DA_BOCA : '')
  return cp(final) <= teto ? final : Array.from(base).slice(0, teto).join('').replace(/\s+\S*$/u, '')
}

// KINEO-REFERENCIA-UNICA-2411 [teste pago 23/11: nota visual 4,0 → 7,3 no mesmo motor e no mesmo preço] — UMA referência do personagem principal,
// citada só nos planos em que ele aparece. Planos e durações são os de hoje; sai só o prefixo "Scene N: use the start image…" (aponta para imagens
// que este pedido não manda) e entra a frase antes de "Mouth closed, no speaking.". Nenhum plano com o personagem ou entrada fora da régua = null
// (quem chama segue o caminho de hoje). Quem decide se liga: lib/cinematic/referenciaUnica2411.ts.
// KINEO-REFERENCIA-UNICA-PUBLIC-2411: + descricao (o protagonista como o autor/pedido o descreveu, lida da canônica do elenco) e metades (por plano: true =
// metade de cena fundida, posta pelo plano por seção da rota; ausente ou de outro tamanho = todo plano é a cena inteira, como antes).
export type Kling4ReferenciaUnica = { imageUrl: string; frase: string; nomes: readonly string[]; descricao?: string; metades?: readonly boolean[]
  /** KINEO-QUEM-APARECE-2511 — por plano: true/false pela leitura de quem aparece; null = a regra de hoje. Outro tamanho que o dos planos = ignorado. */
  presenca?: ReadonlyArray<boolean | null>
  /** KINEO-DUAS-REFERENCIAS-2411 — o 2º personagem com folha (@Image2), só quando a rota o põe (interruptor próprio, só a casa). Ausente = uma referência, byte a byte. */
  segundo?: { imageUrl: string; frase: string; nomes: readonly string[]; descricao?: string; presenca?: ReadonlyArray<boolean | null> /* KINEO-QUEM-APARECE-2511 */ } }
const escapaRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
// KINEO-REFERENCIA-UNICA-PUBLIC-2411 [prova paga 24/11, docs/canais/2026-11-24/prova-2; volta da revisora, docs/revisoes-2311/CEO-REFERENCIA-UNICA-FINAL-2411.md]
// A decisão era o NOME em qualquer lugar do texto do plano. Ele vinha (a) da ficha que o código põe ("Identity: Louis Le Prince, …") e que a METADE de cena
// fundida herda da cena sem decidir nada (KINEO-METADE-COM-FICHA-1111, lib/kling4QuatroPlanos promptDaSecao: o vagão vazio do Le Prince e as notas na areia
// do Cooper levaram a frase) e (b) da posse ("a silent testament to Slocum's mysterious disappearance", também metade). O plano que MOSTRA o homem sem nome
// nem ficha ("A bearded man in an 1880s suit operates…", Le Prince plano 1) ficava sem ela.
// Regra (na dúvida, o plano FICA com a ficha e a frase: tirar custa a identidade no meio do filme, deixar custa no máximo um final fraco):
//   · plano que é a cena inteira: a ficha/ordem do personagem que a rota pôs nele é a decisão da rota de que ele está ali — fica, como antes. Só sai com a
//     ausência que a rota já marca (planoNegaGente: "No people, no human figures…", gente negada).
//   · metade de cena fundida: a ficha é herança, não decisão. Ela e a frase saem só quando a AÇÃO da metade não mostra ninguém (os detectores da rota,
//     com pronome, parte do corpo, silhueta, figura e bicho), não o cita como quem age e não repete nenhuma palavra da descrição dele ("The strawberry",
//     "The old sailor", "The inventor"). Gente sem nome na metade = fica (como antes).
//   · sem ficha dele no plano: entra a frase quando a ação o cita como quem age, pela posse com corpo, ou quando a pessoa sem nome repete a descrição DELE
//     (2+ palavras da descrição do autor: "bearded … 1880s suit"); o estranho ("A young boy finds bundles…", "A fisherman on another boat") fica sem.
// Nome só dentro de fala entre aspas não conta.
const ORDEM_DO_PROTAGONISTA_RE = /The only person in this shot is the same main character \((?:[^()]|\((?:[^()]|\([^()]*\))*\))*\); any other person described below is replaced by this same character\.\s*/gu
const CLAUSULA_DA_FICHA_RE = /The same main character appears in this scene, consistent design:[^\n]*?(?:\.(?=\s|$)|$)\s*/gu
const LINHA_DA_FICHA_RE = /(?<![\p{L}])(?:Identity|Visible(?:, seen from behind)?):\s[\s\S]*?(?:\.(?=\s|$)|$)\s*/gu // promptCurtoDoFilmeKling4: "Identity: <ficha sem ". ">. "
const LINHA_DA_ORIGEM_RE = /Everyone shown has the natural features of [^.]+? people\.\s*|(?<![\p{L}])People: [^.]+\.\s*/gu // o "people" da origem não é gente na cena
const FALA_ENTRE_ASPAS_RE = /"[^"\n]*"|“[^”\n]*”/gu
// A linha de estilo da ficha (lib/cinematic/elencoTrava linhaDeEstilo, as 4 formas que quemSemEstilo de lib/kling4QuatroPlanos já reconhece) que sobra
// quando a ficha tem frase própria e a linha Identity:/Visible: acaba no 1º ponto (811419a2: "…high cheekbones. He; a real person filmed in
// photorealistic live action, …"): texto NOSSO sobre o personagem, nunca gente pedida para a cena. O pedaço da canônica antes do ";" vai junto.
const ESTILO_DA_FICHA_RE = /(?:(?<![\p{L}])[\p{L}]{1,12};\s*)?(?:a real person|a real living [^;,.()]{1,40}|a living creature) filmed in photorealistic live action[^.;]*(?:[.;]|$)\s*|(?:(?<![\p{L}])[\p{L}]{1,12};\s*)?drawn in the film's own look \([^).;]*\)?[^.;]*(?:[.;]|$)\s*/gu
const FICHAS_RE = [ORDEM_DO_PROTAGONISTA_RE, CLAUSULA_DA_FICHA_RE, LINHA_DA_FICHA_RE]
const limpa = (t: string) => t.replace(/\s{2,}/g, ' ').trim()
/** O que o plano pede para a IMAGEM: o texto sem a ficha que o código pôs (e a sua linha de estilo), sem a linha da origem e sem fala entre aspas. */
export function acaoDoPlano(prompt: string): string {
  let t = String(prompt ?? '')
  for (const re of [...FICHAS_RE, ESTILO_DA_FICHA_RE, LINHA_DA_ORIGEM_RE]) t = t.replace(re, ' ')
  return limpa(t.replace(FALA_ENTRE_ASPAS_RE, ' '))
}
/** Como o texto cita o personagem (nome ou núcleo, sem artigo, 3+ letras, palavra inteira): 'sujeito', só 'posse' ("Slocum's …") ou null. */
function citacaoDoPersonagem(texto: string, nomes: readonly string[]): 'sujeito' | 'posse' | null {
  let posse = false
  for (const n of nomes) {
    const k = String(n ?? '').trim().toLowerCase().replace(/^(?:the|a|an)\s+/, '')
    if (Array.from(k).length < 3) continue
    for (const m of texto.matchAll(new RegExp(`(?<![\\p{L}\\p{N}])${escapaRe(k)}(?![\\p{L}\\p{N}])`, 'giu'))) {
      if (/^['’]s?(?![\p{L}])/u.test(texto.slice((m.index ?? 0) + m[0].length))) posse = true
      else return 'sujeito'
    }
  }
  return posse ? 'posse' : null
}
/** KINEO-DUAS-REFERENCIAS-2411 [revisora, volta 2] a ficha É do personagem quando começa pelo nome dele ("Identity: Mara, …", "…consistent design: Mara, …"). */
function fichaComecaPor(ficha: string, nomes: readonly string[]): boolean {
  const corpo = ficha.replace(/^(?:The same main character appears in this scene, consistent design:|(?:Identity|Visible(?:, seen from behind)?):)\s*/u, '').replace(/^(?:the|a|an)\s+/iu, '').toLowerCase()
  return nomes.some((n) => { const k = String(n ?? '').trim().toLowerCase().replace(/^(?:the|a|an)\s+/, ''); return Array.from(k).length >= 3 && corpo.startsWith(k) && !/^[\p{L}\p{N}]/u.test(corpo.slice(k.length)) })
}
/** A ficha/ordem/cláusula DELE que o código pôs no plano (a ordem do protagonista é dele por definição, mesmo sem o nome na canônica). */
function temFichaDele(prompt: string, nomes: readonly string[], protagonista = true): boolean {
  const t = String(prompt ?? '')
  return (protagonista && (t.match(ORDEM_DO_PROTAGONISTA_RE)?.length ?? 0) > 0) || [CLAUSULA_DA_FICHA_RE, LINHA_DA_FICHA_RE].some((re) => (t.match(re) ?? []).some((m) => protagonista ? citacaoDoPersonagem(m, nomes) !== null : fichaComecaPor(m, nomes)))
}
const palavrasDe = (t: string): Set<string> => new Set((String(t ?? '').toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []).filter((w) => Array.from(w).length >= 4))
/** A ação repete a descrição DELE: `minimo` palavras (4+ letras) da descrição do autor/pedido ("bearded inventor in an 1880s suit"). Sem descrição = não. */
function repeteADescricao(acao: string, descricao: string | undefined, minimo = 2): boolean {
  if (!descricao || !String(descricao).trim()) return false
  const dele = palavrasDe(descricao)
  let n = 0
  for (const w of palavrasDe(acao)) if (dele.has(w) && ++n >= minimo) return true
  return false
}
/** O personagem APARECE no plano (ver a regra acima). `metade` = o plano é metade de cena fundida (a ficha dele ali é herança). */
export function planoMostraOPersonagem(prompt: string, nomes: readonly string[], quem: { descricao?: string; metade?: boolean; protagonista?: boolean } = {}): boolean { // KINEO-DUAS-REFERENCIAS-2411: protagonista false = a ordem do protagonista não é ficha deste
  const acao = acaoDoPlano(prompt)
  const cita = citacaoDoPersonagem(acao, nomes)
  if (cita === 'sujeito') return true
  if (cita === 'posse' && quem.protagonista !== false && visualMostraAlguem(acao)) return true // KINEO-DUAS-REFERENCIAS-2411: a posse não põe o 2º no plano
  if (repeteADescricao(acao, quem.descricao)) return true
  if (!temFichaDele(prompt, nomes, quem.protagonista !== false)) return false
  return quem.metade === true ? visualMostraAlguem(acao) || repeteADescricao(acao, quem.descricao, 1) : !planoNegaGente(acao)
}
/** Plano em que o personagem não aparece: sai a ficha DELE que o código pôs (Identity:/Visible:/ordem/cláusula que o cita), para nada mais o pôr lá;
 *  saindo a ficha dele, sai também a linha de estilo que sobrou dela ("He; a real person filmed in photorealistic live action, …"). */
export function semFichaDoPersonagem(prompt: string, nomes: readonly string[]): string {
  let t = String(prompt ?? '')
  let saiu = false
  for (const re of FICHAS_RE) t = t.replace(re, (m) => { if (re !== ORDEM_DO_PROTAGONISTA_RE && citacaoDoPersonagem(m, nomes) === null) return m; saiu = true; return ' ' }) // a ordem é do protagonista por definição, mesmo sem o nome na canônica
  if (saiu) t = t.replace(ESTILO_DA_FICHA_RE, ' ')
  return limpa(t)
}
export function buildKling4ReferenciaUnicaInput(shots: readonly { prompt: string; duration: number }[], ref: Kling4ReferenciaUnica) {
  const duration = shots.reduce((sum, shot) => sum + shot.duration, 0)
  if (!/^https:\/\/[^\s]+$/i.test(ref.imageUrl) || !ref.frase.trim() || duration !== 15 || !shots.length || shots.length > 6 ||
    shots.some((s) => !Number.isInteger(s.duration) || s.duration < 1 || !s.prompt.trim())) return null
  const metades = Array.isArray(ref.metades) && ref.metades.length === shots.length ? ref.metades : shots.map(() => false) // de outro tamanho = a cena inteira (como antes)
  const lida = (p: ReadonlyArray<boolean | null> | undefined, i: number): boolean | null => (Array.isArray(p) && p.length === shots.length && typeof p[i] === 'boolean' ? p[i] as boolean : null) // KINEO-QUEM-APARECE-2511
  const comPersonagem = shots.map((s, i) => lida(ref.presenca, i) ?? planoMostraOPersonagem(s.prompt, ref.nomes, { descricao: ref.descricao, metade: metades[i] === true }))
  if (!comPersonagem.some(Boolean)) return null
  const frase = ' ' + ref.frase.trim()
  // KINEO-DUAS-REFERENCIAS-2411 — o 2º personagem: a mesma regra de presença da volta 2 (na dúvida fica; ausência provada sai), sem a ordem do protagonista
  const seg = ref.segundo && /^https:\/\/[^\s]+$/i.test(ref.segundo.imageUrl) && ref.segundo.imageUrl !== ref.imageUrl && /@Image2\b/.test(ref.segundo.frase) && /@Image1\b/.test(ref.frase) ? ref.segundo : null
  const comSegundo = shots.map((s, i) => !!seg && (lida(seg.presenca, i) ?? planoMostraOPersonagem(s.prompt, seg.nomes, { descricao: seg.descricao, metade: metades[i] === true, protagonista: false }))) // KINEO-QUEM-APARECE-2511
  const frasesDo = (i: number): string => (comPersonagem[i] ? frase : '') + (comSegundo[i] && seg ? ' ' + seg.frase.trim() : '')
  // KINEO-REFERENCIA-UNICA-PUBLIC-2411 — plano sem o personagem de onde a ficha dele saiu: o texto que ele teria sem a referência (o caminho de hoje).
  // Fica FORA do input, como planosComFrase: os juízes leem este texto (o mesmo do juiz de antes, sem 2ª leitura paga) e o claim conta os índices.
  const fichaRetirada: (string | null)[] = shots.map(() => null)
  const multi_prompt = shots.map((shot, i) => {
    const texto = shot.prompt.trim()
    // plano sem o protagonista: sai a ficha dele (fichaRetirada guarda o texto de antes, para o juiz). KINEO-DUAS-REFERENCIAS-2411 — e, se o 2º está, entra só a frase do 2º
    let base = texto
    if (!comPersonagem[i]) { const sem = semFichaDoPersonagem(texto, ref.nomes); if (sem !== limpa(texto)) { fichaRetirada[i] = cabeNoTetoDoPlano(texto); base = sem } }
    const frases = frasesDo(i)
    const cabe = cabeNoTetoDoPlano(base, KLING4_TETO_DO_PLANO - Array.from(frases).length) // a frase tem o seu espaço reservado
    const prompt = cabe.endsWith(CAUDA_DA_BOCA) ? cabe.slice(0, -CAUDA_DA_BOCA.length) + frases + CAUDA_DA_BOCA : cabe + frases
    return { prompt, duration: shot.duration }
  })
  // planosComFrase fica FORA do input (não vai à fal): é a decisão deste montador, a única fonte de onde a frase entrou (o juiz e o claim leem daqui)
  // KINEO-DUAS-REFERENCIAS-2411 — com o 2º personagem citado em algum plano: image_urls [protagonista, 2º] e planosComSegunda (fora do input, como planosComFrase)
  const usaSegundo = !!seg && comSegundo.some(Boolean)
  return { model: KLING4_REFERENCE_MODEL, input: { image_urls: usaSegundo && seg ? [ref.imageUrl, seg.imageUrl] : [ref.imageUrl], multi_prompt, duration, resolution: '720p', aspect_ratio: '9:16' } as Record<string, unknown>, planosComFrase: comPersonagem as readonly boolean[], fichaRetirada: fichaRetirada as readonly (string | null)[],
    ...(usaSegundo ? { planosComSegunda: comSegundo as readonly boolean[] } : {}) }
}

// KINEO-K4-DURACAO-PELA-VOZ-1311 [CEO 13/11, "nota ≥ 8 no teste grátis — a próxima causa"] — filme 9e902872 (cliente, Kling 4, 15 s,
// 4 seções): a fala durou 12 s (seções em 0–4 / 4–7 / 7–12 s), mas a régua acima pôs piso de 3 s nas seções curtas e espalhou os 3 s
// de sobra por todos os planos → [3,3,4,5]. A imagem ficou uma seção ATRÁS da voz ("Battle ropes engage your core" sobre o
// kettlebell; o HIIT só aparece depois de a fala acabar). `pelaVoz` (só quando o despacho mede a voz e o interruptor está ligado):
// cada fronteira de plano cai onde a fala da seção termina, na escala da voz MEDIDA; o silêncio depois da fala vai inteiro para o
// último plano; piso de 2 s por plano (o schema da fal aceita 1–30). Sem `pelaVoz` = a régua de sempre, byte a byte.
export type Kling4TrialTiming = { papelVisual2411?: (plano: string) => string; fixedCharacter?: Kling4CharacterReference; referenciaUnica?: Kling4ReferenciaUnica /* KINEO-REFERENCIA-UNICA-2411 */; voiceovers: readonly string[]; wordsPerSecond: number; pelaVoz?: { segundosDaVoz: number } | null; clipSeconds?: number } // KINEO-K4-GRATIS-20S-1711: + clipSeconds (o clipe nasce do tamanho da voz; ausente = 15)
export const KLING4_PISO_PELA_VOZ = 2
/** Interruptor. 'all' desde 13/11 05:11: o dono viu o antes e depois com som (prova paga no pedido salvo do 9e902872: cortes 2,08/4,08/7,13 s
 *  contra a fala 4,0/7,0 s) e escolheu "A", ligar para todos. Reverter: 'off' devolve a régua antiga, byte a byte, a todo mundo;
 *  'internal' volta a ser só a casa. Mudou o valor? Rode node scripts/test-support/gerar-recibo-k4-duracao-pela-voz-1311.mjs. */
export const KLING4_DURACAO_PELA_VOZ: 'off' | 'internal' | 'all' = 'all'
export function duracaoPelaVozLigada(modo: 'off' | 'internal' | 'all', interno: boolean): boolean {
  return modo === 'all' || (modo === 'internal' && interno)
}

/** KINEO-K4-DURACAO-PELA-VOZ-1311 — durações inteiras cujas fronteiras seguem o fim da fala de cada seção (voz medida). */
export function kling4TrialSceneDurationsPelaVoz(voiceovers: readonly string[], segundosDaVoz: number, total = 15): number[] | null { // KINEO-K4-GRATIS-20S-1711: + total (padrão 15 = hoje)
  const n = voiceovers.length
  if (!n || n > 5 || !Number.isFinite(segundosDaVoz) || segundosDaVoz <= 0 || segundosDaVoz > 15.5 + (total - 15)) return null
  const palavras = voiceovers.map((t) => narrationWordCount(t))
  const palavrasTotal = palavras.reduce((s, w) => s + w, 0)
  if (palavrasTotal <= 0 || palavras.some((w) => w <= 0)) return null
  const piso = KLING4_PISO_PELA_VOZ
  const fronteiras: number[] = []
  let acumulado = 0
  for (let i = 0; i < n - 1; i++) {
    acumulado += palavras[i]
    const fim = Math.round((acumulado / palavrasTotal) * Math.min(segundosDaVoz, total))
    const anterior = i === 0 ? 0 : fronteiras[i - 1]
    fronteiras.push(Math.min(Math.max(fim, anterior + piso), total - piso * (n - 1 - i)))
  }
  const cortes = [0, ...fronteiras, total]
  const segundos = cortes.slice(1).map((c, i) => c - cortes[i])
  return segundos.every((s) => s >= piso) && segundos.reduce((s, x) => s + x, 0) === total ? segundos : null
}

/** Speech-weighted allocation on the provider's integer clock. Clamp short shots, then apportion the remainder. */
export function kling4TrialSceneDurations(voiceovers: readonly string[], wordsPerSecond: number, total = 15): number[] { // KINEO-K4-GRATIS-20S-1711: + total (padrão 15 = hoje)
  const n = voiceovers.length
  if (!n || n > 5 || !Number.isFinite(wordsPerSecond) || wordsPerSecond <= 0) {
    throw new Kling4TrialPreflightError('kling4_invalid_timing')
  }
  const speech = voiceovers.map(text => narrationWordCount(text) / wordsPerSecond)
  const target = new Array<number>(n).fill(3)
  let remaining = total
  let active = speech.map((_, i) => i)
  // Water-fill: a floor-bound shot stays at three seconds; other shots share time by their actual speech weight.
  while (active.length) {
    const sum = active.reduce((total, i) => total + speech[i], 0)
    const proposed = active.map(i => sum > 0 ? remaining * speech[i] / sum : remaining / active.length)
    const floorBound = active.filter((_, k) => proposed[k] < 3)
    if (!floorBound.length) {
      active.forEach((i, k) => { target[i] = proposed[k] })
      break
    }
    for (const i of floorBound) { target[i] = 3; remaining -= 3 }
    active = active.filter(i => !floorBound.includes(i))
  }
  const seconds = target.map(s => Math.max(3, Math.floor(s)))
  const order = target.map((s, i) => ({ i, fraction: s - seconds[i] }))
    .sort((a, b) => b.fraction - a.fraction || a.i - b.i)
  const spare = total - seconds.reduce((sum, s) => sum + s, 0)
  for (let k = 0; k < spare; k++) seconds[order[k].i]++
  return seconds
}

/** KINEO-K4-GRATIS-20S-1711 — o total do clipe: inteiro de 15 a 30 (schema kling/v4: 3–30); qualquer outra coisa = 15. */
export function kling4TrialClipTotal(clipSeconds: unknown): number {
  return typeof clipSeconds === 'number' && Number.isInteger(clipSeconds) && clipSeconds >= 15 && clipSeconds <= 30 ? clipSeconds : 15
}

export function buildKling4TrialInput(
  prompts: readonly string[], approvedStills: readonly (string | null)[] = [], timing?: Kling4TrialTiming,
) {
  const envio = montarKling4TrialInput(prompts, approvedStills, timing)
  if (timing?.papelVisual2411) {
    // Presence and reference selection require the original names. Only edit text in the final payload.
    for (const plano of envio.input.multi_prompt as Array<{ prompt: string }>) plano.prompt = timing.papelVisual2411(plano.prompt)
  }
  return envio
}

function montarKling4TrialInput(prompts: readonly string[], approvedStills: readonly (string | null)[], timing?: Kling4TrialTiming) {
  const shots = prompts.map(p => p.trim())
  if (!shots.length || shots.some(p => !p)) throw new Kling4TrialPreflightError('kling4_empty_plan')
  if (timing && timing.voiceovers.length !== shots.length) throw new Kling4TrialPreflightError('kling4_mismatched_timing')
  // Empty narration is the only balanced fallback. Birth always supplies its final scene voiceovers and resolved voice pace.
  const total = kling4TrialClipTotal(timing?.clipSeconds) // KINEO-K4-GRATIS-20S-1711 — 15 sem clipSeconds (hoje)
  const pelaVoz = timing?.pelaVoz ? kling4TrialSceneDurationsPelaVoz(timing.voiceovers, timing.pelaVoz.segundosDaVoz, total) : null // KINEO-K4-DURACAO-PELA-VOZ-1311
  const seconds = pelaVoz ?? kling4TrialSceneDurations(timing?.voiceovers ?? shots.map(() => ''), timing?.wordsPerSecond ?? 1, total)
  if (timing?.fixedCharacter) return buildKling4ReferenceInput(shots.map((prompt, i) => ({ prompt, duration: seconds[i] })), timing.fixedCharacter)
  if (timing?.referenciaUnica) { // KINEO-REFERENCIA-UNICA-2411 — o montador só aceita o clipe de 15 s; o personagem fixo do fundador (acima) ganha
    const unica = buildKling4ReferenciaUnicaInput(shots.map((prompt, i) => ({ prompt, duration: seconds[i] })), timing.referenciaUnica)
    if (unica) return unica
  }
  const first = approvedStills[0] || null
  const middle: string[] = []
  const multiPrompt = shots.map((prompt, i) => {
    let reference = ''
    if (first) {
      if (i === 0) reference = 'Scene 1: use the start image. '
      else if (approvedStills[i] && middle.length < 8) {
        middle.push(approvedStills[i] as string)
        reference = `Scene ${i + 1}: use middle keyframe ${middle.length}. `
      } else reference = `Scene ${i + 1}: text-directed shot, no new keyframe for this scene. `
    }
    // KlingV4Shot.prompt has maxLength=512; count Unicode code points as the schema does.
    const bounded = cabeNoTetoDoPlano(reference + prompt) // KINEO-K4-PLANO-DA-SECAO-1111 — era: Array.from(reference + prompt).slice(0, 512).join('') (cortava no meio da palavra e da proibição: "color g", "signage Mout")
    return { prompt: bounded, duration: seconds[i] }
  })
  return {
    model: first ? KLING4_I2V_MODEL : KLING4_T2V_MODEL,
    input: {
      multi_prompt: multiPrompt, duration: total, resolution: '720p', // KINEO-K4-GRATIS-20S-1711 — a soma dos planos (schema kling/v4: 3–30 s)
      ...(first ? { start_image_url: first, ...(middle.length ? { middle_image_urls: middle } : {}) } : { aspect_ratio: '9:16' }),
    } as Record<string, unknown>,
  }
}

export type Kling4TrialJob = { requestId: string; model: string; submittedAt: string }
class Kling4TrialPreflightError extends Error {}
/** KINEO-K4-DEVOLUCAO-1111 — a fal RECUSOU o envio com 4xx (sem saldo, validação, limite): nada foi enfileirado, nada cobrado. */
export class Kling4TrialRefusedError extends Error {
  constructor(readonly status: number) { super(`kling4_http_${status}`) }
}
type NetworkDeps = { apiKey: string; fetchImpl?: typeof fetch; now?: () => number; onPost?: () => void }

/** Exactly one POST. No status GET, rendering wait or provider retry. */
export async function submitKling4TrialVideo(
  args: { prompts: readonly string[]; approvedStills?: readonly (string | null)[]; timing?: Kling4TrialTiming }, deps: NetworkDeps,
): Promise<Kling4TrialJob> {
  if (!deps.apiKey) throw new Kling4TrialPreflightError('kling4_unavailable')
  const { model, input } = buildKling4TrialInput(args.prompts, args.approvedStills, args.timing)
  const submittedAt = new Date((deps.now ?? Date.now)()).toISOString()
  deps.onPost?.()
  const response = await (deps.fetchImpl ?? fetch)(`https://queue.fal.run/${model}`, {
    method: 'POST', headers: { Authorization: `Key ${deps.apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(input), signal: AbortSignal.timeout(10_000), cache: 'no-store',
  })
  if (!response.ok) throw response.status >= 400 && response.status < 500 ? new Kling4TrialRefusedError(response.status) : new Error(`kling4_http_${response.status}`) // KINEO-K4-DEVOLUCAO-1111 — 5xx/timeout seguem ambíguos (a fal pode ter aceitado)
  const receipt = await response.json() as { request_id?: unknown }
  const requestId = typeof receipt.request_id === 'string' ? receipt.request_id.trim() : ''
  if (!requestId) throw new Error('kling4_missing_id')
  return { requestId, model, submittedAt }
}

export type Kling4TrialPoll = { status: 'pending' | 'processing' | 'done' | 'failed'; url: string | null }

/** One status/result cycle. Transient lookup errors wait for the durable eight-minute deadline. */
export async function pollKling4TrialVideo(requestId: string, deps: NetworkDeps): Promise<Kling4TrialPoll> {
  const processing: Kling4TrialPoll = { status: 'processing', url: null }
  if (!deps.apiKey || !requestId) return processing
  const base = `https://queue.fal.run/kling/v4/requests/${encodeURIComponent(requestId)}`
  const get = (url: string) => (deps.fetchImpl ?? fetch)(url, {
    headers: { Authorization: `Key ${deps.apiKey}` }, signal: AbortSignal.timeout(8_000), cache: 'no-store',
  })
  try {
    const response = await get(`${base}/status`)
    if (!response.ok) return processing
    const state = await response.json() as { request_id?: unknown; status?: string; error?: unknown }
    if (state.request_id !== requestId) return processing
    if (state.status === 'FAILED' || (state.status === 'COMPLETED' && state.error)) return { status: 'failed', url: null }
    if (state.status === 'IN_QUEUE') return { status: 'pending', url: null }
    if (state.status !== 'COMPLETED') return processing
    const result = await get(base)
    if (!result.ok) return result.status === 422 || result.status === 400 ? { status: 'failed', url: null } : processing
    const data = await result.json() as { video?: { url?: unknown }; error?: unknown }
    const url = typeof data.video?.url === 'string' && /^https:\/\//.test(data.video.url) ? data.video.url : null
    return url && !data.error ? { status: 'done', url } : { status: 'failed', url: null }
  } catch { return processing }
}

export type Kling4TrialResult = {
  engineUsed: 'kling4' | 'seedance15_cap' | 'seedance15_fallback'
  costUsd: number; job?: Kling4TrialJob; reason?: string
}

/** Reserve first. A submit refusal selects Seedance without repeating Kling. */
export async function orchestrateKling4Trial(deps: {
  reserve: () => Promise<{ allowed: boolean; reason?: string; release?: () => Promise<unknown> }>
  submit: () => Promise<Kling4TrialJob>
}): Promise<Kling4TrialResult> {
  let reservation: { allowed: boolean; reason?: string; release?: () => Promise<unknown> }
  try { reservation = await deps.reserve() }
  catch { return { engineUsed: 'seedance15_fallback', costUsd: 0, reason: 'reservation_unavailable' } }
  if (!reservation.allowed) return {
    engineUsed: reservation.reason === 'cap' ? 'seedance15_cap' : 'seedance15_fallback', costUsd: 0, reason: reservation.reason,
  }
  try { return { engineUsed: 'kling4', costUsd: KLING4_TRIAL_COST_USD, job: await deps.submit() } }
  catch (error) {
    if (error instanceof Kling4TrialRefusedError) { // KINEO-K4-DEVOLUCAO-1111 — recusa explícita: nada cobrado → a reserva volta ao dia; o filme sai no motor barato
      try { await reservation.release?.() } catch { /* devolução é melhor esforço: falhar só deixa a reserva presa, como antes */ }
      return { engineUsed: 'seedance15_fallback', costUsd: 0, reason: 'provider_refused' }
    }
    return { engineUsed: 'seedance15_fallback', costUsd: error instanceof Kling4TrialPreflightError ? 0 : KLING4_TRIAL_COST_USD,
    reason: error instanceof Kling4TrialPreflightError ? 'provider_not_submitted' : 'provider_submit_failed' } }
}
