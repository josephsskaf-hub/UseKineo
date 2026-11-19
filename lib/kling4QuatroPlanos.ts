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

export type SecaoDoRoteiro = { voiceover: string; pexelsQuery: string; descricao?: string | null } // KINEO-PLANO-DA-FALA-1911: `descricao` só com o interruptor (lib/kling4PlanoDaFala1911.ts)
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

// ═══ KINEO-PLANO-DA-FALA-1911 (A1) [CEO 19/11] — a ação da metade de cena fundida vem da descrição da SEÇÃO (pedido + fala), senão da ação do
// descritor da cena + a fala; nunca o molde da pista. Interruptor e chamada ao descritor: lib/kling4PlanoDaFala1911.ts. Aqui só o texto, puro.
/** Teto do plano da metade (code points) antes da referência "Scene N: …" (até 63), da escala e da superfície: o envio fica ≤ 512 sem cortar a proteção. */
export const PLANO_DA_FALA_TETO = 430
/** A ação que o DESCRITOR escreveu para a cena (do pedido e da fala da cena inteira), lida da estrutura do NOSSO prompt: sem o meio, a moldura de
 *  câmera, luz, época, origem, ficha, lugar e a cauda de estilo/proteção. Nunca lê o texto do cliente como regra; só tira as nossas peças.
 *  Ex.: o grifo (b1ffe3ad) — "The Griffin soars upward towards the towering Mount Meru…" — que o molde da pista trocava por "starry night sky". */
export function acaoDaCena(promptDaCena: string): string {
  let t = norm(promptDaCena)
  // 1º o meio ("Photoreal film." / "Film visual medium: …."), depois as nossas peças, por último a cauda de estilo e proteção
  const pecas = [/Light: [^.]+\.\s*/gu, /Period setting: [^.]+\.\s*/gu, /Everyone shown has the natural features of [^.]+ people\.\s*|People: [^.]+\.\s*/gu,
    /(?:Visible(?:, seen from behind)?|Identity): .+?\.(?=\s)\s*/gu, /Setting: [^.]*?(?:\([^)]*\))?\.\s*/gu, /People in the shot wear [^.]+\.\s*/gu, /Never a different or generic place\.\s*/gu,
    /(?:Wide|Medium|Close|Extreme|Clear|Opening)[^.]{0,200}?(?:shot|framing|readable|fade-in|pull-back|push-in|focus|depth of field)[^.]*\.\s*/gu, /photorealistic, ultra-detailed\.\s*/gu]
  const cortes = [/,?\s*faceless cinematic b-roll[\s\S]*$/u, /\s+photorealistic, ultra-detailed,[\s\S]*$/u, /,?\s*no readable text[\s\S]*$/u, /\s*Mouth closed, no speaking\.?$/u]
  t = t.replace(/^(?:Film visual medium: [^.]+\.|[^.]{2,60}\.)\s*/u, '')
  for (const p of pecas) t = t.replace(p, '')
  for (const c of cortes) t = t.replace(c, '')
  const frase = norm(t).split(FIM_DE_FRASE_A1).find((f) => f.replace(/[^\p{L}]/gu, '').length >= 12) ?? ''
  return frase.replace(/[\s,.;:!?…]+$/u, '')
}

/** Fronteira de frase que não parte abreviação de uma letra maiúscula ("a powerful T. rex", revisor 19/11, 09f6d635). */
const FIM_DE_FRASE_A1 = /(?<!(?:^|[\s(])\p{Lu}[.])(?<=[.!?])\s+/u
const cp1911 = (s: string) => Array.from(s).length
/** Corta `t` até `max` code points em fronteira de FRASE; senão de ORAÇÃO (", " ou "; "); senão null — nunca deixa frase aberta ("stand confidently on a"). */
/** `soFrase` [ensaio A2 19/11] — a DESCRIÇÃO só se corta em fronteira de frase: a vírgula partia lista de adjetivos ("in a vibrant, colorful garden" → "in a vibrant."). */
export function cortaInteiro(t: string, max: number, soFrase = false): string | null {
  const s = norm(t)
  if (cp1911(s) <= max) return s
  const c = Array.from(s).slice(0, Math.max(0, max)).join('')
  let fim = -1
  for (const m of c.matchAll(/[.!?](?=\s)/gu)) { const i = m.index ?? -1; if (i >= 20 && !/(?:^|[\s(])\p{Lu}$/u.test(c.slice(0, i))) fim = i }
  if (fim >= 20) return c.slice(0, fim + 1)
  if (soFrase) return null
  const v = Math.max(c.lastIndexOf(', '), c.lastIndexOf('; '))
  return v >= 20 ? c.slice(0, v) : null
}
const fecha = (t: string) => `${norm(t).replace(/[\s,;:.!?…—-]+$/u, '')}.` // um ponto final só (nunca ",." no fim)

/** A ação da metade: a descrição da seção; sem ela, a ação do descritor da cena + a fala da seção; sem as duas, a fala. A pista nunca é a ação
 *  sozinha. `max` (code points) protege o teto do plano: corta a ação da cena em fronteira de palavra, nunca a fala nem a proteção do fim. */
export function acaoDaSecao(descricao: string | null | undefined, fala: string, acaoCena = '', max = 320): string {
  // KINEO-PLANO-DA-FALA-1911 [revisor 19/11, itens 1 e 2] — TETO na fala também: corta-se primeiro a AÇÃO (inteira ou em fronteira de frase/oração;
  // sem fronteira, ela sai), depois a fala (frase/oração; em último caso a palavra). Nunca frase aberta na ação, nunca ",." no fim; a proteção do
  // plano fica fora daqui (promptDaSecao a mantém).
  const d = norm(descricao).replace(/[\s.!?…]+$/u, '')
  if (d.length >= 12) { const c = cortaInteiro(d, max - 1, true); if (c) return fecha(c) } // [ensaio A2 19/11] só fronteira de frase
  const f = norm(fala).replace(/[\s.!?…]+$/u, '')
  const PREFIXO = 'This shot shows only this moment: '
  const falaCabe = (n: number) => { if (!f) return ''; const c = cortaInteiro(f, n) ?? Array.from(f).slice(0, Math.max(0, n)).join('').replace(/\s+\S*$/u, ''); return c ? fecha(c) : '' }
  const momento = f ? `${PREFIXO}${falaCabe(Math.max(0, max - cp1911(PREFIXO) - 1))}` : ''
  const c = d.length >= 12 ? '' : norm(acaoCena) // descrição sem fronteira que caiba: nada de ação herdada no lugar
  if (!c) return momento
  const sobra = max - cp1911(momento) - 2
  const cc = sobra >= 30 ? cortaInteiro(c, sobra) : null
  return cc ? norm(`${fecha(cc)} ${momento}`) : momento
}

// KINEO-K4-PLANO-DA-SECAO-1111 [CEO 11/11, revisão do teste dos 4 planos] — o plano de uma cena fundida repetia a AÇÃO inteira da cena (o plano 2 do Pompeia
// era "A wide shot captures the bustling ancient Roman amphitheater…" de novo, só com outro "Shot focus"): funcionou por sorte. Agora
// cada plano de cena fundida nasce da SUA seção: o meio ("Photoreal film."), o lugar ("Setting: …") e a época do prompt da cena, a
// pista e a fala da seção como ação, e a mesma proteção de texto/boca do fim do prompt. Nenhuma ação de outra seção entra.
/** [ensaio A2 19/11] o que a metade com descrição conta à rota: o espaço da descrição (com toda peça opcional fora) e se ela não coube e caiu na fala. */
export interface RelatoDaMetade { espaco?: number; caiuNaFala?: boolean }
/** [ensaio A2 19/11] A ficha do plano sem a cláusula de estilo que a linha de estilo (lib/cinematic/elencoTrava linhaDeEstilo) acrescenta — texto NOSSO, nas suas 4
 *  formas, inteira ou cortada pelo teto da cena. O nome, a descrição do autor e a aparência ficam. */
export function quemSemEstilo(quem: string): string {
  const q = String(quem ?? '').replace(/;\s*(?:drawn in the film's own look|a real person filmed in photorealistic live action|a real living [^;,.()]{1,40} filmed in photorealistic live action|a living creature filmed in photorealistic live action)\b[^;]*?(?=;|\.?$)/u, '')
  return q === quem ? quem : q.replace(/[\s,;]+$/u, '').replace(/([^.])$/u, '$1.')
}
export const PREFIXO_DA_FALA = 'This shot shows only this moment: '
export function promptDaSecao(promptDaCena: string, secao: SecaoDoRoteiro, opcoes: { objetoConcreto?: boolean; relato?: RelatoDaMetade } = {}): string {
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
  // KINEO-K4-PLANO-VARIADO-1111 [alavanca 2, atrás de KLING4_PLANO_VARIADO] — a ação da metade é o OBJETO concreto da seção (a pista), não a fala abstrata
  // ("This shot shows only this moment: This manifestation is God, not all of God." no 2120f018). Sem pista, fica a fala, como antes.
  // KINEO-PLANO-DA-FALA-1911 (A1) — com a descrição da seção (do pedido e da fala), ela é a ação; sem ela, a fala. O molde da pista não roda.
  if (secao.descricao !== undefined) { // o teto: o plano inteiro fica ≤ 430 code points (folga para a referência "Scene N: …" de até 63, a escala e a superfície antes dos 512)
    // KINEO-PLANO-DA-FALA-1911 [revisor 19/11, item 1] — as mesmas peças da metade de sempre; se o plano passar do teto, saem primeiro as OPCIONAIS
    // (luz, a frase longa da época, lugar, origem) e só depois a ação é cortada (em fronteira); meio, período, ficha e a proteção do fim ficam sempre.
    const acaoCheia = acaoDaSecao(secao.descricao, fala, acaoDaCena(p), 10_000)
    let opcionais = { luz, epocaFrase: epoca ? ` The scene is a ${epoca}.` : '', lugar, origem }
    // [ensaio A2 19/11] a ficha come ~250 dos 430 e ~170 deles são a cláusula de estilo ("drawn in the film's own look (…), the same character design in every scene",
    // "a real person filmed in photorealistic live action, …"), que repete o meio do plano; no plano com descrição ela sai (o resto da ficha fica)
    const quemA1 = quemSemEstilo(quem)
    const montarA1 = (acaoA1: string) => norm([meio, opcionais.luz, periodo, opcionais.origem, quemA1, opcionais.lugar, acaoA1].join(' ') + opcionais.epocaFrase + cauda)
    for (const k of ['luz', 'epocaFrase', 'lugar', 'origem'] as const) { if (cp1911(montarA1(acaoCheia)) <= PLANO_DA_FALA_TETO) break; opcionais = { ...opcionais, [k]: '' } }
    if (opcoes.relato) { opcoes.relato.espaco = Math.max(40, PLANO_DA_FALA_TETO - cp1911(norm([meio, periodo, quemA1].join(' ') + cauda)) - 1) - 2; opcoes.relato.caiuNaFala = false } // [ensaio A2 19/11]
    if (cp1911(montarA1(acaoCheia)) <= PLANO_DA_FALA_TETO) return montarA1(acaoCheia)
    const fixo = montarA1('')
    const maxAcao = Math.max(40, PLANO_DA_FALA_TETO - cp1911(fixo) - 1)
    const dA1 = norm(secao.descricao).replace(/[\s.!?…]+$/u, '')
    // [ensaio A2 19/11] nenhuma frase inteira da descrição cabe: o plano ficaria com a fala crua ("This shot shows only this moment: Comment.") ou sem ação nenhuma
    if (opcoes.relato && dA1.length >= 12) { opcoes.relato.espaco = maxAcao - 2; opcoes.relato.caiuNaFala = cortaInteiro(dA1, maxAcao - 1, true) === null }
    return montarA1(acaoDaSecao(secao.descricao, fala, acaoDaCena(p), maxAcao))
  }
  const acao = opcoes.objetoConcreto && norm(secao.pexelsQuery) ? `Main subject of this shot: ${pista(secao)}, shown in motion.` : `Shot focus: ${pista(secao)}. This shot shows only this moment: ${fala}.`
  return norm(`${meio} ${luz} ${periodo} ${origem} ${quem} ${lugar} ${acao}${epoca ? ` The scene is a ${epoca}.` : ''}${cauda}`)
}
const pista = (x: SecaoDoRoteiro) => {
  const p = norm(x.pexelsQuery)
  return (p || Array.from(norm(x.voiceover)).slice(0, 140).join('')).replace(/[\s.!?…;,:]+$/u, '')
}

/** Os planos do Kling 4 por seção. null = nada a dividir ou não dá para provar → o envio de sempre (3 planos). */
export function planosPorSecao(a: {
  prompts: readonly string[]; stills: readonly (string | null)[]; falas: readonly string[]; secoes: readonly SecaoDoRoteiro[]; objetoConcreto?: boolean
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
      const secaoDaFala = reais ? { pexelsQuery: a.secoes[j].pexelsQuery, voiceover: reais[pos] } : a.secoes[j]
      const secao = a.secoes[j].descricao !== undefined ? { ...secaoDaFala, descricao: a.secoes[j].descricao ?? null } : secaoDaFala // KINEO-PLANO-DA-FALA-1911 (A1): a descrição viaja na seção
      prompts.push(g.length === 1 ? a.prompts[i] : promptDaSecao(a.prompts[i], secao, { objetoConcreto: a.objetoConcreto === true })) // KINEO-K4-PLANO-DA-SECAO-1111 · KINEO-K4-PLANO-VARIADO-1111 — era: `Shot focus: ${pista(a.secoes[j])}. ${a.prompts[i]}` (a ação da cena inteira em cada metade)
      stills.push(pos === 0 ? (a.stills[i] ?? null) : null)
      const fala = g.length === 1 && !exatos ? norm(a.falas[i]) : norm(secao.voiceover)
      falas.push(i === 0 && pos === 0 && prefixo ? `${prefixo} ${fala}` : fala)
    })
  })
  return { prompts: comSujeitoDaCenaNaMetade(prompts, a.prompts, falas, grupos), stills, falas, grupos } // KINEO-SUJEITO-NA-METADE-1711
}

// ═══ KINEO-SUJEITO-NA-METADE-1711 [TRAVA 8.2 — aval permanente do fundador 01/11 (laço do revisor)] — o sujeito obrigatório sobrevive à cena fundida ═══
// Revisor 17/11 (filme 44d02f20, "In 1950, a plane vanished", nota 5, nenhum avião em 8 quadros). O sujeito obrigatório entra na CENA como
// "Main subject clearly visible in frame: a plane." (lib/cinematic/sujeitoObrigatorio e sujeitoTodosMotores). Quando essa cena é fundida (duas
// seções), cada metade nasce só da pista da sua seção (promptDaSecao) e a frase do sujeito ficava fora das duas: o pedido ao Kling 4 saía
// "foggy forest path" e "old newspaper headline". Agora a frase que a cena fundida traz vai, inteira e logo depois do meio (a mesma inserção
// de comSujeitoNasMetades), à metade cuja FALA cita o sujeito; nenhuma cita = a última metade (sem imagem-chave, dirigida pelo texto).
// Cena sem a frase, cena de uma seção só, ou metade que já a traz: byte a byte como antes. Pura.
// volta 2 (revisão independente 17/11) — o substantivo núcleo da frase do sujeito (inglês): sem o parêntese, até a 1ª preposição ou oração, sem o gerúndio do fim; a última palavra.
// "an old wooden ship" → ship · "a ninja cat running on rooftops (ginger)" → cat · "a child with a 3D pen" → child · "a C-54 Skymaster airplane" → airplane.
const CORTE_DO_NUCLEO = /\s(?:of|in|on|at|with|from|over|under|near|by|for|into|through|across|above|behind|that|who|which|and)\s/iu
export function nucleoDoSujeito(frase: string): string {
  const ws = norm(frase).replace(/\([^)]*\)/gu, ' ').split(CORTE_DO_NUCLEO)[0].toLowerCase().match(/[\p{L}\p{N}][\p{L}\p{N}-]*/gu) ?? []
  while (ws.length > 1 && /ing$/u.test(ws[ws.length - 1])) ws.pop()
  return ws[ws.length - 1] ?? ''
}
const mesmaPalavra = (w: string, nucleo: string) => w === nucleo || w === `${nucleo}s` || w === `${nucleo}es` || `${w}s` === nucleo
const SUJEITO_DA_CENA_RE =/Main subject clearly visible in frame: (.+?)(?<!\b[A-Z])\.(?=\s|$)/u
export function comSujeitoDaCenaNaMetade(planos: readonly string[], promptsDasCenas: readonly string[], falasDosPlanos: readonly string[], grupos: readonly number[][]): string[] {
  const saida = [...planos]
  let k = 0
  grupos.forEach((g, i) => {
    const ini = k
    k += g.length
    const m = g.length > 1 ? SUJEITO_DA_CENA_RE.exec(norm(promptsDasCenas[i])) : null
    if (!m || saida.slice(ini, k).some((p) => p.includes(m[0]))) return
    const nucleo = nucleoDoSujeito(m[1]) // volta 2 — só o substantivo núcleo decide a metade (adjetivo não: "an old wooden ship" × "An old man told this story.")
    const cita = nucleo ? g.findIndex((_, pos) => (norm(falasDosPlanos[ini + pos]).toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []).some((w) => mesmaPalavra(w, nucleo))) : -1
    const alvo = ini + (cita >= 0 ? cita : g.length - 1)
    const p = norm(saida[alvo])
    const meio = /^[^.]{2,60}\./.exec(p)?.[0] ?? ''
    saida[alvo] = norm(`${meio} ${m[0]} ${p.slice(meio.length)}`)
  })
  return saida
}

// ═══ KINEO-SUJEITO-APARENCIA-1311 (b) [CEO 13/11, gato ninja 7f92fe17] — a metade de cena leva o sujeito completo do pedido ═══
// As metades (planos 2 e 3 do gato ninja) saíam "Photoreal film. Main subject of this shot: cat jumping rooftop, shown in motion." — sem a
// cor e fora do telhado. Quando o sujeito completo foi a todo plano (lib/cinematic/sujeitoObrigatorio, relato.planos_com_sujeito), cada
// metade de cena fundida ganha a MESMA linha logo depois do meio ("Main subject clearly visible in frame: a ninja cat running on rooftops
// (ginger)."). Plano que não é metade, ou metade que já traz a frase, fica igual. Sem frase = os mesmos planos. Pura.
export function comSujeitoNasMetades(prompts: readonly string[], grupos: readonly number[][], frase: string | null | undefined): string[] {
  const f = norm(frase).replace(/[.\s]+$/u, '')
  const saida = [...prompts]
  if (!f) return saida
  let k = 0
  for (const g of grupos) {
    for (let pos = 0; pos < g.length; pos++, k++) {
      if (g.length < 2 || k >= saida.length || saida[k].includes(f)) continue
      const p = norm(saida[k])
      const meio = /^[^.]{2,60}\./.exec(p)?.[0] ?? ''
      saida[k] = norm(`${meio} Main subject clearly visible in frame: ${f}. ${p.slice(meio.length)}`)
    }
  }
  return saida
}
