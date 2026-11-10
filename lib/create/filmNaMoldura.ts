// KINEO-STUDIO-NA-MOLDURA-1011 [fundador 10/11: "Quero todas as telas com o design que fizemos no codex"]
// O número do botão "Generate ✦ N" da aba Film. NÃO é tabela nova: é a MESMA função que o servidor usa para cobrar
// (lib/credits/engineCost.ts → creditCostForDuration), com a mesma qualidade que o /studio/create resolve para o motor da caixa.
// Só o motor padrão da caixa ('seedance' → 'cinematic_ai', 35 cr a 60 s, igual para quem paga e quem não paga) ganha número;
// qualquer outro motor (promoções, preço do Kling 4 pago, etc.) devolve null = o botão fica sem número em vez de arriscar um errado.
// Módulo puro: sem rede, sem env.
import { creditCostForDuration } from '@/lib/credits/engineCost'

export function precoDoGenerate(motor: string, duracao: number): number | null {
  return motor === 'seedance' ? creditCostForDuration('cinematic_ai', true, duracao) : null
}
