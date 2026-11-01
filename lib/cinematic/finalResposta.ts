// KINEO-FINAL-RESPOSTA-0111 [TRAVA 8.2 — vai do fundador 01/11 "vai tudo" (melhorias)] — O FIM ENTREGA O QUE O GANCHO PROMETEU.
//
// Revisor de vídeos, 01/11 (FINAL_FRACO): Seedance 1.5 de 62 s, "o que a NASA nunca anunciou sobre Marte" — o filme acaba sem
// revelar nada (e, nos Kling 4 grátis, o fim repetia a abertura). Duas pontas, as duas determinísticas:
//   1. ESCRITOR (modo IA; "Use my script as is" nunca passa pelo escritor e continua literal): finalFracoDoRoteiro lê a ÚLTIMA
//      frase do PAYOFF (sem o CTA de rede social) e reprova SÓ pergunta solta, frase que repete o HOOK e — o caso do Seedance —
//      frase de pura promessa ("the truth is out there", "o mistério continua") SEM nenhum fato novo. Frase concreta passa: com
//      número ("3,800 meters down"), nome/lugar que o HOOK não tinha ("Valley of the Kings") ou revelação depois de "but"
//      ("No one knew it then, but the spikes were methane") — v2, revisão adversarial da leva 2: cada falso positivo custava uma
//      chamada a mais ao gpt-4o. O /api/generate-script já tem UMA nova tentativa por roteiro com problema; este motivo entra nela.
//   2. DESCRITOR DE CENAS: comRevelacaoNoFim — a ÚLTIMA cena que não mostra a revelação da última fala ganha "Final moment of the
//      story, clearly shown: <revelação>." logo depois da trava do meio — a MESMA frase do eixo de desfecho de comDesfechoDaFala
//      (KINEO-DESFECHO-3010 / be6d3af37 KINEO-LEGENDA-CENA-3110). Só fala em inglês. v2: nunca entra crua com nome de gente (nome
//      completo, "was X", título + nome — gente é do elenco/folha de personagem), nunca entra frase fraca (clima/pergunta), o
//      "And/But/So" do começo sai, e a rota aplica ANTES do elenco/época (que passa a ver a revelação como qualquer outra cena).
import { isSocialCta } from '@/lib/shortFilmScript'

export const FINAL_RESPOSTA_VERSAO = 'final_resposta_0111_v2' as const
export type FinalFraco = 'pergunta' | 'clima' | 'repete_gancho' | 'sem_revelacao'

// Cabeçalho de seção: com dois-pontos (qualquer caixa) ou em MAIÚSCULAS sem dois-pontos. "Ritmo de vida…" numa linha de fala não é cabeçalho.
const CABECALHO_RE = /^\s*(HOOK|GANCHO|MICRO REWARD ?\d*|MICRO RECOMPENSA ?\d*|ESCALATION|ESCALADA|RHYTHM|RITMO|PAYOFF|PAGAMENTO|RECOMPENSA FINAL)\b\s*(?:\([^)]*\))?\s*(:?)/gim
const ehCabecalho = (m: RegExpMatchArray) => m[2] === ':' || m[1] === m[1].toUpperCase()
const marcasDe = (script: string) => [...String(script ?? '').matchAll(CABECALHO_RE)].filter(ehCabecalho)
const semPistas = (t: string) => t.replace(/\[[^\]]*\]/g, ' ').replace(/\s+/g, ' ').trim()

/** O texto falado de cada seção ("HOOK", "PAYOFF"…), sem pistas [Pexels: …]. */
function secoes(script: string): Map<string, string> {
  const out = new Map<string, string>()
  const texto = String(script ?? '')
  const marcas = marcasDe(texto)
  marcas.forEach((m, k) => {
    const nome = m[1].toUpperCase().replace(/\s*\d+$/, '').replace('GANCHO', 'HOOK').replace(/^(?:PAGAMENTO|RECOMPENSA FINAL)$/, 'PAYOFF')
    const fim = k + 1 < marcas.length ? marcas[k + 1].index : texto.length
    out.set(nome, semPistas(texto.slice((m.index ?? 0) + m[0].length, fim)))
  })
  return out
}
function semCabecalhos(script: string): string {
  let out = String(script ?? '')
  for (const m of marcasDe(out).reverse()) out = out.slice(0, m.index) + ' ' + out.slice((m.index ?? 0) + m[0].length)
  return out
}
const frasesDe = (t: string) => String(t ?? '').split(/(?<=[.!?…؟。！？])\s+/).map((s) => s.trim()).filter(Boolean)
// frase INTEIRA: a reticência ("..."/"…") é pausa dentro da frase, não fim — "The mystery remains unsolved... swallowed by time" é uma frase só
const frasesInteirasDe = (t: string) => String(t ?? '').split(/(?<=(?<!\.)\.(?!\.)|[!?؟。！？])\s+/).map((s) => s.trim()).filter(Boolean)

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
const semAcento = (t: string) => String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '')
const palavrasDe = (t: string) => semAcento(String(t ?? '').toLowerCase()).replace(/['’]/g, '').split(/[^\p{L}\p{N}]+/u).filter((w) => (w.length >= 4 || /\d/.test(w)) && !VAZIAS.has(w))

const NUMERO_POR_EXTENSO = /\b(?:two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|twenty|thirty|forty|fifty|hundreds?|thousands?|millions?|billions?|dois|duas|tr[êe]s|quatro|cinco|seis|sete|oito|nove|dez|cem|mil|milh[õo]es|milh[ãa]o|bilh[õo]es|cuatro|siete|ocho|nueve|diez|cien|millones|mill[óo]n)\b/i
const REVELACAO_DEPOIS_DO_MAS = /,?\s+(?:but|yet|mas|por[ée]m|pero|sin embargo)\s+/i
const VERBO_DE_REVELACAO = /\b(?:was|were|is|are|came from|turned out|era|eram|foi|foram|[ée]|s[ãa]o|vinha|fue|fueron|es|son|ven[íi]a)\b/i
const LIGACAO_INICIAL = /^(?:and|but|so|then|yet|or|e|mas|ent[ãa]o|y|pero|entonces)\s+/i
// palavra com inicial maiúscula (ou sigla) que não é a 1ª da frase
const nomesProprios = (frase: string): string[] => {
  const corpo = frase.replace(/^[^\p{L}\p{N}]+/u, '')
  const tokens = corpo.split(/\s+/).map((w) => w.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '')).filter(Boolean)
  return tokens.slice(1).filter((w) => /^\p{Lu}/u.test(w) && w !== 'I')
}

/** A frase traz fato NOVO em relação ao HOOK? número, nome/lugar que o HOOK não tinha, ou revelação depois de "but/mas/pero". */
export function temFatoNovo(frase: string, gancho = ''): boolean {
  const f = String(frase ?? '')
  if (/\d/.test(f) || NUMERO_POR_EXTENSO.test(f)) return true
  const g = semAcento(String(gancho ?? '').toLowerCase())
  if (nomesProprios(f).some((n) => !g.includes(semAcento(n.toLowerCase())))) return true
  const partes = f.split(REVELACAO_DEPOIS_DO_MAS)
  if (partes.length > 1) {
    const depois = partes[partes.length - 1]
    if (VERBO_DE_REVELACAO.test(depois) && palavrasDe(depois).length >= 2 && !CLIMA.some((re) => re.test(depois))) return true
  }
  return false
}

const ehPergunta = (f: string) => /[?？؟]["'”’)\]]*$/.test(f)
/** Pura promessa: frase de clima sem nenhum fato novo. */
export function ehClimaSemFato(frase: string, gancho = ''): boolean {
  return CLIMA.some((re) => re.test(frase)) && !temFatoNovo(frase, gancho)
}

const corpoFinal = (script: string) => secoes(script).get('PAYOFF') ?? semPistas(semCabecalhos(script))
/** A última frase de fala do roteiro (PAYOFF sem CTA; sem PAYOFF, o fim do texto). */
export function ultimaFraseDoRoteiro(script: string): string | null {
  const frases = frasesDe(corpoFinal(script)).filter((f) => !isSocialCta(f))
  return frases[frases.length - 1] ?? null
}
const ultimaFraseInteira = (texto: string) => { const todas = frasesInteirasDe(texto).filter((f) => !isSocialCta(f)); return todas[todas.length - 1] ?? '' }

/** O fim é fraco? pergunta solta, eco do HOOK, promessa sem fato novo ou PAYOFF vazio — null quando a última frase entrega. */
export function finalFracoDoRoteiro(script: string): FinalFraco | null {
  const ultima = ultimaFraseDoRoteiro(script)
  if (!ultima) return 'sem_revelacao'
  if (ehPergunta(ultima)) return 'pergunta'
  const gancho = secoes(script).get('HOOK') ?? ''
  if (gancho) {
    const g = new Set(palavrasDe(gancho)), u = palavrasDe(ultima)
    const novas = u.filter((w) => !g.has(w)).length
    if (u.length >= 2 && (u.length - novas) / u.length >= 0.6 && novas <= 1 && !/\d/.test(ultima)) return 'repete_gancho'
  }
  if (ehClimaSemFato(ultima, gancho) || ehClimaSemFato(ultimaFraseInteira(corpoFinal(script)), gancho)) return 'clima'
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
const TITULO_RE = /\b(?:Mr|Mrs|Ms|Dr|Sir|Lady|Lord|King|Queen|Prince|Princess|President|General|Captain|Colonel|Saint|St|Pope|Emperor|Pharaoh)\.?\s+\p{Lu}/u
const GENTE_ANTES_DO_NOME_RE = /\b(?:was|by|named|called|man|woman|boy|girl|who|whom|is|were)\s+\p{Lu}\p{Ll}+/u

/** A revelação tem nome de GENTE? Nome completo (2 maiúsculas seguidas), título + nome, ou "was/by/named X". Gente é do elenco. */
export function revelacaoTemNomeDeGente(revelacao: string): boolean {
  const r = String(revelacao ?? '')
  const corpo = r.replace(/^\s*\S+\s*/, ' ') // a 1ª palavra da frase sempre tem maiúscula
  return /\p{Lu}[\p{Ll}'’-]+\s+\p{Lu}[\p{Ll}'’-]+/u.test(corpo) || TITULO_RE.test(r) || GENTE_ANTES_DO_NOME_RE.test(corpo)
}

/** A revelação da última fala: a última frase que não é CTA nem pergunta, depois da pausa "…" se houver (2 a 16 palavras). Frase fraca = null. */
export function revelacaoDaFala(fala: string, gancho = ''): string | null {
  const frases = frasesInteirasDe(fala).filter((f) => !isSocialCta(f) && !ehPergunta(f))
  const inteira = frases[frases.length - 1] ?? ''
  if (!inteira || ehClimaSemFato(inteira, gancho)) return null
  let ultima = frasesDe(inteira).filter((f) => !ehPergunta(f)).pop() ?? inteira
  const pausa = ultima.split(/\.{3}|…|\s[—–]\s/)
  const depois = pausa[pausa.length - 1].trim()
  if (pausa.length > 1 && depois.split(/\s+/).filter(Boolean).length >= 2) ultima = depois
  // "No one knew it then, but the spikes were methane": a revelação é o que vem depois do "but"
  const aposMas = ultima.split(REVELACAO_DEPOIS_DO_MAS)
  if (aposMas.length > 1 && aposMas[aposMas.length - 1].split(/\s+/).filter(Boolean).length >= 2) ultima = aposMas[aposMas.length - 1]
  ultima = ultima.replace(/^[\s,;:—–-]+|[\s.!…]+$/g, '').replace(LIGACAO_INICIAL, '').trim()
  if (ehClimaSemFato(ultima, gancho)) return null
  const n = ultima.split(/\s+/).filter(Boolean).length
  return n >= 2 && n <= 16 ? ultima : null
}

/** A última cena que não mostra a revelação ganha a frase do eixo de desfecho logo depois da trava "Film visual medium: …". */
export function comRevelacaoNoFim(prompt: string, falaFinal: string, gancho = ''): { prompt: string; revelacao: string | null; aplicada: boolean; motivo: string } {
  const p = String(prompt ?? '')
  const revelacao = revelacaoDaFala(falaFinal, gancho)
  const nada = (motivo: string) => ({ prompt: p, revelacao, aplicada: false, motivo })
  if (!revelacao) return nada('sem_revelacao_forte')
  if (p.includes(MARCA_DESFECHO)) return nada('desfecho_ja_aplicado')
  if (!INGLES_RE.test(revelacao) || NAO_LATINA_RE.test(revelacao)) return nada('fala_em_outra_lingua')
  if (revelacaoTemNomeDeGente(revelacao)) return nada('nome_de_gente')
  const chave = palavrasDe(revelacao)
  const noPrompt = new Set(palavrasDe(p).map((w) => w.slice(0, 5)))
  if (chave.length === 0 || chave.filter((w) => noPrompt.has(w.slice(0, 5))).length * 2 >= chave.length) return nada('cena_ja_mostra')
  const lock = /^Film visual medium: .+?\. /.exec(p)?.[0] ?? ''
  return { prompt: `${lock}${MARCA_DESFECHO} ${revelacao}. ${p.slice(lock.length)}`, revelacao, aplicada: true, motivo: 'aplicada' }
}
