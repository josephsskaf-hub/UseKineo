// KINEO-K4-PLANO-FINAL-1111 [CEO 11/11, alavanca 1 de "7 para 8,5", atrás de interruptor]
// Os filmes 8+ do revisor têm o acontecimento central ACONTECENDO na tela e um fim que fecha; os 7 terminam parados ("o lançamento ao espaço não
// aparece", "FINAL parado ~6 s"; na prova do 2120f018 = 8,0, o céu estrelado do fim é um papel de parede: os 2 quadros do último plano são
// iguais). Aqui, só no ÚLTIMO plano do Kling 4 grátis (multi_prompt):
//   (1) o plano diz que o momento acontece e se completa na tela, com a câmera se movendo junto ("Final shot: …");
//   (2) a oração que só descreve ("capturing the vastness of creation's beauty", "symbolizing…") e a câmera parada ("slow pull-back",
//       "static shot") saem — elas tomavam o lugar do movimento;
//   (3) o plano final de close sobe de escala (o fim mostra o acontecimento inteiro, não um detalhe), a menos que tenha imagem-chave.
// Plano que passaria de 512 com a frase fica só com (2) e (3). Lib PURA. Guardião: scripts/test-k4-plano-final-1111.mjs.

import { comEscala, escalaDoPlano } from '@/lib/kling4PlanoVariado'

/** off = ninguém · internal = só contas da casa (isInternalEmail) · public = todo filme grátis do Kling 4. */
export type ModoPlanoFinal = 'off' | 'internal' | 'public'
export const KLING4_PLANO_FINAL: ModoPlanoFinal = 'internal' // só a casa até a nota da prova paga
export const KLING4_PLANO_FINAL_VERSAO = 'plano_final_1111_v1'

export function planoFinalLigado(modo: ModoPlanoFinal, contaDaCasa: boolean): boolean {
  return modo === 'public' || (modo === 'internal' && contaDaCasa === true)
}

const FIM = ' Mouth closed, no speaking.'
export const FRASE_DO_FINAL = 'Final shot, in continuous motion: the camera moves through the scene while the light visibly changes, and the action completes on screen.'
// oração que descreve em vez de agir: sai inteira até a próxima vírgula ou ponto
const ENCHIMENTO_RE = /,\s*(?:capturing|evoking|conveying|symboli[sz]ing|representing|highlighting|emphasi[sz]ing|showcasing|reflecting|suggesting|creating a sense of|hinting at)\b[^,.]*/giu
// a câmera parada do molde do último plano
const PARADO_RE = /,?\s*\b(?:slow pull-back|slow pull back|static (?:shot|camera)|still frame|locked-off (?:shot|camera))\b/giu

/** O último plano em movimento. Sem nada a mudar, o mesmo texto. */
export function planoFinalEmMovimento(plano: string, opcoes: { comImagemChave?: boolean; escalaAnterior?: string | null; teto?: number } = {}): string {
  const teto = opcoes.teto ?? 512
  const p = String(plano ?? '')
  const cauda = p.endsWith(FIM) ? FIM : ''
  let corpo = cauda ? p.slice(0, -cauda.length) : p
  // a proteção do fim ("no readable text…") não é ação: as trocas valem só antes dela
  const i = corpo.search(/,?\s*no readable text/u)
  const acao = i >= 0 ? corpo.slice(0, i) : corpo
  const protecao = i >= 0 ? corpo.slice(i) : ''
  let nova = acao.replace(ENCHIMENTO_RE, '').replace(PARADO_RE, '').replace(/\s+([,.])/gu, '$1').replace(/([.!?]),/gu, '$1')
  // (3) o fim não termina num detalhe
  if (!opcoes.comImagemChave) {
    const lida = escalaDoPlano(nova + protecao)
    if (lida?.escala === 'detalhe') nova = comEscala(nova + protecao, opcoes.escalaAnterior === 'aberto' ? 'medio' : 'aberto', lida).slice(0, -protecao.length || undefined)
  }
  corpo = nova + protecao
  const meio = /^[^.]{2,60}\.\s/u.exec(corpo)?.[0]
  const comFrase = corpo.includes(FRASE_DO_FINAL) ? corpo : meio ? `${meio}${FRASE_DO_FINAL} ${corpo.slice(meio.length)}` : `${FRASE_DO_FINAL} ${corpo}`
  const final = `${comFrase}${cauda}`
  if (Array.from(final).length <= teto) return final
  const semFrase = `${corpo}${cauda}`
  return Array.from(semFrase).length <= teto ? semFrase : p
}
