// ═══ KINEO-FIDELIDADE-2026-09-14 — o que o cenário H3 Lituya (f04527a7) ensinou ═══
//
// Revisão visual do Board no MP4: (1) abertura em retrato sem o acontecimento;
// (2) deslizamento narrado sobre um fiorde tranquilo; (3) onda sem referência
// de escala; (4) "My son and I" na narração de documentário, sem atribuição;
// (5) aparências diferentes para o mesmo sobrevivente.
//
// Causas no código: a conversão diálogo→narração (modo sem rosto) levava a
// fala em 1ª pessoa inteira para a narração e deixava a citação no prompt
// visual; a ficha do personagem só entrava se o modelo obedecesse; ninguém
// conferia se o pedido visual mostrava a AÇÃO da narração; o planejador
// nomeou uma pessoa real ("Howard Ulrich") no prompt de imagem.
//
// Tudo aqui é determinístico e puro: nada de GPT, nada de I/O. Nunca toca
// texto do autor (só age sobre texto que o planejador escreveu).

const STOP = new Set(['about', 'above', 'after', 'again', 'along', 'among', 'around', 'because', 'before', 'being', 'below', 'between', 'could', 'during', 'every', 'first', 'from', 'great', 'having', 'here', 'into', 'might', 'other', 'over', 'shall', 'should', 'since', 'their', 'there', 'these', 'those', 'through', 'today', 'toward', 'under', 'until', 'where', 'which', 'while', 'whole', 'would', 'years', 'later', 'never', 'still', 'thing', 'things', 'something', 'anything', 'people', 'story', 'history', 'night', 'moment', 'against', 'across', 'within', 'without', 'behind', 'already', 'almost', 'always', 'another', 'itself', 'himself', 'herself', 'themselves', 'ourselves', 'everything', 'nothing'])

/** Palavras de conteúdo (≥5 letras, sem função, minúsculas, sem pontuação). */
export function palavrasDeConteudo(texto: string): string[] {
  return (texto ?? '').toLowerCase().replace(/[^a-z0-9\s-]/g, ' ').split(/\s+/).filter((w) => w.length >= 5 && !STOP.has(w) && !/^\d+$/.test(w))
}

/** Palavras de AÇÃO da narração: conteúdo menos nomes próprios (Lituya, Alaska, Empire State…
 *  aparecem em todo prompt do filme e mascaravam a ação ausente — cena 2 do H3). */
export function palavrasDeAcao(voiceover: string): string[] {
  const tokens = (voiceover ?? '').replace(/[^A-Za-z0-9\s-]/g, ' ').split(/\s+/).filter(Boolean)
  const out: string[] = []
  tokens.forEach((t, i) => {
    const inicioDeFrase = i === 0 || /[.!?]\s*$/.test(tokens.slice(0, i).join(' ').slice(-2))
    if (/^[A-Z]/.test(t) && !inicioDeFrase) return // nome próprio no meio da frase
    const w = t.toLowerCase()
    if (w.length >= 5 && !STOP.has(w) && !/^\d+$/.test(w)) out.push(w)
  })
  return out
}

/** A narração anuncia uma ESCALA (número + unidade, ou comparação)? Sem isso no prompt, o motor desenha uma onda qualquer (cena 4 do H3). */
export const ESCALA_RE = /\b\d+(?:[.,]\d+)?\s*(?:meters?|metres?|feet|foot|ft|km|kilometers?|kilometres?|miles?|tons?|tonnes?|stor(?:e)?ys|stories|floors)\b|\b(?:dwarf(?:s|ing|ed)?|taller than|higher than|as tall as|as high as|the size of|the height of|times (?:the|larger|taller|bigger|higher))\b/i
export function escalaAnunciada(texto: string): boolean { return ESCALA_RE.test(texto ?? '') }

const raiz = (w: string) => w.slice(0, 5)

/** A ação central da narração está no pedido visual? (raiz de 5 letras de qualquer palavra de conteúdo) */
export function acaoCentralPresente(prompt: string, voiceover: string): boolean {
  const alvo = new Set(palavrasDeAcao(voiceover).map(raiz))
  const temAcao = alvo.size === 0 || palavrasDeConteudo(prompt).some((w) => alvo.has(raiz(w)))
  const temEscala = !escalaAnunciada(voiceover) || escalaAnunciada(prompt)
  return temAcao && temEscala
}

/** Primeira frase da narração (para o prompt dizer o que mostrar). */
export function primeiraFrase(texto: string): string {
  const m = (texto ?? '').trim().match(/^[^.!?]+[.!?]?/)
  return (m ? m[0] : (texto ?? '')).trim().slice(0, 200)
}

/** Se o prompt não mostra a ação narrada, ele passa a abrir com o que mostrar. */
export function garantirAcaoCentral(prompt: string, voiceover: string): string {
  const p = (prompt ?? '').trim()
  const v = (voiceover ?? '').trim()
  if (!v || acaoCentralPresente(p, v)) return p
  return `Shows exactly this moment, as the narration describes it: "${primeiraFrase(v)}" ${p}`.trim()
}

const PAPEIS = ['fisherman', 'fisherwoman', 'sailor', 'captain', 'skipper', 'scientist', 'geologist', 'engineer', 'soldier', 'pilot', 'nurse', 'doctor', 'farmer', 'miner', 'teacher', 'lighthouse keeper', 'keeper', 'explorer', 'survivor', 'diver', 'climber', 'hunter', 'trader', 'merchant', 'monk', 'priest', 'king', 'queen', 'boy', 'girl', 'child', 'woman', 'man']

/** O papel do personagem da ficha ("the fisherman"); sem ficha, "the survivor". */
export function papelDoPersonagem(characterSheet: string): string {
  const s = (characterSheet ?? '').toLowerCase()
  for (const papel of PAPEIS) if (new RegExp(`\\b${papel}\\b`).test(s)) return `the ${papel}`
  return 'the survivor'
}

const PRIMEIRA_PESSOA_RE = /\b(i|i'm|i've|i'd|my|me|we|we're|we've|our|us|myself|ourselves)\b/i

/** Fala de diálogo que vira narração de documentário: 1ª pessoa ganha atribuição, sem perder uma palavra. */
export function atribuirFalaConvertida(line: string, characterSheet: string): string {
  const l = (line ?? '').trim()
  if (!l || !PRIMEIRA_PESSOA_RE.test(l)) return l
  const papel = papelDoPersonagem(characterSheet)
  const Papel = papel.charAt(0).toUpperCase() + papel.slice(1)
  return `${Papel} would later recall: "${l.replace(/"/g, "'")}"`
}

/** Citação de fala dentro de um prompt de imagem sai inteira (cena sem rosto não fala). */
export function limparCitacaoDoPrompt(prompt: string): string {
  return (prompt ?? '').replace(/\s*["“][^"”]{6,}["”][.,]?\s*/g, ' ').replace(/\s{2,}/g, ' ').trim()
}

const VERBOS_DE_PESSOA = '(?:looks?|turns?|stands?|sits?|holds?|walks?|runs?|stares?|watches?|grips?|clings?|waits?|kneels?|leans?|climbs?|rows?|steers?|and his|and her|with his|with her)'
const NOME_PROPRIO_COM_VERBO_RE = new RegExp(`\\b([A-Z][a-z]{2,}(?: [A-Z][a-z]{2,})+)(?=,? ${VERBOS_DE_PESSOA}\\b)`, 'g')
const NOME_PROPRIO_POSSESSIVO_RE = /\b([A-Z][a-z]{2,}(?: [A-Z][a-z]{2,})+)'s\b/g

/** Nome próprio de pessoa no prompt de IMAGEM vira o papel da ficha: o motor não deve buscar semelhança com ninguém real. */
export function despersonalizarPrompt(prompt: string, characterSheet: string): string {
  const papel = papelDoPersonagem(characterSheet)
  return (prompt ?? '')
    .replace(NOME_PROPRIO_COM_VERBO_RE, papel)
    .replace(NOME_PROPRIO_POSSESSIVO_RE, `${papel}'s`)
}

export const PESSOA_NO_PROMPT_RE = /\b(man|woman|fisherman|sailor|captain|boy|girl|son|daughter|father|mother|person|survivor|his|her|he|she|they|their)\b/i

/** Cena que mostra a pessoa carrega a ficha VERBATIM no início (continuidade), sem depender do modelo. */
export function garantirFichaNoPrompt(prompt: string, characterSheet: string): string {
  const p = (prompt ?? '').trim()
  const s = (characterSheet ?? '').trim()
  if (!s || !PESSOA_NO_PROMPT_RE.test(p)) return p
  const marca = s.slice(0, 25).toLowerCase()
  if (p.toLowerCase().includes(marca)) return p
  return `${s.replace(/[.\s]+$/, '')}. ${p}`
}
