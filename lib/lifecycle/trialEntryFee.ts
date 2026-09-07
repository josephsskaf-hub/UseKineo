/**
 * ═══════════════════════════════════════════════════════════════════════════
 * O PREÇO DA PORTA DE ENTRADA, DERIVADO DO COBRADOR — 2026-09-07 (va-r4)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * O QUE ISTO CONSERTA: na rotação va-r3 (mesmo dia, algumas horas antes) eu
 * TIREI o número do e-mail. Escrevi que dizer "$1" seria mentir para 12% da
 * base porque a taxa de entrada é "100 unidades menores da moeda DA PESSOA".
 * **Estava errado, e a premissa já estava morta havia 18 dias.**
 *
 * A PROVA, em duas fontes independentes:
 *
 *  1. NO CÓDIGO DO COBRADOR (não deduzido — lido). `lib/checkoutPricing.ts`
 *     declara `export type CheckoutCurrency = 'usd'` — união de UM valor,
 *     desde a V6 de 19/08 ("preço global único", decisão do fundador). E
 *     `resolveCheckoutCurrency(country)` **ignora o país** e devolve `'usd'`
 *     incondicionalmente. O item avulso do trial em
 *     `app/api/stripe/checkout/route.ts` é `unit_amount: 100` com essa mesma
 *     `currency`. Ou seja: **toda pessoa do planeta é cobrada US$ 1,00.**
 *
 *  2. NO BANCO. Eventos com `metadata.currency` nos últimos 30 dias:
 *     usd 1121 · inr 143 · brl 70. Mas o ÚLTIMO evento não-usd da história é
 *     de **20/08 10:38 UTC**. No corte de 20/08 12:00 até agora: **751
 *     eventos, 751 em usd, zero exceções.** O brl inteiro era 1 pessoa.
 *
 * O CUSTO DO MEU ERRO: o e-mail de maior vazão da casa saiu dizendo
 * *"a token entry fee — the checkout shows it in your own currency"*. O
 * número É o gatilho de quem achou caro; eu troquei o gatilho por um
 * eufemismo para proteger uma coorte que não existe mais. (Memórias
 * `conferir-a-constante-antes-de-herdar-a-tabela` e `cegueira-documentada-expira`:
 * limiar/tabela herdado de outra rotação é AFIRMAÇÃO sobre o código, e
 * cegueira documentada tem prazo de validade. Reconferir no banco E no código
 * antes de descartar a fonte.)
 *
 * ⚠️ A REGRA QUE CONTINUA VALENDO, E POR QUÊ. Dinheiro **nunca é digitado à
 * mão** neste caminho. O rótulo sai de `formatCheckoutMoney` sobre
 * `CARD_TRIAL_ENTRY_FEE_MINOR` — a MESMA função e a MESMA constante que a
 * tela do pós-vídeo usa (`cleanFilmTrialDoor`, pista irmã) e que o cobrador
 * cobra. Se o fundador mudar a taxa para 150, o e-mail passa a dizer "$1.50"
 * sozinho. É por isso que a trava dos guardiões antigos (`sem preco literal`)
 * continua **verde e intocada**: ela proíbe o número DIGITADO no arquivo, não
 * o número derivado — e eu não afrouxei uma vírgula dela.
 *
 * ⚠️ O DIA EM QUE A PREMISSA VOLTAR A MUDAR. Se alguém devolver multi-moeda,
 * `CheckoutCurrency` ganha um segundo valor e esta resolução sem país vira
 * mentira de novo. Por isso o guardião
 * `scripts/test-preco-do-trial-derivado.mjs` falha VERMELHO no instante em que
 * a união deixar de ter um valor só. O erro do va-r3 foi confiar numa
 * afirmação sem tripwire; esta é a tripwire.
 */
import {
  CARD_TRIAL_ENTRY_FEE_MINOR,
  formatCheckoutMoney,
  getTierPrice,
  resolveCheckoutCurrency,
  resolvePriceRegion,
  type CheckoutCurrency,
} from '@/lib/checkoutPricing'

/**
 * A moeda da cobrança, resolvida pelo MESMO caminho do cobrador.
 *
 * O `null` no lugar do país não é preguiça: `resolveCheckoutCurrency` descarta
 * o argumento por construção (V6), e o cron não tem requisição — não existe
 * header de IP para ler. Passar `null` explicita que o país é irrelevante
 * HOJE, e mantém a chamada na função única para o dia em que deixar de ser.
 */
export const TRIAL_ENTRY_FEE_CURRENCY: CheckoutCurrency = resolveCheckoutCurrency(null)

/**
 * O que a pessoa vai ser cobrada, escrito do jeito que ela lê.
 *
 * `compact` corta o centavo redondo — "$1" em vez de "$1.00" — porque em
 * assunto de e-mail o zero à direita rouba caractere e não acrescenta verdade.
 * Se a taxa deixar de ser redonda, o centavo volta sozinho: o corte é
 * condicionado ao sufixo, nunca a um `slice` cego (a lição do menino da bolha,
 * 27/08 — cortar string por posição é como a proibição viajou decapitada).
 */
function compactMoney(full: string, compact: boolean): string {
  if (!compact) return full
  return full.endsWith('.00') ? full.slice(0, -3) : full
}

export function trialEntryFeeLabel(options?: { compact?: boolean }): string {
  return compactMoney(
    formatCheckoutMoney(TRIAL_ENTRY_FEE_CURRENCY, CARD_TRIAL_ENTRY_FEE_MINOR),
    options?.compact === true,
  )
}

/**
 * O QUE VEM DEPOIS DO TRIAL, também derivado.
 *
 * ⚠️ Eu tentei escrever "then $15/mo" à mão nesta mesma rotação, dez minutos
 * depois de escrever o bloco lá em cima dizendo que dinheiro não se digita. O
 * `$15` teria passado por TODOS os guardiões — porque eles recortam o BLOCO do
 * D5/D10 e esta constante mora fora do recorte (memória
 * `guardiao-que-conta-texto-nao-prova-condicao`: contar texto não prova
 * condição). A mensalidade sai de `getTierPrice`, tabela única, tier `basic` —
 * o mesmo `TRIAL_TIER` que o cobrador assina quando o trial termina.
 */
export function trialMonthlyAfterLabel(options?: { compact?: boolean }): string {
  const region = resolvePriceRegion(null)
  return compactMoney(
    formatCheckoutMoney(
      TRIAL_ENTRY_FEE_CURRENCY,
      getTierPrice('basic', TRIAL_ENTRY_FEE_CURRENCY, region),
    ),
    options?.compact === true,
  )
}

/**
 * A frase da porta, para a casa falar uma língua só nos dois e-mails.
 * O botão do /pricing e a caixa do pós-vídeo prometem a mesma coisa com os
 * mesmos números — todos saem daqui.
 */
export function trialEntryFeeSentence(days: number): string {
  return `${days} days of Creator for ${trialEntryFeeLabel({ compact: true })}`
}

/** A promessa inteira, sem letra miúda: o que entra hoje e o que vem depois. */
export function trialEntryFullPromise(days: number): string {
  return `${trialEntryFeeSentence(days)}, then ${trialMonthlyAfterLabel({ compact: true })}/mo`
}
