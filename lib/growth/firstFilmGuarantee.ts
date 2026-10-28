// ═══ KINEO-AVULSO-GARANTIA-2810 — "refazemos ou devolvemos", no caminho do pagamento ═══════════════════════════════
//
// Fundador, 28/10 (aprovado hoje): a conclusão fechada é que o checkout vaza por PREÇO / RISCO PERCEBIDO — a pessoa
// chega na tela de pagamento e não paga (6 dias sem nenhum pagamento). A frase abaixo tira o risco do primeiro filme:
// se a pessoa não gostar, a gente refaz ou devolve. É COPY que o suporte honra À MÃO (a pessoa responde ao recibo);
// nenhum preço, plano, reembolso ou webhook muda por causa dela.
//
// Onde aparece: sob o botão de compra do /pricing (components/pricing/PlanValueStage.tsx), na página "Continue to
// secure checkout" do portão anti-robô (lib/growth/checkoutRobotGate.ts), no cartão da oferta do download
// (components/growth/DownloadUpsell.tsx) e no custom_text da Stripe (checkout mensal via
// lib/growth/checkoutValueContext.ts, que guarda um espelho LITERAL porque os guardiões o executam sem imports; e o
// passe avulso em app/api/stripe/checkout/route.ts). O guardião scripts/test-avulso-garantia-2810.mjs confere que as
// cópias não divergem.
//
// Módulo PURO, sem imports: roda no edge do middleware, no cliente e nos guardiões.

export const FIRST_FILM_GUARANTEE_VERSION = 'first_film_guarantee_v1' as const

export const FIRST_FILM_GUARANTEE = {
  en: "Not happy with your first film? We'll redo it or refund you — just reply to your receipt.",
  pt: 'Não gostou do seu primeiro filme? A gente refaz ou devolve o seu dinheiro — é só responder ao recibo.',
  es: '¿No te gustó tu primera película? La rehacemos o te devolvemos el dinero — solo responde a tu recibo.',
} as const

export type FirstFilmGuaranteeLang = keyof typeof FIRST_FILM_GUARANTEE

/** A frase na língua da tela (pt/es quando a superfície localiza; inglês em todo o resto). */
export function firstFilmGuarantee(lang?: string | null): string {
  const l = (lang ?? '').toLowerCase().slice(0, 2)
  if (l === 'pt') return FIRST_FILM_GUARANTEE.pt
  if (l === 'es') return FIRST_FILM_GUARANTEE.es
  return FIRST_FILM_GUARANTEE.en
}
