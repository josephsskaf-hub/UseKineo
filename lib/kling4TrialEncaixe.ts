// KINEO-K4-SEMPRE-0511 [TRAVA 8.2 — fundador 05/11: "a gente poderia dar Kling 4 para todas as pessoas... ficar naqueles 15 segundos"; "vai"]
// O filme grátis do Kling 4 é UM clipe de 15 s. Quando a fala MEDIDA passa de 15,5 s, antes ela ia direto ao Seedance de reserva
// (02–05/11: 7 de 16 filmes, de 16,6 a 22,7 s). Agora o texto é encurtado até caber e a voz é medida de novo, ANTES do POST pago.
// O Seedance continua só como reserva: encurtar falhou, ficou sem medida, erro do Kling 4 ou teto do dia. Nada aqui lança.
// Só apaga e encurta: nenhum fato novo. A tela avisa que o texto foi encurtado e oferece a versão de 60 s.
// Guardião: scripts/test-k4-sempre-0511.mjs.
import { perguntaSemantica, type OpcoesSemanticas } from '@/lib/cinematic/sujeitoObrigatorio'
import { orcamentoPorSecao, type FalaK4 } from '@/lib/kling4TrialScript'
import { narrationWordCount } from '@/lib/textLanguage'

/** Onde a fala encurtada mira (a medição aceita até 15,5 s): deixa folga para a voz real. */
export const K4_ALVO_DO_ENCAIXE_SEGUNDOS = 14.6
/** KINEO-K4-ENCAIXE-MOTIVO-1111 — os pontos em que o encaixe desiste (evento kling4_encaixe_falhou). */
export type MotivoDoEncaixe = 'sem_medida' | 'prazo' | 'alvo_pequeno' | 'encurtar_sem_texto' | 'encurtado_reprovado' | 'remedida_falhou' | 'curto_demais' | 'rodadas_esgotadas' | 'erro'
export const ENCAIXE_FALHOU_EVENTO = 'kling4_encaixe_falhou'
/** Abaixo disso o filme de 15 s ficaria com fala curta demais: não adota. */
export const K4_PISO_DO_ENCAIXE_SEGUNDOS = 10
export const K4_RODADAS_DO_ENCAIXE = 3 // o modelo erra a contagem por poucas palavras (7 textos reais, 05/11): quem decide é a voz medida, rodada a rodada
export const K4_PRAZO_DO_ENCAIXE_MS = 30_000
const MIN_PALAVRAS_POR_CENA = 3
const FIM_DE_FRASE = /[.!?…؟۔।。！？]["'”’»)\]]*\s*$/u

const palavrasDe = (t: string) => (t.normalize('NFC').toLowerCase().match(/[\p{L}\p{M}\p{N}]+/gu) ?? [])
const ultimaFrase = (t: string) => t.trim().split(/(?<=[.!?…؟۔।。！？])\s+/u).filter(Boolean).pop() ?? ''

/** Quantas palavras cabem, pelo ritmo que ESTA voz acabou de falar ESTE texto. */
export function alvoDoEncaixe(palavras: number, segundos: number): number {
  if (!(palavras > 0) || !(segundos > 0)) return 0
  return Math.floor((palavras * K4_ALVO_DO_ENCAIXE_SEGUNDOS) / segundos)
}

/** O pedido ao modelo: a mesma quantidade de cenas, só apagando, com orçamento por cena. */
export function pedidoDoEncaixe(falas: readonly string[], alvo: number, language?: unknown): { system: string; user: string } {
  const limites = orcamentoPorSecao(falas.map((f) => narrationWordCount(f, language)), alvo)
  return {
    system: 'You shorten film narration so it fits a 15-second clip. Only delete words or shorten a clause. Never add a fact, a name, a number or a new idea. Never translate: keep the exact language of each scene. Every scene must stay a complete, natural spoken sentence. Keep the hook of the first scene and the final payoff of the last scene, including any number in it. Return the same number of scenes, in the same order.',
    user: `Shorten these ${falas.length} scenes to at most ${alvo} spoken words in total. Word budget: ${falas.map((f, i) => `scene ${i + 1}: ${narrationWordCount(f, language)} words now, at most ${limites[i]}`).join('; ')}.\n\n${JSON.stringify({ scenes: falas })}`,
  }
}

/** A versão encurtada fica? Mesmas cenas, menos palavras, sem palavra nova, frases inteiras e o final preservado. */
export function encaixeServe(antes: readonly string[], depois: readonly string[], language?: unknown): boolean {
  if (depois.length !== antes.length || !depois.length) return false
  if (depois.some((f) => narrationWordCount(f, language) < MIN_PALAVRAS_POR_CENA || !FIM_DE_FRASE.test(f))) return false
  const conta = (l: readonly string[]) => l.reduce((n, f) => n + narrationWordCount(f, language), 0)
  if (conta(depois) >= conta(antes)) return false // o tamanho certo quem confere é a voz, não a contagem
  const novas = depois.flatMap((f) => palavrasDe(f))
  const velhas = new Set(antes.flatMap((f) => palavrasDe(f)))
  // Nenhum número novo, e no máximo 10% de palavra fora do texto (flexão ao encurtar uma oração).
  if (novas.some((w) => /\p{N}/u.test(w) && !velhas.has(w))) return false
  if (novas.filter((w) => !velhas.has(w)).length > novas.length * 0.1) return false
  // A revelação: todo número da última frase de antes continua, e ao menos um terço das palavras fortes dela.
  const fortes = palavrasDe(ultimaFrase(antes[antes.length - 1])).filter((w) => w.length >= 4 || /\p{N}/u.test(w))
  const finalNovo = new Set(palavrasDe(depois[depois.length - 1]))
  if (fortes.some((w) => /\p{N}/u.test(w) && !finalNovo.has(w))) return false
  return !fortes.length || fortes.filter((w) => finalNovo.has(w)).length / fortes.length >= 1 / 3
}

export interface EncaixeK4 {
  falas: string[]
  fala: FalaK4
  rastro: { de: { palavras: number; segundos: number | null }; para: { palavras: number; segundos: number | null }; rodadas: number }
}

const LER_CENAS = (o: unknown): string[] | null => {
  const cenas = (o as { scenes?: unknown } | null)?.scenes
  return Array.isArray(cenas) && cenas.every((c) => typeof c === 'string' && c.trim()) ? cenas.map((c: string) => c.replace(/[\]}]+\s*$/u, '').trim()) : null // o modelo às vezes deixa o fim do JSON grudado no texto (texto com aspas, a9c7e458)
}

export async function encurtarFalas(falas: readonly string[], alvo: number, language: unknown, opcoes: OpcoesSemanticas = {}): Promise<string[] | null> {
  const { system, user } = pedidoDoEncaixe(falas, alvo, language)
  const r = await perguntaSemantica<string[]>({
    system, user, nome: 'k4_encaixe', maxTokens: 900, ler: LER_CENAS,
    schema: { type: 'object', additionalProperties: false, required: ['scenes'], properties: { scenes: { type: 'array', items: { type: 'string' } } } },
  }, { model: 'gpt-4o', timeoutMs: 10_000, tentativasExtras: 0, ...opcoes })
  return r.ok ? r.valor : null
}

/**
 * Encurta e mede de novo, no máximo K4_RODADAS_DO_ENCAIXE vezes e dentro de K4_PRAZO_DO_ENCAIXE_MS. Devolve só o que a VOZ confirmou
 * caber nos 15,5 s. Qualquer falha devolve null e o filme segue pela reserva, com o texto inteiro. Nunca lança.
 */
export async function encaixarFalaNoKling4(a: {
  falas: readonly string[]
  fala: FalaK4
  language: unknown
  medir: (texto: string) => Promise<FalaK4>
  encurtar?: (falas: readonly string[], alvo: number) => Promise<string[] | null>
  agora?: () => number
  prazoMs?: number
  /** KINEO-K4-ENCAIXE-MOTIVO-1111 — por que o encaixe desistiu (o filme vai à reserva); sem isto a falha só existia no console. */
  aoFalhar?: (motivo: MotivoDoEncaixe, detalhe?: Record<string, unknown>) => void
}): Promise<EncaixeK4 | null> {
  const agora = a.agora ?? Date.now
  const inicio = agora()
  const prazo = a.prazoMs ?? K4_PRAZO_DO_ENCAIXE_MS
  const encurtar = a.encurtar ?? ((falas, alvo) => encurtarFalas(falas, alvo, a.language))
  const conta = (l: readonly string[]) => l.reduce((n, f) => n + narrationWordCount(f, a.language), 0)
  try {
    const falha = (motivo: MotivoDoEncaixe, detalhe?: Record<string, unknown>): null => { try { a.aoFalhar?.(motivo, detalhe) } catch { /* o relato nunca derruba o filme */ } return null } // KINEO-K4-ENCAIXE-MOTIVO-1111
    if (a.fala.seconds === null) return falha('sem_medida')
    let atuais = [...a.falas]
    let segundos = a.fala.seconds
    for (let rodada = 1; rodada <= K4_RODADAS_DO_ENCAIXE; rodada++) {
      if (agora() - inicio >= prazo) return falha('prazo', { rodada }) // KINEO-K4-ENCAIXE-MOTIVO-1111
      const alvo = alvoDoEncaixe(conta(atuais), segundos)
      if (alvo < atuais.length * MIN_PALAVRAS_POR_CENA) return falha('alvo_pequeno', { rodada, alvo, segundos }) // KINEO-K4-ENCAIXE-MOTIVO-1111
      const novas = await encurtar(atuais, alvo)
      if (!novas) return falha('encurtar_sem_texto', { rodada, alvo }) // KINEO-K4-ENCAIXE-MOTIVO-1111
      if (!encaixeServe(atuais, novas, a.language)) return falha('encurtado_reprovado', { rodada, alvo, palavras: conta(novas) }) // KINEO-K4-ENCAIXE-MOTIVO-1111
      const medida = await a.medir(novas.join(' '))
      if (medida.seconds === null) return falha('remedida_falhou', { rodada }) // KINEO-K4-ENCAIXE-MOTIVO-1111
      if (medida.cabe) {
        if (medida.seconds < K4_PISO_DO_ENCAIXE_SEGUNDOS) return falha('curto_demais', { rodada, segundos: medida.seconds }) // KINEO-K4-ENCAIXE-MOTIVO-1111
        return {
          falas: novas, fala: medida,
          rastro: { de: { palavras: conta(a.falas), segundos: a.fala.seconds }, para: { palavras: conta(novas), segundos: medida.seconds }, rodadas: rodada },
        }
      }
      atuais = novas
      segundos = medida.seconds
    }
    return falha('rodadas_esgotadas', { segundos }) // KINEO-K4-ENCAIXE-MOTIVO-1111
  } catch (e) {
    console.warn('[kling4-trial] KINEO-K4-SEMPRE-0511 encurtar falhou (→ reserva):', e instanceof Error ? e.message : String(e))
    try { a.aoFalhar?.('erro', { mensagem: (e instanceof Error ? e.message : String(e)).slice(0, 200) }) } catch { /* nunca derruba */ } // KINEO-K4-ENCAIXE-MOTIVO-1111
    return null
  }
}
