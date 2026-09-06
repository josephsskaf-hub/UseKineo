/**
 * KINEO-CTA-CAI-NA-VITRINE-2026-09-06 — sprint-assinaturas, ciclo noturno.
 *
 * ═══ O DEFEITO, MEDIDO NA ESTRADA E NÃO NO CÓDIGO ═══
 *
 * `/generate` deixou de ser uma página em 24/08 (KINEO-STUDIO-UNIFICACAO). O
 * porteiro que ficou no lugar tem DUAS regras, e a diferença entre elas é o
 * assunto inteiro deste arquivo:
 *
 *   · visita COM query  → `/studio/create?<query>`  ← renderiza o GenerateClient
 *   · visita VAZIA      → `/studio`                 ← renderiza o StudioClient
 *
 * Verificado em produção hoje, 06/09 ~02:5x BRT, com curl:
 *   https://usekineo.com/generate      → 308 → https://www.usekineo.com/generate
 *   https://www.usekineo.com/generate  → 307 → https://www.usekineo.com/studio
 *
 * `/studio` é a tela de VITRINE (tiles de motor). Ela não tem composer, e —
 * o que decidiu este commit — **não monta o `NextActionCard`**. As três
 * montagens do cartão vivem todas dentro do `GenerateClient`
 * (`generate_step_1`, `generate_done_screen`, `generate_upgrade_modal`), que
 * só existe em `/studio/create`.
 *
 * Consequência: o e-mail cuja frase é *"try the same idea again"* / *"just
 * make another one right now"* deposita a pessoa numa tela onde ela não pode
 * fazer nem uma coisa nem outra — e onde o contrato `/api/next-action`, que
 * existe justamente para dizer a ela o que dá para fazer com o saldo que
 * sobrou, nunca é chamado. O e-mail acerta a pessoa e erra a porta.
 *
 * ⚠️ NÃO É COSMÉTICO E NÃO É REDIRECT A MAIS: as campanhas que já carregavam
 * query (`send-stalled-rescue`, `send-activation-nudge`, `send-credits-back`,
 * `send-avatar-launch`) SEMPRE caíram no composer — elas nunca tiveram este
 * problema. Só as três abaixo caíam na vitrine, e caíam por acidente de
 * URL, não por decisão: duas apontam para `/studio` literal e uma para um
 * `/generate` sem query nenhuma.
 *
 * ═══ POR QUE UMA FUNÇÃO E NÃO TRÊS STRINGS CORRIGIDAS ═══
 *
 * O defeito nasceu de cada campanha digitar o próprio destino. Corrigir as
 * três strings deixaria a quarta campanha — a que ainda não existe — livre
 * para nascer errada, e o modo de falha é SILENCIOSO: o link funciona, a
 * pessoa chega numa tela bonita, e nada no log distingue isso de sucesso.
 * Foi assim que o defeito sobreviveu desde 24/08.
 *
 * Aqui há um destino só, e `scripts/test-cta-composer-2026-09-06.mjs` lê os
 * arquivos reais das campanhas de RESGATE para provar que nenhuma delas
 * aponta para a vitrine.
 *
 * ═══ O QUE ESTE ARQUIVO NÃO FAZ ═══
 *
 * Não mexe em preço, oferta, plano ou copy. Não toca em tela. Não redireciona
 * ninguém que não seja destinatário de e-mail. E deliberadamente NÃO muda os
 * CTAs cujo destino certo é outro: `/pricing` (porta do plano), `/history`
 * (biblioteca), `/account`, `/wall`, `/avatar`. `send-video-ready` continua
 * apontando para `/studio` e `/history` de propósito — a pessoa acabou de
 * receber um filme, o assunto dela é o filme, não o composer.
 */

/** Rota única que renderiza o composer (GenerateClient) hoje. */
export const COMPOSER_PATH = '/studio/create'

/**
 * A tela de vitrine. Não é destino de e-mail de resgate: o cartão de próxima
 * ação não é montado nela, e nem o composer.
 */
export const SHOWCASE_PATH = '/studio'

export interface ComposerUrlOptions {
  /** Base absoluta, já resolvida pelo chamador (`APP` / `APP_URL`). */
  readonly base: string
  /** `utm_campaign`. Obrigatório: link de campanha sem campanha é link cego. */
  readonly campaign: string
  /** `utm_source`. Default `lifecycle`, que é o que as campanhas já usam. */
  readonly source?: string
  /** `utm_medium`. Default `email`. */
  readonly medium?: string
}

/**
 * Monta o link de "venha fazer o filme" de um e-mail.
 *
 * A query nunca sai vazia — além de identificar a campanha, ela é o que
 * impede o porteiro de `/generate` de degradar o destino para a vitrine, caso
 * alguém volte a apontar um CTA para lá no futuro.
 */
export function composerUrl({ base, campaign, source = 'lifecycle', medium = 'email' }: ComposerUrlOptions): string {
  const params = new URLSearchParams({
    utm_source: source,
    utm_medium: medium,
    utm_campaign: campaign,
  })
  return `${base.replace(/\/+$/, '')}${COMPOSER_PATH}?${params.toString()}`
}
