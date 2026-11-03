// KINEO-GRATIS-REFAZ-CENA-0311 [TRAVA 8.2 — fundador 03/11: "As 2 sim" — refazer a cena reprovada no 1º filme grátis]
// Decisão do fundador (03/11, "sim"): quando o juiz pega um defeito no PRIMEIRO filme grátis, refazer sozinho SÓ a cena com o
// problema (~US$ 0,30–0,80 por filme), só para conta de país rico. Os tetos novos do juiz de pixel (KINEO-JUIZ-PERGUNTAS-0311:
// época 70, pessoa inventada 75, plano parado 80) caíam em 'other_pixel_cap' — falha honesta SEM cena nova (entregue com o
// crédito devolvido). Aqui eles ganham a MESMA refação de uma cena que o portão já faz para texto inventado e troca de
// personagem (lib/free15Gate.ts), com a correção POSITIVA no prompt da cena.
//   · TEXTO (teto 85) e ESTILO foto×desenho (conta como troca de personagem, teto 70) já refaziam a cena antes desta entrega
//     ('invented_text' → pixel_scene_cap; troca de estilo → identity_changes → caminho da identidade). Ficam byte a byte.
//   · ÉPOCA: o sufixo curto de época de lib/cinematic/elencoEpoca (sufixoDeEpoca) vai à FRENTE do prompt (o longo já estava no fim
//     e não bastou) + trocarModernidades; com folha de personagem, o still da cena é refeito com a mesma correção.
//   · PESSOA: frase positiva de lugar vazio na frente (a cláusula "No people…" de personagemAjuste já estava no fim e não bastou).
//   · PARADO: frase positiva de movimento contínuo na frente.
// Módulo PURO (sem rede, sem banco): o portão decide, o servidor só adapta. Guardião: scripts/test-gratis-refaz-cena-0311.mjs.
import { epocaDaHistoria, sufixoDeEpoca, trocarModernidades, type Epoca } from '@/lib/cinematic/elencoEpoca'
import { epocaDoPrompt0311, semGenteNoPrompt0311 } from '@/lib/regua95/perguntasHonestas'

export const MARCA_GRATIS_REFAZ_CENA_0311 = 'KINEO-GRATIS-REFAZ-CENA-0311'
export type MotivoRefaz0311 = 'epoca' | 'pessoa' | 'parado'
/** Ordem de prioridade quando mais de um teto novo dispara: só UMA cena é refeita por filme. */
export const MOTIVOS_REFAZ_0311: readonly MotivoRefaz0311[] = ['epoca', 'pessoa', 'parado']
/** Os códigos do juiz de pixel (lib/regua95/perguntasHonestas PIXEL_ISSUES_0311) que localizam cada motivo nos quadros (parado: os mesmos de segundosParados0311). */
export const CODIGOS_DO_MOTIVO_0311: Record<MotivoRefaz0311, readonly string[]> = { epoca: ['anachronism'], pessoa: ['invented_person'], parado: ['static', 'repeated'] }
/** Correção positiva da cena sem gente (não existe frase positiva pronta no código; a negativa CLAUSULA_SEM_GENTE já está no prompt). */
export const PREFIXO_SEM_GENTE_0311 = 'An empty, deserted place with no one present: only the setting and objects are visible. '
/** Correção positiva do plano parado (não existe frase pronta de movimento no código). */
export const PREFIXO_MOVIMENTO_0311 = 'Continuous visible motion from the first to the last frame: the camera slowly pushes in while the subject and the environment keep moving. '
/** Teto do prompt do clipe refeito (o portão ainda põe a instrução de reparo na frente e corta em 6000). */
export const TETO_PROMPT_CLIPE_0311 = 5600
/** Teto do prompt do still com folha (lib/cinematic/elencoTrava referenciaDaCenaNoClaim corta em 2600). */
export const TETO_PROMPT_STILL_0311 = 2600

/** O que o portão grava no estado assinado (e no evento free15_delivery_gate) quando a refação é deste motivo. */
export type RefazCena0311 = {
  motivo: MotivoRefaz0311
  /** índice 0-based da cena refeita (o mesmo sceneIndex do estado) */
  cena: number
  /** quadros (1-based) do juiz que apontaram o defeito nesta cena; vazio = plano parado sem quadro localizado (última cena) */
  quadros: number[]
  /** "1950" / "the 1950s" (só época) */
  epoca?: string
  /** custo estimado da fal para o clipe refeito (freeRedo custoEstimadoUsd) */
  usdEstimado: number
  /** passed | failed quando o portão termina */
  resultado?: 'passed' | 'failed'
}

/**
 * Os tetos do juiz são SÓ os novos? Devolve os motivos (em ordem de prioridade) ou null quando há outro teto (quadro preto,
 * deformação…) que refazer uma cena não conserta. "Quadros repetidos" acompanha o plano parado (o mesmo defeito visto de outro
 * jeito) e só é aceito junto com ele.
 */
export function motivosDosTetos0311(caps: ReadonlyArray<string>): MotivoRefaz0311[] | null {
  const achados = new Set<MotivoRefaz0311>()
  let repetidos = false
  for (const c of caps) {
    const t = String(c ?? '')
    if (/^época errada:/.test(t)) achados.add('epoca')
    else if (/^pessoa inventada em cena sem gente/.test(t)) achados.add('pessoa')
    else if (/^plano parado por /.test(t)) achados.add('parado')
    else if (/^\d+ quadros repetidos/.test(t)) repetidos = true
    else return null
  }
  if (repetidos && !achados.has('parado')) return null
  const motivos = MOTIVOS_REFAZ_0311.filter((m) => achados.has(m))
  return motivos.length ? motivos : null
}

/** A época da cena: a marca "Period setting:" do prompt dela; na falta, as palavras da história (a mesma régua do juiz). */
export function epocaDaCena0311(prompt: unknown, contexto: string): Epoca | null {
  const doPrompt = epocaDoPrompt0311(prompt)
  return epocaDaHistoria(doPrompt ?? contexto)
}

/** A cena pode receber a correção deste motivo? (pessoa: só cena que o prompt pediu SEM gente; época: só com época conhecida) */
export function cenaAceitaMotivo0311(motivo: MotivoRefaz0311, prompt: unknown, contexto: string): boolean {
  if (motivo === 'pessoa') return semGenteNoPrompt0311(prompt)
  if (motivo === 'epoca') return epocaDaCena0311(prompt, contexto) !== null
  return true
}

/** O prompt com a correção positiva na frente. Sem espaço no teto: só a troca determinística de modernidades (época) ou o prompt de sempre. */
export function aplicarCorrecao0311(prompt: unknown, motivo: MotivoRefaz0311, contexto: string, teto: number): string {
  const base = String(prompt ?? '')
  let corpo = base
  let prefixo = ''
  if (motivo === 'epoca') {
    const epoca = epocaDaCena0311(base, contexto)
    if (!epoca) return base
    // só ANTES da marca "Period setting:": o sufixo de época tem "no hoodies"/"no LED screens", e a troca transformaria a proibição
    // em "no a 1950s wool overcoat" (proibir a roupa certa).
    const marca = base.indexOf('Period setting:')
    corpo = marca < 0 ? trocarModernidades(base, epoca).prompt : trocarModernidades(base.slice(0, marca), epoca).prompt + base.slice(marca)
    prefixo = `${sufixoDeEpoca(epoca, true).trim()} `
  } else if (motivo === 'pessoa') prefixo = PREFIXO_SEM_GENTE_0311
  else prefixo = PREFIXO_MOVIMENTO_0311
  if (corpo.startsWith(prefixo)) return corpo
  return prefixo.length + corpo.length <= teto ? prefixo + corpo : corpo
}

/** A correção do relato gravado (a época vem do rótulo gravado: o still com folha nem sempre traz "Period setting:"). */
export function corrigirPrompt0311(prompt: unknown, refaz: Pick<RefazCena0311, 'motivo' | 'epoca'>, teto: number): string {
  return aplicarCorrecao0311(prompt, refaz.motivo, refaz.epoca ?? '', teto)
}

/** "1950" / "the 1950s" para o relato (o mesmo rótulo do juiz). */
export function rotuloDaEpoca0311(epoca: Epoca | null): string | undefined {
  return epoca ? (epoca.ano !== null ? String(epoca.ano) : `the ${epoca.rotulo}`) : undefined
}
