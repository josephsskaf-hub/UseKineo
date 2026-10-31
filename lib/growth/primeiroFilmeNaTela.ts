// ═══ KINEO-PRIMEIRO-FILME-3110 [TRAVA 8.2 — vai do fundador 31/10 "10 tarefas, já vamos fazer"] ═══════════════════════════
// O DEFEITO (Supabase, só SELECT, 30 dias até 31/10): na tela de geração (/studio/create — a casa de máquinas; /generate é o
// porteiro que redireciona para lá), enquanto o PRIMEIRO filme da pessoa já estava sendo preparado (etapa analyzing/scripting/
// options), as faixas do layout ofereciam "faça seu primeiro filme" com um link que VOLTA para o /studio:
//   · TrialActiveBanner — "Build my 15s Seedance episode →" (trial_first_delivery_clicked): 19 cliques de 14 contas no meio da
//     preparação; 7 delas nunca tiveram vídeo. O botão troca a ideia da pessoa pelo roteiro padrão e abandona a tentativa
//     (render_wait_abandoned no mesmo segundo).
//   · RegionPaidOnlyBanner (filme grátis de região) — "Make my free film" (region_free_film_cta_clicked): 36 cliques de 34
//     contas no meio da preparação; 16 nunca tiveram vídeo. (Hoje dormente: REGION_FREE_FILM_LIVE=false desde 28/10.)
// A pessoa lê "seu filme grátis" e clica — e o clique mata justamente o filme grátis que já estava andando.
//
// A REGRA: na tela de geração a pessoa JÁ está fazendo o primeiro filme — o atalho "vá fazer seu primeiro filme" não aparece
// lá. Nas outras telas (/studio, /library, /ads…) ele continua igual. Botão de COMPRAR não muda em lugar nenhum (memória
// "país rico paga com 0 filmes em 30 min; não esconder o botão de pagar"): só o desvio que abandona o filme some.
// Puro (sem imports): o guardião scripts/test-primeiro-filme-3110.mjs carrega este arquivo direto.

export const PRIMEIRO_FILME_MARCA = 'KINEO-PRIMEIRO-FILME-3110'

/** As rotas da tela de geração: onde o primeiro filme acontece. `/generate` redireciona para `/studio/create`. */
export const GENERATE_SURFACE_PATHS: readonly string[] = Object.freeze(['/studio/create', '/generate'])

/** A pessoa está na tela de geração? Tolera barra final, query e hash; caminho ausente = não (a faixa segue como era). */
export function isGenerateSurface(pathname: string | null | undefined): boolean {
  if (typeof pathname !== 'string' || pathname.length === 0) return false
  const limpo = pathname.split(/[?#]/)[0].replace(/\/+$/, '') || '/'
  return GENERATE_SURFACE_PATHS.includes(limpo)
}

/**
 * O atalho "faça seu primeiro filme" (que navega para o /studio com outro roteiro) pode aparecer nesta tela?
 * Não na tela de geração: lá ele abandona o filme que já está sendo preparado.
 */
export function firstFilmDetourAllowed(pathname: string | null | undefined): boolean {
  return !isGenerateSurface(pathname)
}
