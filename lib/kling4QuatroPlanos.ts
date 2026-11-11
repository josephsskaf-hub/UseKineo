// KINEO-K4-PLANO-POR-SECAO-1111 [CEO 11/11, decisão delegada pelo dono: "item 5 aprovado", atrás de interruptor]
// O filme grátis de 15 s nasce com 4 seções (HOOK, MICRO REWARD 1, MICRO REWARD 2, PAYOFF) e vira 3 cenas
// (lib/durationByEngine.ts seedanceShortMarkedScenes): duas seções vizinhas se fundem numa cena só, e o motor mostra uma delas
// — CENA_FORA_DO_PEDIDO e REPETICAO no Kling 4 grátis (13 + 10 notas em 14 dias; Pompeia 11/11: "a arena desaba, a plateia
// foge" sumiu). O Kling 4 grátis é UM pedido de 15 s com multi_prompt (até 5 planos, ≥ 3 s cada): um plano por SEÇÃO custa o
// mesmo. Aqui só o pedido ao Kling 4 ganha os planos; o filme continua com 3 cenas — a reserva (H3 Turbo, 3 cenas de 6–8 s),
// a refação e os claims ficam como estão. Cada plano novo leva a PISTA da sua seção na frente (sobrevive ao corte de 512) e a
// SUA fala (a duração sai da fala, como sempre); a 2ª metade de uma cena fundida não tem imagem-chave (texto, como já acontece
// com cena sem foto aprovada). Qualquer dúvida (fala reescrita, seção que não bate) → null → os 3 planos de sempre.
// Lib PURA. Guardião: scripts/test-kling4-plano-por-secao-1111.mjs.

/** off = ninguém · internal = só contas da casa (isInternalEmail) · public = todo filme grátis do Kling 4. */
export type ModoPlanoPorSecao = 'off' | 'internal' | 'public'
export const KLING4_PLANO_POR_SECAO: ModoPlanoPorSecao = 'public' // KINEO-K4-PLANO-POR-SECAO-PUBLICO-1111 [dono 11/11: "começa pelo teste do Kling com 4 cenas"] — teste pago da CEO no Pompeia (4 planos, 15 s, US$ 2,36): cada seção com o seu plano, o desabamento da arena aparece, nenhum plano repetido; era 'internal'
export const KLING4_PLANO_POR_SECAO_VERSAO = 'plano_por_secao_1111_v1'
/** O Kling 4 aceita até 5 planos de ≥ 3 s em 15 s (lib/kling4Trial.ts kling4TrialSceneDurations). */
export const KLING4_MAX_PLANOS = 5

export function planoPorSecaoLigado(modo: ModoPlanoPorSecao, contaDaCasa: boolean): boolean {
  return modo === 'public' || (modo === 'internal' && contaDaCasa === true)
}

export type SecaoDoRoteiro = { voiceover: string; pexelsQuery: string }
const norm = (t: unknown) => String(t ?? '').trim().replace(/\s+/gu, ' ')

/** Quais seções formam cada cena (índices), conferido pelo TEXTO falado. null = não dá para provar (nunca adivinha). */
export function secoesDasCenas(secoes: readonly SecaoDoRoteiro[], falasDasCenas: readonly string[]): number[][] | null {
  const s = secoes.map((x) => norm(x.voiceover))
  if (!s.length || !falasDasCenas.length || s.some((t) => !t)) return null
  const grupos: number[][] = []
  let k = 0
  for (let i = 0; i < falasDasCenas.length; i++) {
    const alvo = norm(falasDasCenas[i])
    const grupo: number[] = []
    let junto = ''
    while (k < s.length) {
      junto = norm(`${junto} ${s[k]}`)
      grupo.push(k++)
      // a 1ª cena pode trazer fala de antes do 1º marcador (seedanceShortMarkedScenes põe na frente)
      if (junto === alvo || (i === 0 && alvo.endsWith(` ${junto}`))) break
      if (!alvo.includes(junto)) return null
    }
    if (!grupo.length || !(junto === alvo || (i === 0 && alvo.endsWith(` ${junto}`)))) return null
    grupos.push(grupo)
  }
  return k === s.length ? grupos : null
}

// ═══ KINEO-SECAO-COM-FALA-REESCRITA-1111 [CEO 11/11, filme 2120f018] — o plano por seção morria quando a fala era REESCRITA ═══
// O encaixe do Kling 4 encurta a fala para caber em 15 s; o 2120f018 (4 seções) saiu com "This manifestation is God, not all of God. It begins
// creating everything else." no lugar de "This manifestation is God, yet not all of God." + "It begins a narrative, creating everything else."
// — e secoesDasCenas (texto igual) devolvia null: 3 planos, a seção fundida perdida. Aqui, só quando o texto igual falha: as seções casam com
// as cenas pela ORDEM e pelas PALAVRAS em comum (toda partição em grupos vizinhos é testada; cada cena precisa ter ≥ 60 % das suas palavras
// de conteúdo nas suas seções, e cada seção de um grupo ≥ 1 palavra na cena). Empate entre duas partições = null (nunca adivinha).
const PALAVRA_VAZIA = new Set(['the', 'and', 'that', 'this', 'with', 'for', 'from', 'was', 'were', 'are', 'its', 'his', 'her', 'their', 'into', 'but', 'not', 'yet', 'has', 'have', 'had', 'you', 'all', 'que', 'com', 'para', 'por', 'uma', 'los', 'las', 'del', 'una', 'les', 'des', 'der', 'die', 'das', 'und', 'ein', 'eine', 'che', 'per', 'non'])
const palavras = (t: string) => new Set((norm(t).toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) ?? []).filter((w) => !PALAVRA_VAZIA.has(w)))
const LIMIAR_DA_CENA = 0.6
export function secoesPorPalavras(secoes: readonly SecaoDoRoteiro[], falasDasCenas: readonly string[]): number[][] | null {
  const k = secoes.length, n = falasDasCenas.length
  if (!k || !n || n > k || k > KLING4_MAX_PLANOS + 1) return null
  const ws = secoes.map((x) => palavras(x.voiceover)), cenas = falasDasCenas.map(palavras)
  const partes = (ini: number, resto: number): number[][][] => {
    if (resto === 1) return [[Array.from({ length: k - ini }, (_, i) => ini + i)]]
    const r: number[][][] = []
    for (let fim = ini + 1; fim <= k - resto + 1; fim++) for (const cauda of partes(fim, resto - 1)) r.push([Array.from({ length: fim - ini }, (_, i) => ini + i), ...cauda])
    return r
  }
  let melhor: { grupos: number[][]; nota: number } | null = null, empate = false
  for (const grupos of partes(0, n)) {
    let nota = 0, valida = true
    grupos.forEach((g, i) => {
      const daCena = cenas[i]
      const doGrupo = new Set(g.flatMap((j) => [...ws[j]]))
      const comuns = [...daCena].filter((w) => doGrupo.has(w)).length
      if (!daCena.size || comuns / daCena.size < LIMIAR_DA_CENA || g.some((j) => ![...ws[j]].some((w) => daCena.has(w)))) valida = false
      nota += daCena.size ? comuns / daCena.size : 0
    })
    if (!valida) continue
    if (!melhor || nota > melhor.nota + 1e-9) { melhor = { grupos, nota }; empate = false } else if (Math.abs(nota - melhor.nota) <= 1e-9) empate = true
  }
  return melhor && !empate ? melhor.grupos : null
}

/** A fala REAL de uma cena fundida dividida entre as suas seções: por frase quando o número bate; senão, pelas palavras, na proporção das seções. */
export function falaDividida(fala: string, secoes: readonly SecaoDoRoteiro[]): string[] {
  const frases = norm(fala).split(/(?<=[.!?…])\s+/u).filter(Boolean)
  if (frases.length === secoes.length) return frases
  const pal = norm(fala).split(' ')
  const pesos = secoes.map((x) => Math.max(1, norm(x.voiceover).split(' ').length)), total = pesos.reduce((a, b) => a + b, 0)
  let ini = 0
  return pesos.map((p, i) => { const fim = i === pesos.length - 1 ? pal.length : Math.max(ini + 1, Math.round(ini + (p / total) * pal.length)); const t = pal.slice(ini, fim).join(' '); ini = fim; return t })
}

// KINEO-K4-PLANO-DA-SECAO-1111 [CEO 11/11, revisão do teste dos 4 planos] — o plano de uma cena fundida repetia a AÇÃO inteira da cena (o plano 2 do Pompeia
// era "A wide shot captures the bustling ancient Roman amphitheater…" de novo, só com outro "Shot focus"): funcionou por sorte. Agora
// cada plano de cena fundida nasce da SUA seção: o meio ("Photoreal film."), o lugar ("Setting: …") e a época do prompt da cena, a
// pista e a fala da seção como ação, e a mesma proteção de texto/boca do fim do prompt. Nenhuma ação de outra seção entra.
export function promptDaSecao(promptDaCena: string, secao: SecaoDoRoteiro): string {
  const p = norm(promptDaCena)
  const meio = /^[^.]{2,60}\./.exec(p)?.[0] ?? ''
  const lugar = /Setting: [^.]*?(?:\([^)]*\))?\./.exec(p)?.[0] ?? ''
  const epoca = /period piece set strictly in [^:.,]+/.exec(p)?.[0] ?? ''
  // KINEO-METADE-COM-FICHA-1111 [CEO 11/11, reprise dos 6 filmes] — a metade de uma cena fundida perdia QUEM está na cena e QUANDO: o
  // vizinho (f2e8cffc) refeito com o código no ar saía "Photoreal film. Shot focus: moving boxes hallway. This shot shows only this moment:
  // Luca si trasferì…" — sem a ficha do Luca, sem 1998, sem a origem; o motor sorteia roupa e rosto nessa metade. Agora a metade leva, como
  // estão no plano compactado da cena: a luz ("Light: …"), a época ("Period setting: …"), a origem ("Everyone shown … people.") e a ficha
  // ("Visible: …" / "Identity: …"); a AÇÃO continua só a da sua seção.
  const luz = /Light: [^.]+\./.exec(p)?.[0] ?? ''
  const periodo = /Period setting: [^.]+\./.exec(p)?.[0] ?? ''
  const origem = /Everyone shown has the natural features of [^.]+ people\.|People: [^.]+\./.exec(p)?.[0] ?? ''
  // a ficha acaba no ponto dela ou onde o corte da cena a encostou na proteção ("…origin: an Italian man, no readable text")
  const quem = (/(?:Visible(?:, seen from behind)?|Identity): .+?(?:\.(?=\s)|(?=,?\s*no readable text))/.exec(p)?.[0] ?? '').replace(/[\s,;]+$/u, '').replace(/([^.])$/u, '$1.')
  const i = p.search(/,?\s*no readable text/)
  const cauda = i >= 0 ? p.slice(i).replace(/^,\s*/, ' ') : (p.endsWith('Mouth closed, no speaking.') ? ' Mouth closed, no speaking.' : '')
  const fala = norm(secao.voiceover).replace(/[\s.!?…]+$/u, '')
  return norm(`${meio} ${luz} ${periodo} ${origem} ${quem} ${lugar} Shot focus: ${pista(secao)}. This shot shows only this moment: ${fala}.${epoca ? ` The scene is a ${epoca}.` : ''}${cauda}`)
}
const pista = (x: SecaoDoRoteiro) => {
  const p = norm(x.pexelsQuery)
  return (p || Array.from(norm(x.voiceover)).slice(0, 140).join('')).replace(/[\s.!?…;,:]+$/u, '')
}

/** Os planos do Kling 4 por seção. null = nada a dividir ou não dá para provar → o envio de sempre (3 planos). */
export function planosPorSecao(a: {
  prompts: readonly string[]; stills: readonly (string | null)[]; falas: readonly string[]; secoes: readonly SecaoDoRoteiro[]
}): { prompts: string[]; stills: (string | null)[]; falas: string[]; grupos: number[][] } | null {
  if (a.prompts.length !== a.falas.length) return null
  const exatos = secoesDasCenas(a.secoes, a.falas)
  const grupos = exatos ?? secoesPorPalavras(a.secoes, a.falas) // KINEO-SECAO-COM-FALA-REESCRITA-1111 — fala reescrita pelo encaixe: casa pela ordem e pelas palavras
  if (!grupos || grupos.every((g) => g.length === 1)) return null
  const total = grupos.reduce((n, g) => n + g.length, 0)
  if (total > KLING4_MAX_PLANOS) return null
  // a fala de antes do 1º marcador (só a 1ª cena pode ter) fica no 1º plano, como na cena
  const alvo0 = norm(a.falas[0]), junto0 = norm(grupos[0].map((x) => a.secoes[x].voiceover).join(' '))
  const prefixo = exatos && alvo0 !== junto0 && alvo0.endsWith(` ${junto0}`) ? alvo0.slice(0, alvo0.length - junto0.length).trim() : ''
  const prompts: string[] = [], stills: (string | null)[] = [], falas: string[] = []
  grupos.forEach((g, i) => {
    // KINEO-SECAO-COM-FALA-REESCRITA-1111 — sem texto igual, a fala de cada metade é a fala REAL da cena (a que vai ser narrada) dividida
    const reais = !exatos && g.length > 1 ? falaDividida(a.falas[i], g.map((j) => a.secoes[j])) : null
    g.forEach((j, pos) => {
      const secao = reais ? { pexelsQuery: a.secoes[j].pexelsQuery, voiceover: reais[pos] } : a.secoes[j]
      prompts.push(g.length === 1 ? a.prompts[i] : promptDaSecao(a.prompts[i], secao)) // KINEO-K4-PLANO-DA-SECAO-1111 — era: `Shot focus: ${pista(a.secoes[j])}. ${a.prompts[i]}` (a ação da cena inteira em cada metade)
      stills.push(pos === 0 ? (a.stills[i] ?? null) : null)
      const fala = g.length === 1 && !exatos ? norm(a.falas[i]) : norm(secao.voiceover)
      falas.push(i === 0 && pos === 0 && prefixo ? `${prefixo} ${fala}` : fala)
    })
  })
  return { prompts, stills, falas, grupos }
}
