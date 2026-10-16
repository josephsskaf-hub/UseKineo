// [TRAVA 8.2 — vai do fundador 16/10 "vai nos 2"] KINEO-TRILHA-15S — o plano de b-roll do Studio só vale quando é o MESMO
// filme, cena a cena. Lib pura (sem import): a rota app/api/generate-video-cinematic/route.ts decide por aqui e o guardião
// scripts/test-trilha-15s-1610.mjs a executa offline.
//
// O defeito (docs/SEEDANCE-15-FORA-DA-TRILHA-2026-10-16.md, 20 filmes de clientes, 60 cenas): o Studio pede o plano de
// b-roll do roteiro INTEIRO (lib/broll/scene-splitter: 4 blocos HOOK / MICRO REWARD 1 / MICRO REWARD 2 / PAYOFF = 4 cenas
// de plano; prosa = 1 cena por frase, até 12) e a rota o aplicava POR POSIÇÃO (`planScenes[i]`) nas cenas do filme. Só que
// o filme não tem as cenas do plano: o de 15 s junta 4 blocos em 3 clipes (seedanceShortMarkedScenes), o de 35/60/90 s
// junta 7-12 blocos em 5-9, a prosa verbatim é cortada pelo divisor de palavras (21 frases em 8 clipes no 60 s), o Veo e o
// Kling 2.5 refazem os planos pela fala. Resultado: o clipe 2 mostrava a imagem do bloco anterior, o clipe 3 a do bloco 3,
// e o prompt do PAYOFF nunca era usado (8 de 20 filmes de 15 s). E, como "havia plano", o descritor #441 — que escreve a
// imagem a partir da fala REAL de cada clipe — era pulado.
//
// A regra: o plano só é aplicado quando (1) tem o MESMO número de cenas do filme final e (2) as cenas do filme SÃO os
// blocos do autor, um por um, na mesma ordem (verbatim com marcadores, fala de cada cena = fala do bloco). Qualquer outro
// caso — contagem diferente, blocos juntados/divididos/amostrados, prosa, modo IA (o escritor reescreve as falas) — o plano
// é ignorado e cada imagem nasce da fala do próprio clipe (verbatim: descritor #441; modo IA: a descrição do escritor de
// cenas, escrita junto com a fala). Sem plano: nada muda.

export type MotivoPlanoDeBroll =
  | 'sem_plano'
  | 'alinhado'
  | 'contagem_diferente'
  | 'cenas_nao_sao_os_blocos'
  | 'modo_ia_sem_alinhamento'

export interface DecisaoPlanoDeBroll {
  aplicar: boolean
  motivo: MotivoPlanoDeBroll
  blocos_do_plano: number
  cenas_do_filme: number
  blocos_do_roteiro: number
}

const normalizar = (t: string | null | undefined): string =>
  String(t ?? '').normalize('NFKC').trim().replace(/\s+/gu, ' ')

export function decidirPlanoDeBroll(input: {
  blocosDoPlano: number
  falasDasCenas: ReadonlyArray<string | null | undefined>
  falasDosBlocos: ReadonlyArray<string | null | undefined>
  verbatim: boolean
}): DecisaoPlanoDeBroll {
  const blocos_do_plano = Math.max(0, Math.trunc(Number(input.blocosDoPlano) || 0))
  const cenas_do_filme = input.falasDasCenas.length
  const blocos_do_roteiro = input.falasDosBlocos.length
  const base = { blocos_do_plano, cenas_do_filme, blocos_do_roteiro }
  if (blocos_do_plano === 0) return { aplicar: false, motivo: 'sem_plano', ...base }
  if (blocos_do_plano !== cenas_do_filme) return { aplicar: false, motivo: 'contagem_diferente', ...base }
  if (!input.verbatim) return { aplicar: false, motivo: 'modo_ia_sem_alinhamento', ...base }
  if (blocos_do_roteiro !== cenas_do_filme) return { aplicar: false, motivo: 'cenas_nao_sao_os_blocos', ...base }
  for (let i = 0; i < cenas_do_filme; i++) {
    const fala = normalizar(input.falasDasCenas[i])
    if (!fala || fala !== normalizar(input.falasDosBlocos[i])) return { aplicar: false, motivo: 'cenas_nao_sao_os_blocos', ...base }
  }
  return { aplicar: true, motivo: 'alinhado', ...base }
}
