// ═══ KINEO-FICHA-REPROVADA-1911 [dono 19/11 20:2x: "pode fechar o furo da ficha"; CEO 19/11, prova paga] ═══════════════════════════════════════
// Prova paga 8e83778f (Natal): o leitor do elenco falhou por prazo, a ficha do Daniel ficou a do molde literal ("exactly as the author wrote: 'photos
// show Daniel'") com as ÂNCORAS lidas da folha (uma imagem que nós geramos: "20-30, long wavy brown, clean-shaven, light skin, wearing white tank top,
// blue jeans") e a ORIGEM "an American woman" — e foi assim a todo plano. O juiz do plano reprovou "a_ficha" (nota 75, planos 1-3) antes e depois, e
// nada segurou: o passo de antes das imagens (fichaAntesDoRender1311) só tira a ORDEM "The only person in this shot…" (refeitos: sem_ordem/nada), a
// revisão do A2 não reescreve ficha (reescrever a descrição não conserta o elenco) e o juiz final está em 'observe'.
// Aqui, com o interruptor: ficha reprovada pelo juiz (a_ficha) não vai ao motor.
//   1. Reescreve UMA vez: saem da ficha as partes que NÓS acrescentamos e que o texto do cliente não escreve — as âncoras lidas da folha
//      ("appearance anchors: …") e a origem ("origin: …"). O trecho do autor e o nome ficam. O juiz lê de novo (prazo do A2).
//   2. Continua reprovada (ou o juiz não respondeu): a ficha sai dos planos inteira (Identity:/Visible:, a cláusula "The same main character appears…",
//      a ordem "The only person in this shot…"). O plano fica com a ação; é o caminho sem ficha, mais seguro que mandar a ficha que o juiz reprovou.
// Nunca derruba o filme: erro em qualquer passo = o passo seguinte (sem ficha) ou, se nem isso, os planos como estavam. 'off' = byte a byte.
export type ModoFichaReprovada1911 = 'off' | 'internal' | 'public'
export const FICHA_REPROVADA_1911: ModoFichaReprovada1911 = 'internal' // CEO 19/11: 'internal' = só a conta exata do ensaio; 'public' só com revisor independente + prova paga + sim do dono
export const fichaReprovadaLigada = (modo: ModoFichaReprovada1911, contaDoEnsaio: boolean): boolean => modo === 'public' || (modo === 'internal' && contaDoEnsaio)
export const FICHA_REPROVADA_VERSAO = 'ficha_reprovada_1911_v1'
export const FICHA_REPROVADA_EVENTO = 'kling4_ficha_reprovada'

type VereditoDaFicha = { status?: string; falhas?: readonly string[] } | null | undefined
/** O juiz julgou e reprovou a ficha (a acusação já passou pela conferência de citação dele). */
export const fichaReprovada = (v: VereditoDaFicha): boolean => !!v && v.status === 'JUDGED' && (v.falhas ?? []).includes('a_ficha')

const limpaPontuacao = (t: string) => t.replace(/;\s*;/g, ';').replace(/;\s*\./g, '.').replace(/\.\s*\./g, '.').replace(/\s{2,}/g, ' ').replace(/\s+([,.;])/g, '$1').trim()
/** A ficha sem o que NÓS acrescentamos: as âncoras lidas da folha e a origem (o trecho do autor e o nome ficam). */
export function semAncorasDaFolha(plano: string): string {
  const t = String(plano ?? '')
  const s = t.replace(/;\s*appearance anchors:[^;.]*/gu, '').replace(/;\s*origin:[^;.]*/gu, '')
  return s === t ? t : limpaPontuacao(s)
}
/** O plano sem a ficha: a linha Identity:/Visible:, a cláusula da ficha travada e a ordem "The only person in this shot…". A ação fica. */
export function semFicha(plano: string): string {
  const t = String(plano ?? '')
  const s = t
    .replace(/The only person in this shot is the same main character \(((?:[^()]|\((?:[^()]|\([^()]*\))*\))*)\); any other person described below is replaced by this same character\.\s*/gu, '')
    .replace(/\s*The same main character appears in this scene, consistent design: .+?(?:\.(?=\s|$)|(?=,?\s*no readable text)|$)/gu, '')
    .replace(/(?:Visible(?:, seen from behind)?|Identity): .+?(?:\.(?=\s|$)|(?=,?\s*no readable text))\s*/gu, '')
  return s === t ? t : limpaPontuacao(s)
}

export interface RelatoFichaReprovada { versao: string; acao: 'nada' | 'sem_ancoras' | 'sem_ficha'; reprovada_antes: boolean; reprovada_depois: boolean | null; ms: number }
/**
 * A ficha que vai ao motor. `veredito` = o juiz sobre os planos de agora; `julgarDeNovo` lê os planos com a ficha sem âncoras (o prazo é de quem chama).
 * Pura fora do juiz; nunca lança.
 */
export async function fichaQueVaiAoMotor(a: { veredito: VereditoDaFicha; prompts: readonly string[]; julgarDeNovo: (prompts: string[]) => Promise<VereditoDaFicha> }): Promise<{ prompts: string[]; relato: RelatoFichaReprovada }> {
  const t0 = Date.now()
  const base = [...a.prompts]
  const relato: RelatoFichaReprovada = { versao: FICHA_REPROVADA_VERSAO, acao: 'nada', reprovada_antes: fichaReprovada(a.veredito), reprovada_depois: null, ms: 0 }
  if (!relato.reprovada_antes) return { prompts: base, relato }
  try {
    const p1 = base.map(semAncorasDaFolha)
    if (p1.some((p, i) => p !== base[i])) {
      let v2: VereditoDaFicha = null
      try { v2 = await a.julgarDeNovo(p1) } catch { v2 = null }
      relato.reprovada_depois = v2 && v2.status === 'JUDGED' ? fichaReprovada(v2) : null
      if (relato.reprovada_depois === false) { relato.acao = 'sem_ancoras'; relato.ms = Date.now() - t0; return { prompts: p1, relato } }
    }
    relato.acao = 'sem_ficha'; relato.ms = Date.now() - t0
    return { prompts: base.map(semFicha), relato }
  } catch {
    relato.ms = Date.now() - t0
    return { prompts: base, relato }
  }
}
