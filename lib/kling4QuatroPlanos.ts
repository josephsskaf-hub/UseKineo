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

const pista = (x: SecaoDoRoteiro) => {
  const p = norm(x.pexelsQuery)
  return (p || Array.from(norm(x.voiceover)).slice(0, 140).join('')).replace(/[\s.!?…;,:]+$/u, '')
}

/** Os planos do Kling 4 por seção. null = nada a dividir ou não dá para provar → o envio de sempre (3 planos). */
export function planosPorSecao(a: {
  prompts: readonly string[]; stills: readonly (string | null)[]; falas: readonly string[]; secoes: readonly SecaoDoRoteiro[]
}): { prompts: string[]; stills: (string | null)[]; falas: string[]; grupos: number[][] } | null {
  if (a.prompts.length !== a.falas.length) return null
  const grupos = secoesDasCenas(a.secoes, a.falas)
  if (!grupos || grupos.every((g) => g.length === 1)) return null
  const total = grupos.reduce((n, g) => n + g.length, 0)
  if (total > KLING4_MAX_PLANOS) return null
  // a fala de antes do 1º marcador (só a 1ª cena pode ter) fica no 1º plano, como na cena
  const alvo0 = norm(a.falas[0]), junto0 = norm(grupos[0].map((x) => a.secoes[x].voiceover).join(' '))
  const prefixo = alvo0 !== junto0 && alvo0.endsWith(` ${junto0}`) ? alvo0.slice(0, alvo0.length - junto0.length).trim() : ''
  const prompts: string[] = [], stills: (string | null)[] = [], falas: string[] = []
  grupos.forEach((g, i) => {
    g.forEach((j, pos) => {
      prompts.push(g.length === 1 ? a.prompts[i] : `Shot focus: ${pista(a.secoes[j])}. ${a.prompts[i]}`)
      stills.push(pos === 0 ? (a.stills[i] ?? null) : null)
      const fala = norm(a.secoes[j].voiceover)
      falas.push(i === 0 && pos === 0 && prefixo ? `${prefixo} ${fala}` : fala)
    })
  })
  return { prompts, stills, falas, grupos }
}
