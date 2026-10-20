// KINEO-META95-ASSUNTO-1910 [TRAVA 8.2 — vai do fundador 19/10 "Vai pra meta do 95"] — A FALA NUNCA FICA COM BURACO.
//
// Diagnóstico da meta 95 (docs/DIAGNOSTICO-META-95-2026-10-19.md, causas C1/C2): a varredura anti-invenção da FALA escrita
// pela IA (removerDatasInventadas + scrubInventedSetting, só no caminho verbatim=false) apagava a palavra e deixava a frase
// com o buraco no meio — "In the year, a mysterious disappearance…" (7ef91122), "No Oceano, em, um submarino… Em, cientistas…
// O : uma área onde navios…" (2f3692ff), "साल पुरानी" com o número apagado (9de38488). A legenda mostrava "IN THE YEAR".
//
// Regra nova, determinística, sem modelo: a varredura roda FRASE A FRASE. Se a frase filtrada ficou com buraco (palavra de
// função pendurada antes de pontuação, pontuação dobrada, unidade de tempo sem número, frase anã), a saída é reescrever a
// frase inteira sem a oração do buraco (oração curta entre vírgulas: "In the year 1923," some inteira, "em 1968," some
// inteira) — e, quando nem isso fecha uma frase inteira, a frase ORIGINAL fica como está (o fato que a IA acrescentou é
// melhor do que uma frase quebrada: o fundador ouve o filme, não lê o filtro).
//
// A fala do roteiro colado (verbatim, contrato C1 "Use my script as is") nunca passa por aqui — quem chama guarda isso.
import { removerDatasInventadas } from '@/lib/hollywood/fidelidade'
import { scrubInventedSetting } from '@/lib/cinematic/visualPromptPolicy'

export interface FalaFiltrada {
  texto: string
  /** O que saiu da fala (datas, horas, nomes, épocas). */
  removidas: string[]
  /** Frases que o filtro quis cortar mas ficou com buraco: ficaram INTACTAS (com o que a IA escreveu). */
  mantidas: string[]
  /** Frases reescritas sem a oração do buraco ("In the year 1923, a…" → "A…"). */
  reescritas: string[]
}

// Palavras de função que, penduradas antes de pontuação ou no fim, denunciam o buraco (en · pt · es · fr · de · it · nl · id · tr · hi · ur).
const FUNCAO = [
  'in', 'on', 'at', 'of', 'the', 'a', 'an', 'during', 'since', 'from', 'to', 'by', 'into', 'until', 'till', 'for', 'with', 'near', 'around', 'about', 'under', 'over', 'after', 'before', 'exactly', 'precisely', 'roughly', 'approximately', 'named', 'called', 'is', 'was', 'were', 'are',
  'em', 'no', 'na', 'nos', 'nas', 'de', 'do', 'da', 'dos', 'das', 'o', 'os', 'as', 'um', 'uma', 'durante', 'desde', 'até', 'para', 'por', 'com', 'sobre', 'chamado', 'chamada', 'chamados', 'exatamente', 'é', 'era', 'foi', 'são',
  'en', 'el', 'la', 'los', 'las', 'un', 'una', 'del', 'al', 'hasta', 'llamado', 'llamada', 'exactamente', 'es', 'fue',
  'dans', 'le', 'les', 'une', 'du', 'des', 'au', 'aux', 'depuis', 'pendant', 'vers', 'pour', 'avec', 'sur', 'appelé', 'appelée',
  'im', 'am', 'der', 'die', 'den', 'dem', 'ein', 'eine', 'einen', 'einem', 'seit', 'bis', 'während', 'um', 'mit', 'von', 'vom', 'genannt',
  'nel', 'nella', 'il', 'lo', 'gli', 'della', 'dal', 'fino', 'chiamato', 'chiamata',
  'het', 'een', 'sinds', 'tot', 'tijdens',
  'pada', 'di', 'sejak',
  'yılında', 'adlı',
  'में', 'को', 'का', 'की', 'के', 'से', 'पर', 'तक',
  'میں', 'کو', 'کا', 'کی', 'کے', 'سے', 'پر', 'تک',
]
// Unidade de tempo que só denuncia buraco quando um NÚMERO saiu da frase ("2000 साल पुरानी" → "साल पुरानी"; "the year 1923," → "the year,").
const UNIDADE = ['year', 'years', 'ano', 'anos', 'año', 'años', 'an', 'ans', 'année', 'jahr', 'jahre', 'jahren', 'anno', 'anni', 'jaar', 'tahun', 'yıl', 'yılı', 'साल', 'वर्ष', 'سال', 'برس']
const FIM = String.raw`(?=\s*(?:[,.;:!?…)\]»”"]|$))`
const FUNCAO_PENDURADA_RE = new RegExp(String.raw`(?:^|[\s,(\[«“"])(?:${FUNCAO.join('|')})${FIM}`, 'iu')
const UNIDADE_RE = new RegExp(String.raw`(?:^|[\s,(])(?:${UNIDADE.join('|')})(?![\p{L}])`, 'iu')
const UNIDADE_COM_NUMERO_RE = new RegExp(String.raw`(?:\d[\d.,]*|\p{N}+)\s*(?:${UNIDADE.join('|')})(?![\p{L}])`, 'iu')
// Em modo de reparo (a frase chegou de outra camada, não se sabe o que saiu): só "the year," / "o ano," / "el año," — artigo definido + unidade, que pede número.
const UNIDADE_COM_ARTIGO_RE = new RegExp(String.raw`(?:^|\s)(?:the|o|do|no|el|del|im|nel|het)\s+(?:${UNIDADE.join('|')})(?![\p{L}])`, 'iu')
const PONTUACAO_DOBRADA_RE = /[,:;]\s*[,:;.]|^\s*[,:;.]|:\s*$|\(\s*\)|\s[,;]\s*$/u
const FRASE_RE = /[^.!?…।؟]+[.!?…।؟]*["”»)]?\s*/gu

const palavras = (s: string): number => (s.match(/[\p{L}\p{N}]+/gu) ?? []).length

/** A frase (ou oração) ficou com buraco? `numeroRemovido` liga a conferência da unidade de tempo sem número. */
export function temBuracoNaFala(frase: string, opts?: { numeroRemovido?: boolean; reparo?: boolean }): boolean {
  const s = String(frase ?? '').trim()
  if (!s) return false
  if (PONTUACAO_DOBRADA_RE.test(s)) return true
  if (FUNCAO_PENDURADA_RE.test(s)) return true
  if (opts?.numeroRemovido && UNIDADE_RE.test(s) && !UNIDADE_COM_NUMERO_RE.test(s)) return true
  if (opts?.reparo && UNIDADE_COM_ARTIGO_RE.test(s) && !UNIDADE_COM_NUMERO_RE.test(s)) return true
  return false
}

/** Divide em frases preservando a pontuação (ponto, !, ?, …, danda, ponto de interrogação árabe). */
export function frasesDaFala(texto: string): string[] {
  const m = String(texto ?? '').match(FRASE_RE) ?? []
  return m.filter((f) => f.trim().length > 0)
}

const capitalizar = (s: string): string => s.replace(/^(\s*["“«(]?)(\p{Ll})/u, (_m, p, c) => p + c.toUpperCase())

/**
 * Tira da frase as orações curtas (≤ 4 palavras, entre vírgulas) que ficaram com buraco. Devolve null quando o que sobra
 * não é uma frase inteira (menos de 4 palavras, ainda com buraco, ou o buraco está numa oração longa).
 */
export function semOracaoDoBuraco(frase: string, opts: { numeroRemovido?: boolean; reparo?: boolean }): string | null {
  const s = String(frase ?? '').trim()
  const pontoFinal = (s.match(/[.!?…।؟]+["”»)]?$/u) ?? [''])[0]
  const corpo = pontoFinal ? s.slice(0, s.length - pontoFinal.length) : s
  if (!corpo.includes(',')) return null
  const oracoes = corpo.split(',').map((o) => o.trim())
  const ficam: string[] = []
  let tiradas = 0
  for (const o of oracoes) {
    if (!o) { tiradas++; continue }
    if (temBuracoNaFala(o, opts)) {
      if (palavras(o) > 4) return null
      tiradas++
      continue
    }
    ficam.push(o)
  }
  if (tiradas === 0) return null
  const resto = ficam.join(', ')
  if (palavras(resto) < 4) return null
  const saida = capitalizar(resto) + (pontoFinal || '.')
  return temBuracoNaFala(saida, opts) ? null : saida
}

/**
 * A varredura anti-invenção da fala, frase a frase, sem deixar buraco.
 *   · `nomes` (padrão true): além de data/hora, nome próprio e época fora do contexto (scrubInventedSetting);
 *   · `repararExistentes`: frases que JÁ chegaram com buraco (varredura anterior, em outra camada) perdem a oração do buraco
 *     quando dá; senão ficam como estão.
 */
export function filtrarFalaSemBuraco(texto: string, contexto: string, opts?: { nomes?: boolean; repararExistentes?: boolean }): FalaFiltrada {
  const src = String(texto ?? '')
  const vazio: FalaFiltrada = { texto: src, removidas: [], mantidas: [], reescritas: [] }
  if (!src.trim()) return vazio
  const nomes = opts?.nomes !== false
  const out: string[] = []
  const removidas: string[] = []
  const mantidas: string[] = []
  const reescritas: string[] = []
  for (const bruta of frasesDaFala(src)) {
    const espacoFinal = (bruta.match(/\s*$/) ?? [''])[0]
    const frase = bruta.trim()
    const r = removerDatasInventadas(frase, contexto)
    const r2 = nomes ? scrubInventedSetting(r.texto, contexto) : { text: r.texto, removed: [] as string[] }
    const tiradas = [...r.removidas, ...r2.removed]
    if (tiradas.length === 0) {
      if (opts?.repararExistentes && temBuracoNaFala(frase, { reparo: true })) {
        const reparada = semOracaoDoBuraco(frase, { reparo: true })
        if (reparada) { reescritas.push(frase); out.push(reparada + espacoFinal); continue }
      }
      out.push(bruta)
      continue
    }
    const numeroRemovido = tiradas.some((t) => /\d/.test(t))
    const candidata = r2.removed.length ? r2.text : r.texto
    if (!temBuracoNaFala(candidata, { numeroRemovido })) { removidas.push(...tiradas); out.push(candidata + espacoFinal); continue }
    const reescrita = semOracaoDoBuraco(candidata, { numeroRemovido })
    if (reescrita) { removidas.push(...tiradas); reescritas.push(frase); out.push(reescrita + espacoFinal); continue }
    mantidas.push(frase)
    out.push(bruta)
  }
  const resultado = out.join('')
  if (removidas.length === 0 && reescritas.length === 0) return { ...vazio, mantidas }
  return { texto: resultado.trim() === src.trim() ? src : resultado, removidas, mantidas, reescritas }
}
