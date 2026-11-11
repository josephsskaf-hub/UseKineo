// KINEO-STUDIO-NA-MOLDURA-1011 [fundador 10/11: "Quero todas as telas com o design que fizemos no codex"]
// O número do botão "Generate ✦ N" da aba Film. NÃO é tabela nova: é a MESMA função que o servidor usa para cobrar
// (lib/credits/engineCost.ts → creditCostForDuration), com a mesma qualidade que o /studio/create resolve para o motor da caixa.
//
// KINEO-STUDIO-NA-MOLDURA-ABRE-1011 — o número só aparece quando é o que a conta VAI pagar. Sem número ("Generate", como a caixa de hoje):
//   · conta sem prova de plano pago (teste grátis, free, leitura que falhou ou ainda não chegou): o /studio/create pode descer o filme para
//     o curto grátis e as travas do saldo mudam a duração (KINEO-PRIMEIRO-FILME / KINEO-MOTOR-15S, só para quem não paga);
//   · "palavra por palavra": o autofit do /studio/create sobe a duração pela fala do roteiro (contadorVoz, só no verbatim);
//   · texto com uma duração escrita ("make it 90 seconds") diferente da escolhida: a mesma leitura do /studio/create
//     (readPastedDirectives → suggestedDuration) troca a duração antes de cobrar;
//   · KINEO-MOTOR-OPCIONAL-1011 — motor escolhido no passo Details: o número é o do MESMO creditCostForDuration para a quality dele
//     (lib/create/motorOpcional.ts custoDoMotor); motor fora da lista da caixa = sem número.
// "Pagante" = contaPagaNaTela (lib/growth/contaPagaNaTela.ts), a regra que o /studio/create já usa, sobre o MESMO corpo de GET /api/credits
// que a caixa já lê para a linha do filme grátis. Nenhuma regra de plano nova. Módulo puro: sem rede, sem env.
import { creditCostForDuration } from '@/lib/credits/engineCost'
import { contaPagaNaTela } from '@/lib/growth/contaPagaNaTela'
import { readPastedDirectives } from '@/lib/pastedDirectives'
import { MOTOR_PADRAO, custoNoBotao, motoresCandidatos } from '@/lib/create/motorOpcional' // KINEO-MOTOR-OPCIONAL-1011

/** O corpo de GET /api/credits prova plano pago? (true só com sinal explícito; ausente, nulo ou de outro tipo = false) */
export function contaPagaDoSaldo(payload: unknown): boolean {
  if (!payload || typeof payload !== 'object') return false
  const d = payload as Record<string, unknown>
  return contaPagaNaTela({ hasPaid: d.hasPaid === true, isStarter: d.isStarter === true, isCreator: d.isCreator === true, isStudio: d.isStudio === true, planoLido: false, provadoQueNaoPaga: false }) === true
}

export function precoDoGenerate(f: { motor: string; duracao: number; contaPaga: boolean; palavraPorPalavra: boolean; texto: string; opcoesDuracao: readonly number[]; kling4?: unknown }): number | null {
  if (!f.contaPaga || f.palavraPorPalavra || (f.motor !== MOTOR_PADRAO && !motoresCandidatos().includes(f.motor))) return null
  const pedida = readPastedDirectives(f.texto, f.opcoesDuracao).suggestedDuration
  if (pedida !== null && pedida !== f.duracao) return null
  return f.motor === MOTOR_PADRAO ? creditCostForDuration('cinematic_ai', true, f.duracao) : custoNoBotao(f.motor, f.duracao, f.kling4)
}
