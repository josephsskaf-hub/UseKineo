// KINEO-FINAL-RESPOSTA-0111 [TRAVA 8.2 — vai do fundador 01/11 "vai tudo" (melhorias)] — O FIM ENTREGA O QUE O GANCHO PROMETEU.
//
// Revisor de vídeos, 01/11 (FINAL_FRACO): Seedance 1.5 de 62 s, "o que a NASA nunca anunciou sobre Marte" — o filme acaba sem
// revelar nada (e, nos Kling 4 grátis, o fim repetia a abertura). Duas pontas, as duas determinísticas:
//   1. ESCRITOR (modo IA; "Use my script as is" nunca passa pelo escritor e continua literal): finalFracoDoRoteiro lê a ÚLTIMA
//      frase do PAYOFF (sem o CTA de rede social) e reprova pergunta solta, frase de clima ("the truth is out there", "o mistério
//      continua") e frase que só repete o HOOK. O /api/generate-script já tem UMA nova tentativa por roteiro com problema; este
//      motivo entra nela (sem chamada a mais quando o roteiro está bom).
//   2. DESCRITOR DE CENAS: comRevelacaoNoFim — a ÚLTIMA cena que não mostra a revelação da última fala ganha "Final moment of the
//      story, clearly shown: <revelação>." logo depois da trava do meio — a MESMA frase do eixo de desfecho de comDesfechoDaFala
//      (KINEO-DESFECHO-3010 / be6d3af37 KINEO-LEGENDA-CENA-3110), que só disparava com then/finally/depois. Só fala em inglês
//      (o prompt da cena é inglês; em outra língua quem cuida é a regra do descritor, que lê a fala em qualquer língua).
import { isSocialCta } from '@/lib/shortFilmScript'

export const FINAL_RESPOSTA_VERSAO = 'final_resposta_0111_v1' as const
export type FinalFraco = 'pergunta' | 'clima' | 'repete_gancho' | 'sem_revelacao'

const CABECALHO_RE = /^\s*(HOOK|GANCHO|MICRO REWARD ?\d*|MICRO RECOMPENSA ?\d*|ESCALATION|ESCALADA|RHYTHM|RITMO|PAYOFF|PAGAMENTO|RECOMPENSA FINAL)\b\s*(?:\([^)]*\))?\s*:?/gim
const semPistas = (t: string) => t.replace(/\[[^\]]*\]/g, ' ').replace(/\s+/g, ' ').trim()

/** O texto falado de cada seção ("HOOK", "PAYOFF"…), sem pistas [Pexels: …]. */
function secoes(script: string): Map<string, string> {
  const out = new Map<string, string>()
  const marcas = [...String(script ?? '').matchAll(CABECALHO_RE)]
  marcas.forEach((m, k) => {
    const nome = m[1].toUpperCase().replace(/\s*\d+$/, '').replace('GANCHO', 'HOOK').replace(/^(?:PAGAMENTO|RECOMPENSA FINAL)$/, 'PAYOFF')
    const fim = k + 1 < marcas.length ? marcas[k + 1].index : script.length
    out.set(nome, semPistas(script.slice((m.index ?? 0) + m[0].length, fim)))
  })
  return out
}
const frasesDe = (t: string) => String(t ?? '').split(/(?<=[.!?…؟。！？])\s+/).map((s) => s.trim()).filter(Boolean)

// Frase de clima / promessa sem entrega (en/pt/es). Pergunta é testada à parte (qualquer língua).
const CLIMA: ReadonlyArray<RegExp> = [
  /what if i told you/i, /\bno one (?:knows|knew|will ever know)\b/i, /\bnobody (?:knows|knew)\b/i,
  /(?:remains?|still|is still)\s+(?:a |an |the )?(?:mystery|unsolved|unknown)/i, /we (?:may|might|will) never know/i,
  /the (?:truth|answer) (?:is|lies|remains) (?:still )?(?:out there|hidden|buried|waiting)/i, /\bstill (?:watching|out there|waiting|hiding)\b/i,
  /only time will tell/i, /stay tuned/i, /to be continued/i, /the (?:mystery|story|search) (?:continues|goes on|isn'?t over)/i,
  /what (?:else )?(?:are|is) (?:they|nasa|it|he|she) (?:hiding|not telling)/i, /you won'?t believe/i,
  /(?:answer|truth|secret) (?:will|may|might|could) (?:shock|amaze|surprise|stun)/i,
  /ningu[ée]m (?:sabe|soube|nunca saber[áa])/i, /(?:continua|segue|permanece|ainda [ée]) (?:sendo )?um mist[ée]rio/i, /talvez nunca (?:saibamos|saberemos)/i,
  /a verdade (?:est[áa]|continua|segue) (?:l[áa] fora|escondida|enterrada)/i, /s[óo] o tempo (?:dir[áa]|vai dizer)/i, /o mist[ée]rio continua/i, /fique ligad[oa]/i,
  /nadie (?:sabe|lo sabe|supo)/i, /(?:sigue|contin[úu]a|permanece) (?:siendo )?un misterio/i, /quiz[áa]s? nunca lo sepamos/i,
  /la verdad (?:est[áa]|sigue) (?:ah[íi] fuera|oculta|escondida)/i, /s[óo]lo el tiempo lo dir[áa]/i, /el misterio contin[úu]a/i,
]
const VAZIAS = new Set(['that', 'this', 'what', 'with', 'from', 'about', 'there', 'their', 'they', 'have', 'been', 'will', 'just', 'even', 'only', 'never', 'ever', 'still', 'thats', 'isso', 'esse', 'essa', 'isto', 'para', 'como', 'mais', 'muito', 'sobre', 'nunca', 'ainda', 'esto', 'pero', 'sobre'])
const palavrasDe = (t: string) => String(t ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/['’]/g, '').split(/[^\p{L}\p{N}]+/u).filter((w) => (w.length >= 4 || /\d/.test(w)) && !VAZIAS.has(w))

/** A última frase de fala do roteiro (PAYOFF sem CTA; sem PAYOFF, o fim do texto). */
export function ultimaFraseDoRoteiro(script: string): string | null {
  const s = secoes(script)
  const corpo = s.get('PAYOFF') ?? semPistas(String(script ?? '').replace(CABECALHO_RE, ' '))
  const frases = frasesDe(corpo).filter((f) => !isSocialCta(f))
  return frases[frases.length - 1] ?? null
}

/** O fim é fraco? pergunta solta, clima, eco do HOOK ou PAYOFF vazio — null quando a última frase entrega. */
export function finalFracoDoRoteiro(script: string): FinalFraco | null {
  const ultima = ultimaFraseDoRoteiro(script)
  if (!ultima) return 'sem_revelacao'
  if (/[?？؟]["'”’)\]]*$/.test(ultima)) return 'pergunta'
  if (CLIMA.some((re) => re.test(ultima))) return 'clima'
  const gancho = secoes(script).get('HOOK')
  if (gancho) {
    const g = new Set(palavrasDe(gancho)), u = palavrasDe(ultima)
    const novas = u.filter((w) => !g.has(w)).length
    if (u.length >= 2 && (u.length - novas) / u.length >= 0.6 && novas <= 1) return 'repete_gancho'
  }
  return null
}

/** O pedido de correção que vai na nova tentativa do escritor (inglês, como o resto do reforço). */
export function problemaDoFinal(motivo: FinalFraco): string {
  const porque = { pergunta: 'it is a question', clima: 'it is a mood line that reveals nothing', repete_gancho: 'it only repeats the HOOK', sem_revelacao: 'the PAYOFF has no spoken reveal' }[motivo]
  return `the LAST sentence of the PAYOFF must be the concrete answer the HOOK promised (the specific fact, number, name, mechanism or outcome) — yours fails because ${porque}`
}

// ─── 2. A última cena mostra a revelação ────────────────────────────────────────────────────────────────────────────
const MARCA_DESFECHO = 'Final moment of the story, clearly shown:'
const INGLES_RE = /\b(?:the|is|was|are|were|it|of|and|to|in|has|had|that)\b/i
const NAO_LATINA_RE = /[^\p{Script=Latin}\p{N}\p{P}\p{S}\s]/u

/** A revelação da última fala: a última frase que não é CTA nem pergunta, depois da pausa "…" se houver (2 a 16 palavras). */
export function revelacaoDaFala(fala: string): string | null {
  const frases = frasesDe(fala).filter((f) => !isSocialCta(f) && !/[?？؟]["'”’)\]]*$/.test(f))
  let ultima = frases[frases.length - 1] ?? ''
  const pausa = ultima.split(/\.{3}|…|\s[—–]\s/)
  const depois = pausa[pausa.length - 1].trim()
  if (pausa.length > 1 && depois.split(/\s+/).filter(Boolean).length >= 2) ultima = depois
  ultima = ultima.replace(/^[\s,;:—–-]+|[\s.!…]+$/g, '').trim()
  const n = ultima.split(/\s+/).filter(Boolean).length
  return n >= 2 && n <= 16 ? ultima : null
}

/** A última cena que não mostra a revelação ganha a frase do eixo de desfecho logo depois da trava "Film visual medium: …". */
export function comRevelacaoNoFim(prompt: string, falaFinal: string): { prompt: string; revelacao: string | null; aplicada: boolean } {
  const p = String(prompt ?? '')
  const revelacao = revelacaoDaFala(falaFinal)
  if (!revelacao || p.includes(MARCA_DESFECHO) || !INGLES_RE.test(revelacao) || NAO_LATINA_RE.test(revelacao)) return { prompt: p, revelacao, aplicada: false }
  const chave = palavrasDe(revelacao)
  const noPrompt = new Set(palavrasDe(p).map((w) => w.slice(0, 5)))
  if (chave.length === 0 || chave.filter((w) => noPrompt.has(w.slice(0, 5))).length * 2 >= chave.length) return { prompt: p, revelacao, aplicada: false }
  const lock = /^Film visual medium: .+?\. /.exec(p)?.[0] ?? ''
  return { prompt: `${lock}${MARCA_DESFECHO} ${revelacao}. ${p.slice(lock.length)}`, revelacao, aplicada: true }
}
