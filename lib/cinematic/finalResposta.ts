// KINEO-FINAL-RESPOSTA-0111 [TRAVA 8.2 — vai do fundador 01/11 "vai tudo" (melhorias)] — O FIM ENTREGA O QUE O GANCHO PROMETEU.
//
// Revisor de vídeos, 01/11 (FINAL_FRACO): Seedance 1.5 de 62 s, "o que a NASA nunca anunciou sobre Marte" — o filme acaba sem
// revelar nada (e, nos Kling 4 grátis, o fim repetia a abertura).
// v4 (rodadas 1-3 reprovadas em revisão adversarial: a lista de bordões de "clima" e a contagem de palavras novas erravam nos dois
// sentidos — "Late at night, engineers say the truth is still out there." passava, "Because methane spikes keep appearing, and NASA
// is still watching." reprovava — e a revelação crua colada no prompt da última cena gerava fragmentos quebrados como "Final moment
// of the story, clearly shown: Late at night, engineers say."):
//   1. DETECTOR ESTREITO E SEGURO (determinístico, sem rede): finalFracoDoRoteiro reprova só o que é certo — a última frase do
//      PAYOFF (sem o CTA de rede social) é PERGUNTA, ou é QUASE IGUAL ao HOOK; PAYOFF sem frase = sem revelação. Nada mais.
//   2. O RESTO DO JULGAMENTO ("o fim responde de verdade?") vai para UMA chamada semântica curta ao gpt-4o-mini (a mesma helper do
//      sujeito obrigatório do Kling 4): {ends_with_concrete_answer: boolean}, feita NO ESCRITOR e só quando o roteiro foi gerado pela
//      IA ("Use my script as is" e roteiro colado nunca passam por aqui). false = a nova tentativa que o /api/generate-script já tem.
//      Falha segura: erro, prazo ou JSON inválido = o roteiro segue como está (nenhuma tentativa a mais).
//   3. A injeção crua da revelação no prompt da última cena (comRevelacaoNoFim) SAIU. Fica só a instrução do descritor de cenas
//      (KINEO-FINAL-RESPOSTA-0111 no system prompt de generate-video-cinematic): a última cena MOSTRA a resposta concreta.
// v5 (revisão adversarial do 11db2897c: o juiz reprovava fim de HISTÓRIA, motivacional e infantil — false/false nos três — e isso
// disparava um gpt-4o que reescrevia o fim em todos os motores, contra a regra FIDELITY): o juiz lê também o PEDIDO e responde
// primeiro se o gancho DEVE uma resposta (hook_promises_answer: pergunta, mistério, segredo, "por quê", fato prometido). História,
// fábula, conto infantil, mensagem motivacional ou devocional, lista de dicas = não deve resposta: o fim é o da história. Só
// hook_promises_answer=true E ends_with_concrete_answer=false vira 'sem_resposta'. No escritor o juiz só é chamado quando NENHUM
// outro motivo já pede a nova tentativa, e a versão reescrita só por ele só substitui a original se não piorar (seções, PAYOFF,
// tamanho, detector estreito).
import { isSocialCta } from '@/lib/shortFilmScript'
import { perguntaSemantica, MODELO_SEMANTICO_0111, type OpcoesSemanticas, type ResultadoSemantico } from '@/lib/cinematic/sujeitoObrigatorio'

export const FINAL_RESPOSTA_VERSAO = 'final_resposta_0111_v5_semantico' as const
export type FinalFraco = 'pergunta' | 'repete_gancho' | 'sem_revelacao' | 'sem_resposta'

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

const VAZIAS = new Set(['that', 'this', 'what', 'with', 'from', 'about', 'there', 'their', 'they', 'have', 'been', 'will', 'just', 'even', 'only', 'never', 'ever', 'still', 'thats', 'isso', 'esse', 'essa', 'isto', 'para', 'como', 'mais', 'muito', 'sobre', 'nunca', 'ainda', 'esto', 'pero'])
const semAcento = (t: string) => String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '')
const palavrasDe = (t: string) => semAcento(String(t ?? '').toLowerCase()).replace(/['’]/g, '').split(/[^\p{L}\p{N}]+/u).filter((w) => (w.length >= 4 || /\d/.test(w)) && !VAZIAS.has(w))

const corpoFinal = (script: string) => secoes(script).get('PAYOFF') ?? semPistas(semCabecalhos(script))
/** A última frase de fala do roteiro (PAYOFF sem CTA; sem PAYOFF, o fim do texto). */
export function ultimaFraseDoRoteiro(script: string): string | null {
  const frases = frasesDe(corpoFinal(script)).filter((f) => !isSocialCta(f))
  return frases[frases.length - 1] ?? null
}

const ehPergunta = (f: string) => /[?？؟]["'”’)\]]*$/.test(f)
/** QUASE IGUAL ao HOOK: 2+ palavras de conteúdo, no máximo 1 nova, 60%+ da frase vem do HOOK, metade+ do HOOK está nela, sem número. */
export function quaseIgualAoGancho(frase: string, gancho: string): boolean {
  const g = new Set(palavrasDe(gancho)), u = palavrasDe(frase)
  if (g.size === 0 || u.length < 2 || /\d/.test(frase)) return false
  const comuns = new Set(u.filter((w) => g.has(w)))
  const novas = u.filter((w) => !g.has(w)).length
  return novas <= 1 && (u.length - novas) / u.length >= 0.6 && comuns.size / g.size >= 0.5
}

/** O detector ESTREITO: só pergunta, eco quase literal do HOOK ou PAYOFF sem frase. O resto é do juiz semântico. */
export function finalFracoDoRoteiro(script: string): FinalFraco | null {
  const ultima = ultimaFraseDoRoteiro(script)
  if (!ultima) return 'sem_revelacao'
  if (ehPergunta(ultima)) return 'pergunta'
  const gancho = secoes(script).get('HOOK') ?? ''
  if (gancho && quaseIgualAoGancho(ultima, gancho)) return 'repete_gancho'
  return null
}

/** O pedido de correção que vai na nova tentativa do escritor (inglês, como o resto do reforço). */
export function problemaDoFinal(motivo: FinalFraco): string {
  const porque = { pergunta: 'it is a question', repete_gancho: 'it only repeats the HOOK', sem_revelacao: 'the PAYOFF has no spoken reveal', sem_resposta: 'it does not state the concrete answer the HOOK promised (it teases, sets a mood or says the mystery remains)' }[motivo]
  return `the LAST sentence of the PAYOFF must be the concrete answer the HOOK promised (the specific fact, number, name, mechanism or outcome) — yours fails because ${porque}`
}

// ─── O juiz semântico do fim (só no escritor, só roteiro da IA) ─────────────────────────────────────────────────────────────────
export interface LeituraDoFinal { hook_promises_answer: boolean; ends_with_concrete_answer: boolean }
// a ordem dos campos é a ordem em que o modelo escreve: primeiro se o gancho deve uma resposta, depois se o fim a entrega
const SCHEMA_FINAL = { type: 'object', additionalProperties: false, required: ['hook_promises_answer', 'ends_with_concrete_answer'], properties: { hook_promises_answer: { type: 'boolean' }, ends_with_concrete_answer: { type: 'boolean' } } } as const
export const SYSTEM_FINAL_0111 = [
  'You check the ending of a short narrated video script (any language).',
  'You get the customer REQUEST, the HOOK (the opening line), the MIDDLE (context) and the PAYOFF (the ending), all as spoken text.',
  'hook_promises_answer is true only when the HOOK or the REQUEST owes the viewer a specific answer: it asks a question, announces a mystery, a secret, a hidden fact, "what happened", "why" or "how", sets up something unknown, hidden, buried, missing or unexplained, or promises a specific reveal.',
  "hook_promises_answer is false for a story (fiction, fable, children's tale, a story the customer wrote or outlined, a love story, a parable), a motivational, inspirational, devotional or religious message, a list of tips, habits or steps, a description of a scene, a joke or a dance: their ending is the end of the story or the message, not an answer.",
  'ends_with_concrete_answer is true when the PAYOFF actually states the concrete answer the HOOK promised: a specific fact, number, name, place, mechanism, outcome, or the single most-accepted theory, said plainly (a short closing line after that answer is fine). When hook_promises_answer is false, it is true if the PAYOFF closes the story or the message.',
  'ends_with_concrete_answer is false when the PAYOFF only teases, sets a mood, says the mystery remains or that someone is still watching or waiting, asks a question, or restates the hook, without giving that concrete answer.',
  'Judge only what the text says; do not check whether the fact is true. Reply with JSON only.',
].join('\n')

/** O fim deve uma resposta e não a entrega? (a única combinação que pede a nova tentativa ao escritor) */
export const fimSemResposta = (l: LeituraDoFinal): boolean => l.hook_promises_answer && !l.ends_with_concrete_answer

/** O que o juiz lê: o HOOK, o MEIO (contexto) e o PAYOFF falados (sem pistas, sem CTA de rede social). null = roteiro sem as duas pontas (não chama). */
export function entradaDoJuizDoFinal(script: string): { hook: string; meio: string; payoff: string } | null {
  const s = secoes(script)
  const hook = s.get('HOOK') ?? ''
  const payoff = frasesDe(s.get('PAYOFF') ?? '').filter((f) => !isSocialCta(f)).join(' ')
  const meio = [...s.entries()].filter(([k]) => k !== 'HOOK' && k !== 'PAYOFF').map(([, v]) => v).join(' ')
  return hook && payoff ? { hook: hook.slice(0, 400), meio: meio.slice(-900), payoff: payoff.slice(0, 900) } : null
}

/**
 * Uma chamada: o PAYOFF responde ao HOOK? { ok: false } (sem as duas pontas, erro, prazo, JSON inválido) = não mexe em nada.
 * Prazo curto e tentativa extra só se ainda couber: a rota do escritor tem teto de 60 s com duas chamadas ao gpt-4o.
 */
export async function finalTemRespostaConcreta(script: string, opts: OpcoesSemanticas & { pedido?: string } = {}): Promise<ResultadoSemantico<LeituraDoFinal>> {
  const { pedido: pedidoBruto, ...opcoes } = opts
  const entrada = entradaDoJuizDoFinal(script)
  if (!entrada) return { ok: false, erro: 'sem_hook_ou_payoff', ms: 0, model: opcoes.model ?? MODELO_SEMANTICO_0111, tentativas: 0 }
  const pedido = String(pedidoBruto ?? '').replace(/\s+/g, ' ').trim().slice(0, 400)
  return perguntaSemantica(
    {
      system: SYSTEM_FINAL_0111, user: `REQUEST: ${pedido || '(not given)'}\nHOOK: ${entrada.hook}\nMIDDLE: ${entrada.meio || '(none)'}\nPAYOFF: ${entrada.payoff}`, nome: 'final_responde', schema: SCHEMA_FINAL as unknown as Record<string, unknown>, maxTokens: 30,
      ler: (o) => {
        const r = o && typeof o === 'object' ? (o as Record<string, unknown>) : null
        return r && typeof r.hook_promises_answer === 'boolean' && typeof r.ends_with_concrete_answer === 'boolean' ? { hook_promises_answer: r.hook_promises_answer, ends_with_concrete_answer: r.ends_with_concrete_answer } : null
      },
    },
    { timeoutMs: 4_000, tentativasExtras: 1, prazoTotalMs: 5_500, ...opcoes },
  )
}
