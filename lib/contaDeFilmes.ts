// KINEO-CARTAO-DUAS-CONTAS-0511 [fundador 05/11, "1 sim"] — o que os créditos do plano fazem, nas duas contas: filmes padrão de 60 s OU filmes Kling 4.0.
// Nenhum número digitado: sai dos créditos do plano e dos créditos por motor. Puro. Guardião: scripts/test-precos-0511.mjs.
import { creditsPerReferenceVideo } from '@/lib/marketingPrice'
import { kling4PaidCredits } from '@/lib/kling4PaidPricing'

export interface ContaDeFilmes { padrao60: number; kling60: number; kling15: number }

export function contaDeFilmes(credits: number): ContaDeFilmes {
  const n = Number.isFinite(credits) ? Math.max(0, credits) : 0
  return {
    padrao60: Math.floor(n / creditsPerReferenceVideo('cinematic_ai')),
    kling60: Math.floor(n / kling4PaidCredits(60)),
    kling15: Math.floor(n / kling4PaidCredits(15)),
  }
}
