// ═══════════════════════════════════════════════════════════════════════════
// KINEO-PRICING-V6-2026-08-19 — O PREÇO ESCRITO NAS PÁGINAS DE SEO.
// ═══════════════════════════════════════════════════════════════════════════
// POR QUE ESTE ARQUIVO EXISTE (e por que não é "mais uma indireção"):
//
// O checkout já tinha fonte única desde a V3 (lib/checkoutPricing.ts). As ~25
// páginas de marketing/SEO, não: cada uma escrevia "$9.90" à mão, dentro de
// literais de string, dezenas de vezes por arquivo. O resultado é o que se
// mediu em 19/08 — a Stripe cobrando o preço novo enquanto /alternatives,
// /vs, /pricing (metadata) e mais vinte páginas continuavam publicando o
// velho. Não é descuido de ninguém: é o que sempre acontece quando o número
// mora em 200 lugares e a lista desses lugares não existe em canto nenhum.
//
// A alternativa era repetir estas mesmas três linhas em cada página. Isso
// resolve o preço de HOJE e recria o problema no próximo reprice, porque
// voltam a ser 20 arquivos para lembrar. Aqui é UM import por página e um
// grep (`from '@/lib/marketingPrice'`) que lista a superfície inteira.
//
// NADA AQUI É UM NÚMERO. Tudo deriva de TIER_PRICES/TIER_CREDITS — as mesmas
// constantes que a rota da Stripe usa para cobrar. Um reprice em
// checkoutPricing.ts chega nestas páginas sem que ninguém precise abri-las.
import { TIER_PRICES, TIER_CREDITS, type CheckoutTier } from '@/lib/checkoutPricing'
import { creditCostFor, type Quality } from '@/lib/credits/engineCost'

/** "7" / "15" / "29" — dólares inteiros, sem centavos zerados. A escada da V6
 *  é redonda de propósito, e a copy de marketing lê melhor como "$7/mo" do que
 *  como "$7.00/mo". Se um dia um tier voltar a ter centavos, eles aparecem
 *  sozinhos (o toFixed(2) só entra quando há centavo de verdade). */
function usdLabel(tier: CheckoutTier): string {
  const cents = TIER_PRICES[tier].usd
  return cents % 100 === 0 ? String(cents / 100) : (cents / 100).toFixed(2)
}

/** "7" — só o número, sem cifrão. Existe para as páginas em espanhol e
 *  português, onde a moeda se escreve "US$ 7" e não "$7". */
export const STARTER_USD_AMOUNT = usdLabel('starter')

export const STARTER_PRICE = `$${usdLabel('starter')}`
export const CREATOR_PRICE = `$${usdLabel('basic')}`
export const STUDIO_PRICE = `$${usdLabel('pro')}`

export const STARTER_MO = `${STARTER_PRICE}/mo`
export const STARTER_MONTH = `${STARTER_PRICE}/month`
export const CREATOR_MO = `${CREATOR_PRICE}/mo`
export const CREATOR_MONTH = `${CREATOR_PRICE}/month`
export const STUDIO_MO = `${STUDIO_PRICE}/mo`
export const STUDIO_MONTH = `${STUDIO_PRICE}/month`

/** Créditos mensais de cada plano — mesma fonte que o webhook credita. */
export const STARTER_CREDITS = TIER_CREDITS.starter
export const CREATOR_CREDITS = TIER_CREDITS.basic
export const STUDIO_CREDITS = TIER_CREDITS.pro

// ═══════════════════════════════════════════════════════════════════════════
// KINEO-PRICING-V6-2026-08-19 — QUANTOS FILMES O PLANO REALMENTE FAZ.
// ═══════════════════════════════════════════════════════════════════════════
// Este bloco nasceu de uma PROMESSA QUEBRADA, não de vontade de abstrair.
//
// Cinco superfícies de produto prometiam, com estas palavras, "1 Hollywood
// film every month — included" no Creator: o grid do /generate, a caixa de
// 0 créditos, o modal de exit-intent, o e-mail de abandono e o de free-upsell.
// A frase nasceu verdadeira na V3B (Creator = 150 créditos, Hollywood = 150).
// Na V6 o Creator tem 90 e o Hollywood continua custando 150 — a promessa
// virou aritmeticamente impossível, e ninguém percebeu porque o "150" da
// esquerda e o "150" da direita moravam em arquivos diferentes.
//
// A lição é a mesma do preço: quantidade de vídeo é uma DIVISÃO entre duas
// constantes que mudam em commits separados (grant do plano × custo do motor).
// Escrever o resultado à mão é assinar um cheque contra um saldo que outra
// pessoa pode gastar. Aqui a divisão é feita na hora, das duas fontes reais.
//
// `isPaidUser = true` porque toda frase deste arquivo descreve o que um
// ASSINANTE recebe — no plano gratuito o Fast custa 0 e a conta daria ∞.

/** Quantos vídeos de `quality` cabem no grant mensal de `tier`. Arredonda
 *  para baixo: prometer o vídeo que não fecha é exatamente o defeito acima. */
export function videosPerMonth(tier: CheckoutTier, quality: Quality): number {
  return Math.floor(TIER_CREDITS[tier] / creditCostFor(quality, true))
}

/** Seedance (20 cr) — o motor de IA de entrada, é ele que a copy chama de
 *  "engine film". Starter 2 · Creator 4 · Studio 8. */
export const STARTER_AI_FILMS = videosPerMonth('starter', 'cinematic_ai')
export const CREATOR_AI_FILMS = videosPerMonth('basic', 'cinematic_ai')
export const STUDIO_AI_FILMS = videosPerMonth('pro', 'cinematic_ai')

/** Kling 2.5 (50 cr) — o cinematográfico. Creator 1 · Studio 3. */
export const CREATOR_CINEMATIC_FILMS = videosPerMonth('basic', 'cinematic_kling')
export const STUDIO_CINEMATIC_FILMS = videosPerMonth('pro', 'cinematic_kling')

/** Kling 3 / "Hollywood" (150 cr) — o filme caro. Studio 1; Creator ZERO.
 *  Toda copy que quiser vender o filme Hollywood tem de checar isto antes,
 *  em vez de repetir a frase de 2026-07-10. */
export const STUDIO_HOLLYWOOD_FILMS = videosPerMonth('pro', 'cinematic_hollywood')
export const CREATOR_HOLLYWOOD_FILMS = videosPerMonth('basic', 'cinematic_hollywood')

/** true = o plano fecha pelo menos um filme Hollywood no mês. */
export function fitsHollywood(tier: CheckoutTier): boolean {
  return videosPerMonth(tier, 'cinematic_hollywood') >= 1
}

// ═══════════════════════════════════════════════════════════════════════════
// KINEO-CLIPES-2026-08-19 — CONTAR CENAS TAMBÉM, NÃO SÓ FILMES.
// ═══════════════════════════════════════════════════════════════════════════
// Descoberto conferindo a página de preços do Higgsfield ao vivo. O plano topo
// deles ($99/mês anual) anuncia "~133 Seedance 2.0 videos"; o Plus ($39) anuncia
// "~44". O nosso Studio anuncia "9 filmes".
//
// Os dois números são verdadeiros e medem coisas DIFERENTES: o deles é CLIPE
// (o Higgsfield é gerador de clipe com controle de câmera — quem escreve,
// narra, legenda e monta é o cliente); o nosso é FILME PRONTO de 60s+, com
// roteiro, narração, legenda karaokê e trilha.
//
// Na mesma unidade a nossa posição é boa: um filme de 65s precisa de ~8 cenas,
// então os 44 clipes do Plus deles são ~5 filmes de matéria-prima por $39,
// contra 4 filmes PRONTOS por $29 no nosso Studio. Custo por filme quase
// idêntico — e a gente faz o trabalho.
//
// O PROBLEMA NUNCA FOI O PLANO, FOI A UNIDADE DE MEDIDA. "133 vídeos" ao lado
// de "9 filmes" parece 14× maior mesmo não sendo, e o cliente que não conhece
// a diferença conclui que somos caros e mesquinhos — exatamente a percepção
// que o fundador já fechou como o vazamento do checkout. A gente estava se
// subvendendo por honestidade de nomenclatura.
//
// A CORREÇÃO NÃO É INFLAR NADA. É dizer as duas verdades: filmes prontos E as
// cenas que os compõem. Nenhum número novo é inventado — SCENES_PER_FILM é a
// média real do planner Hollywood, e a conta sai das mesmas constantes.
//
// ⚠️ O QUE NÃO SE DEVE COPIAR DELES: anunciar SÓ o clipe. Clipe é o terreno
// onde eles ganham (têm mais dinheiro e vendem volume bruto); filme pronto é o
// nosso. Trocar a nossa unidade pela deles seria escolher competir no campo
// onde perdemos — a cena entra ao LADO do filme, nunca no lugar.

/** Cenas por filme de 60s+. Não é chute: o planner Hollywood corta o roteiro
 *  em cenas de 8-12s, então um filme de ~65s fecha em 7-9. Usamos 8, o meio. */
export const SCENES_PER_FILM = 8

/** Cenas geradas que cabem no plano, na mesma unidade que o mercado anuncia.
 *  Deriva de videosPerMonth × SCENES_PER_FILM — se o grant ou o custo do motor
 *  mudar, este número acompanha sozinho. */
export function scenesPerMonth(tier: CheckoutTier, quality: Quality): number {
  return videosPerMonth(tier, quality) * SCENES_PER_FILM
}

/** Seedance (o motor que a copy chama de "engine film"), em cenas. */
export const STARTER_SCENES = scenesPerMonth('starter', 'cinematic_ai')
export const CREATOR_SCENES = scenesPerMonth('basic', 'cinematic_ai')
export const STUDIO_SCENES = scenesPerMonth('pro', 'cinematic_ai')

/** A frase pronta, para não ser reescrita de formas diferentes em cada tela.
 *  Ex.: "≈ 4 finished films — 32 AI scenes". */
export function filmsAndScenes(tier: CheckoutTier, quality: Quality = 'cinematic_ai'): string {
  const films = videosPerMonth(tier, quality)
  return `≈ ${films} finished ${films === 1 ? 'film' : 'films'} — ${films * SCENES_PER_FILM} AI scenes`
}

// ═══════════════════════════════════════════════════════════════════════════
// KINEO-CUSTO-POR-FILME-2026-08-21 — O PREÇO NA UNIDADE EM QUE O CLIENTE PENSA
// ═══════════════════════════════════════════════════════════════════════════
// O problema medido: a grade de preços vende CRÉDITO ("90 credits/month"), e
// ninguém tem intuição sobre crédito. Para saber o que está comprando, a
// pessoa precisa dividir 90 por 20 (que ela não sabe que é 20) e comparar o
// resultado com uma referência que a página não dá. Ninguém faz duas contas de
// cabeça na tela que pede cartão — ela olha "$15/mês", não sabe traduzir, e
// vai embora. Isso conversa direto com a conclusão fechada do fundador em
// 19/08: o vazamento é PERCEPÇÃO DE VALOR, não trilho de pagamento.
//
// Este bloco faz a conta pela pessoa, na unidade dela: FILME PRONTO.
//
// ⚠️ ACHADO QUE ESTA FUNÇÃO EXPÔS, e que é decisão do FUNDADOR, não minha:
// na V6 o custo por filme é praticamente IGUAL nos três planos
// (Starter $7/2 = $3,50 · Creator $15/4 = $3,75 · Studio $29/8 = $3,63).
// Ou seja: subir de plano não barateia o filme — em Creator ele fica até um
// pouco mais caro que em Starter. Uma escada normalmente dá desconto por
// volume, justamente para PUXAR a pessoa para cima; a nossa não dá motivo
// aritmético nenhum para sair do Starter.
// Por isso a copy NÃO imprime este número card a card: lado a lado, ele
// mostraria que o plano do meio é o pior negócio da grade. O número entra UMA
// vez, como âncora contra o mundo lá fora (editor freelancer: $30-75 por
// Short), que é a comparação em que a gente ganha de longe.
// Registrado para o fundador decidir a escada; nenhum preço foi mexido aqui.

/** Custo em dólares de um filme pronto de `quality` dentro do plano `tier`.
 *  Deriva de TIER_PRICES ÷ videosPerMonth — as mesmas fontes que a Stripe
 *  cobra e que o webhook credita. Zero se o plano não fecha um filme. */
export function costPerFilmUsd(tier: CheckoutTier, quality: Quality = 'cinematic_ai'): number {
  const filmes = videosPerMonth(tier, quality)
  if (filmes <= 0) return 0
  return TIER_PRICES[tier].usd / 100 / filmes
}

/** O MELHOR custo por filme da grade — é este que a âncora anuncia. "Melhor"
 *  e não "do Creator" de propósito: a frase diz "a partir de", então ela
 *  continua verdadeira em qualquer reprice, inclusive num que inverta a
 *  ordem dos planos. Frase que sobrevive ao próximo commit vale mais que
 *  frase que descreve o commit de hoje. */
export const BEST_COST_PER_FILM_USD = Math.min(
  ...(['starter', 'basic', 'pro'] as CheckoutTier[])
    .map((t) => costPerFilmUsd(t))
    .filter((v) => v > 0),
)

/** "$3.50" — o rótulo pronto, arredondado para centavo. */
export const BEST_COST_PER_FILM = `$${BEST_COST_PER_FILM_USD.toFixed(2)}`

// KINEO-PRICING-V6-2026-08-19 — a frase que substituiu o preço regional.
// A escada por país morreu (ver o bloco de TIER_PRICES): agora é a MESMA
// oferta no mundo inteiro, só escrita na moeda de quem lê. Páginas que
// diziam "o preço varia por região" usam esta constante para não voltarem a
// divergir umas das outras na hora de explicar isso.
export const SAME_PRICE_WORLDWIDE = 'the same price worldwide'
