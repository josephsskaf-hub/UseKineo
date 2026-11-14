// ═══ KINEO-FICHA-ANTES-DO-RENDER-1311 [CEO 13/11: "implemente a regra para a reprovação de ficha refazer o plano antes do render"] ═══════
// O caso (filme 28f057bc, Maya, 13/11 20:50, 1º filme de cliente da França, nota 6, PERSONAGEM_TROCOU): o elenco do modelo escolheu
// "the mother" (meia-idade, cabelo LISO) como protagonista e a rota pôs a ordem "The only person in this shot is the same main character
// (the mother, …)" na frente das 3 cenas — com as frases da ficha vazando de novo depois da ação ("She has smooth, caramel-toned skin and long,
// straight hair. …"). A camada da ideia (KINEO-IDEIA-FICHA-ASSUNTO-1211) pôs no fim a pessoa que o cliente descreveu ("a beautiful 24-year-old
// Martinican woman, with curly black hair"). Duas fichas que se contradizem no MESMO plano. O juiz do plano reprovou "a_ficha" (nota 75,
// planos 1 e 2) — mas em modo observar, DEPOIS do envio. O Kling 4 passou de 8 min, a reserva H3 Max Turbo fez as 3 cenas em texto→vídeo
// (sem imagem-chave) e cada cena seguiu uma das fichas: tranças lisas nas 2 primeiras, cachos soltos nas 2 últimas.
//
// A REGRA (código decide; o juiz só aponta, como já faz): no filme grátis do Kling 4, o juiz do plano roda ANTES das imagens-chave e do 1º
// POST (espera até o teto de 25 s; ~7 s no caso). Plano que ele marca com a ficha CONTRADIZENDO o pedido e que carrega a ordem do protagonista:
//   · com a pessoa da ideia (as palavras do cliente) → a ordem passa a dizer ESSA pessoa;
//   · sem pessoa da ideia, com o sujeito do pedido sendo criatura, objeto ou veículo (o dinossauro, o gato) → no lugar da ordem entra
//     "Main subject clearly visible in frame: <sujeito lido do pedido>." (revisão da CEO 13/11, C3: o plano não fica sem sujeito);
//   · sem nenhum dos dois → a ordem sai (o plano fica sem ficha inventada; a ação fica).
// O juiz casa plano e prompt por posição: só age quando julgou o MESMO número de planos (C5: a reserva descarta cena vazia e deslocaria).
// Nos dois casos as frases da ficha reprovada que vazaram para o resto do plano também saem. Plano sem a ordem: nada muda (fica no relato).
// Juiz desligado, sem chave, prazo, erro, UNVERIFIED ou sem a_ficha: byte a byte o de antes. Nenhuma chamada nova além do juiz.
// Interruptor FICHA_ANTES_DO_RENDER_1311: 'off' = byte a byte o de antes. Guardião: scripts/test-ficha-antes-do-render-1311.mjs.
//
// REVISÃO INDEPENDENTE 14/11 (C3, M6): (1) o veredito de antes só é REAPROVEITADO depois do envio quando o juiz leu exatamente o texto e as falas
// que foram à fal (juizLeuOMesmoTexto); qualquer diferença = a 2ª leitura de sempre. (2) só é refeito o plano cuja acusação de ficha o juiz
// VERIFICOU (a citação está no texto: "plano N · ficha contradiz …" em defeitos); acusação descartada por ele não refaz nada.
import type { JuizPlanoVeredito } from '@/lib/juizDoPlano'

export type ModoFichaAntes = 'off' | 'all'
export const FICHA_ANTES_DO_RENDER_1311: ModoFichaAntes = 'all'
export const fichaAntesDoRenderLigada = (modo: ModoFichaAntes = FICHA_ANTES_DO_RENDER_1311) => modo === 'all'
export const FICHA_ANTES_VERSAO = 'ficha_antes_do_render_1311_v2'
export const FICHA_ANTES_EVENTO = 'juiz_plano_ficha_antes'

const ORDEM_RE = /The only person in this shot is the same main character \(((?:[^()]|\((?:[^()]|\([^()]*\))*\))*)\); any other person described below is replaced by this same character\.\s*/u

/** A ficha que a ordem do protagonista carrega (o texto entre os parênteses), ou null. */
export function fichaDaOrdem(prompt: string): string | null {
  return ORDEM_RE.exec(String(prompt ?? ''))?.[1] ?? null
}

/** As frases da ficha que vazaram para o resto do plano (da 2ª frase em diante, com 25+ caracteres) saem; o resto fica igual. */
function semVazamento(texto: string, ficha: string): string {
  const frases = ficha.split(/(?<=\.)\s+/u).slice(1)
  if (!frases.length) return texto
  const cauda = frases.join(' ')
  let t = texto
  if (cauda.length >= 25 && t.includes(cauda)) t = t.split(cauda).join('')
  for (const f of frases) if (f.length >= 25 && t.includes(f)) t = t.split(f).join('')
  return t.replace(/\.\s*\./g, '.').replace(/\s*,\s*,/g, ',').replace(/\s{2,}/g, ' ').replace(/\s+([,.])/g, '$1').trim()
}

/** Refaz UM plano: a ordem passa a dizer a pessoa da ideia (ou sai) e as frases vazadas da ficha reprovada saem. */
export type SujeitoDoPedido = { sujeito: string; tipo: string | null } | null
const TIPOS_SEM_GENTE = new Set(['criatura', 'objeto', 'veiculo'])
export function semFichaReprovada(prompt: string, pessoaDaIdeia: string | null, sujeitoDoPedido: SujeitoDoPedido = null): { prompt: string; acao: 'ideia' | 'sujeito' | 'sem_ordem' | 'nada' } {
  const p = String(prompt ?? '')
  const m = ORDEM_RE.exec(p)
  if (!m) return { prompt: p, acao: 'nada' }
  const ficha = m[1]
  const pessoa = String(pessoaDaIdeia ?? '').replace(/[.\s]+$/u, '').trim()
  const sujeito = !pessoa && sujeitoDoPedido && TIPOS_SEM_GENTE.has(String(sujeitoDoPedido.tipo)) ? String(sujeitoDoPedido.sujeito ?? '').replace(/[.\s]+$/u, '').trim() : '' // C3 — /[.\s]+$/ (com a barra: sem ela, "octopus" virava "octopu")
  const nova = pessoa ? `The only person in this shot is the same main character (${pessoa}); any other person described below is replaced by this same character. ` : sujeito ? `Main subject clearly visible in frame: ${sujeito}. ` : ''
  const resto = semVazamento(p.slice(0, m.index) + p.slice(m.index + m[0].length), ficha)
  const comecoTrava = /^Film visual medium: .+?\. /u.exec(resto)?.[0] ?? ''
  const refeito = m.index >= comecoTrava.length ? `${comecoTrava}${nova}${resto.slice(comecoTrava.length)}` : `${nova}${resto}`
  return { prompt: refeito, acao: pessoa ? 'ideia' : sujeito ? 'sujeito' : 'sem_ordem' }
}

export interface RelatoFichaAntes {
  versao: string
  status: string
  reprovado: boolean
  falhas: string[]
  nota: number | null
  planos_contradiz: number[]
  refeitos: Array<{ plano: number; acao: 'ideia' | 'sujeito' | 'sem_ordem' | 'nada' }>
  /** C5: o juiz julgou outro número de planos (a reserva descarta cena vazia): nada é refeito */
  indice_incerto: boolean
  com_pessoa_da_ideia: boolean
  ms: number | null
}

/** Os planos (1..N) com a acusação de ficha VERIFICADA pelo juiz: a citação está no texto do plano (linha "plano N · ficha contradiz" em defeitos). */
export function planosComFichaVerificada(v: JuizPlanoVeredito | null): number[] {
  const defeitos = Array.isArray(v?.defeitos) ? (v as JuizPlanoVeredito).defeitos : []
  const out = new Set<number>()
  for (const d of defeitos) { const m = /^plano (\d+) · ficha contradiz/u.exec(String(d ?? '')); if (m) out.add(Number(m[1])) }
  return [...out].sort((a, b) => a - b)
}

/** true só quando o juiz leu EXATAMENTE os planos e as falas que foram à fal (mesma quantidade, mesmo texto, mesma ordem). Pura. */
export function juizLeuOMesmoTexto(lido: ReadonlyArray<{ fala: string; prompt: string }> | null | undefined, enviado: ReadonlyArray<{ fala: string; prompt: string }> | null | undefined): boolean {
  if (!Array.isArray(lido) || !Array.isArray(enviado) || lido.length === 0 || lido.length !== enviado.length) return false
  return lido.every((c, i) => typeof c?.prompt === 'string' && c.prompt.length > 0 && c.prompt === enviado[i]?.prompt && String(c?.fala ?? '') === String(enviado[i]?.fala ?? ''))
}

/** O plano inteiro refeito pelo veredito (índices 1..N do juiz = planos do filme). Pura; o vetor de entrada não muda. */
export function refazerPlanoDaFicha(args: { prompts: ReadonlyArray<string>; veredito: JuizPlanoVeredito | null; pessoaDaIdeia: string | null; sujeitoDoPedido?: SujeitoDoPedido }): { prompts: string[]; relato: RelatoFichaAntes } {
  const v = args.veredito
  const prompts = (Array.isArray(args.prompts) ? args.prompts : []).map((p) => String(p ?? ''))
  const falhasDoJuiz = Array.isArray(v?.falhas) ? (v as JuizPlanoVeredito).falhas : [] // veredito torto nunca lança
  const planosDoJuiz = Array.isArray(v?.planos) ? (v as JuizPlanoVeredito).planos : []
  const verificados = new Set(planosComFichaVerificada(v)) // M6: acusação que o próprio juiz descartou não refaz plano
  const indiceIncerto = !!v && v.status === 'JUDGED' && v.cenas !== prompts.length // C5
  const contradiz = v && v.status === 'JUDGED' && falhasDoJuiz.includes('a_ficha') && !indiceIncerto ? planosDoJuiz.filter((p) => p?.a === 'contradiz' && verificados.has(p.plano)).map((p) => p.plano) : []
  const refeitos: RelatoFichaAntes['refeitos'] = []
  for (const n of contradiz) {
    const i = n - 1
    if (i < 0 || i >= prompts.length) continue
    const r = semFichaReprovada(prompts[i], args.pessoaDaIdeia, args.sujeitoDoPedido ?? null)
    prompts[i] = r.prompt
    refeitos.push({ plano: n, acao: r.acao })
  }
  return {
    prompts,
    relato: {
      versao: FICHA_ANTES_VERSAO, status: v?.status ?? 'SEM_VEREDITO', reprovado: !!v?.reprovado, falhas: [...falhasDoJuiz], nota: v?.nota ?? null,
      planos_contradiz: contradiz, refeitos, com_pessoa_da_ideia: !!String(args.pessoaDaIdeia ?? '').trim(), ms: v?.ms ?? null, indice_incerto: indiceIncerto,
    },
  }
}
