/**
 * KINEO-PORTA-DE-EMAIL-2026-09-06 — sprint-assinaturas.
 *
 * ═══ O DEFEITO, MEDIDO EM PRODUÇÃO (curl com UA de navegador, controle 404) ═══
 *
 * `app/(dashboard)/studio/create/page.tsx` decide, para visitante DESLOGADO,
 * entre /signup e /login com UM único sinal: existe cookie `sb-…auth-token`
 * NESTE aparelho? O clique vindo da caixa de entrada chega estruturalmente
 * SEM esse cookie — webview do Gmail no telefone, outro aparelho, aba
 * anônima. Resultado:
 *
 *   /studio/create?utm_source=lifecycle&utm_medium=email&utm_campaign=X
 *     → 307 → /signup?redirect=…
 *   /generate?utm_source=lifecycle&utm_medium=email&utm_campaign=trial_d0
 *     → 307 → /studio/create?… → 307 → /signup (200)
 *   (controle) /rota-que-nao-existe → 404
 *   (irmãs)    /library?utm… → 307 → /login ✅ · /history → 307 → /login ✅
 *
 * Ou seja: um CLIENTE JÁ CADASTRADO — o e-mail foi endereçado à conta dele —
 * recebe um formulário de CRIAR CONTA. Todas as outras rotas protegidas da
 * casa mandam para /login; só o /studio/create mandava para /signup.
 *
 * Volume (7 dias): NOVE rotas de e-mail carregam esta porta —
 * send-winback-25, send-activation-nudge, send-failure-recovery (4 lugares),
 * send-video-rescue, send-blackout-winback, send-credits-back, send-reminders,
 * trial-lifecycle-emails (6 lugares), finish-stranded-renders. Só o
 * `d0_welcome` do trial-lifecycle foram 188 e-mails/7d: é a carta de
 * BOAS-VINDAS — a pessoa acabou de criar a conta e era convidada a criar outra.
 *
 * ═══ POR QUE O CONSERTO MORA NO PORTÃO, E NÃO NOS 9 REMETENTES ═══
 *
 * O modo de falha é SILENCIOSO: o link funciona, a pessoa cai numa tela
 * bonita, e nada no log distingue isso de sucesso (o desvio de deslogado só
 * emitia evento fora do ramo `standard` — o caso comum não emitia NADA, e por
 * isso ninguém achou). Consertar os 9 remetentes deixaria a 10ª campanha —
 * a que ainda não existe — livre para nascer errada. Aqui há uma regra só,
 * lida pelo portão, e `scripts/test-porta-email-2026-09-06.mjs` prova que o
 * portão a CHAMA (contrato sem chamador serve zero).
 *
 * ═══ A REGRA ═══
 *
 * "Veio de e-mail nosso" exige TRÊS sinais juntos: `utm_medium=email` E
 * `utm_source` no conjunto NOSSO E `utm_campaign` não vazio. A exigência
 * tripla é o que impede um visitante novo de cair no /login por acaso (um
 * `utm_source=lifecycle` solto num tweet, por exemplo). A decisão da porta
 * então é: cookie de sessão OU e-mail nosso → /login; nenhum dos dois →
 * /signup, idêntico a ontem. Falha ABERTA para o comportamento de hoje.
 *
 * ═══ CONDIÇÃO DE MORTE ═══
 *
 * Este arquivo morre no dia em que a escolha entre /login e /signup deixar
 * de existir (uma tela única de "entrar ou cadastrar" com o e-mail
 * pré-preenchido), OU quando toda carta passar por uma porta de servidor
 * como `app/api/episode-link` (que já faz esta escolha para o botão de
 * episódio 2 desde 05/09). Enquanto uma carta puder apontar direto para
 * /studio/create, a regra tem que viver aqui.
 *
 * PURO por contrato: só tipos e lógica. Nada de `next/headers`, `fs`,
 * `crypto` ou builtin de Node — pode ser importado por componente de cliente.
 */

/**
 * As `utm_source` que são NOSSAS em e-mail. Levantado nos arquivos reais em
 * 06/09: TODA carta que carrega `utm_medium=email` usa `lifecycle`
 * (composerUrl default, send-credits-back, send-reminders, send-activation-
 * nudge, trial-lifecycle-emails, send-momentum-nudge, send-post-nudge,
 * send-recovery, subscriberIdle, videoReadyFooter, send-season-letter,
 * send-next-episode-wall). Fora do conjunto, de propósito:
 *   · `lead_magnet` — também é e-mail, mas o leitor NÃO tem conta e o link
 *     já aponta para /signup; mandá-lo para /login seria o defeito invertido.
 *   · `checkout_success` — viaja com `utm_medium=first_win`, não é e-mail.
 *   · `stranded_rescue` / `attempt_lost` / `launch_email` — são e-mail, mas
 *     viajam SEM `utm_medium` e SEM `utm_campaign`; não passam na exigência
 *     tripla. Estão anotados para a auditoria dos remetentes, não aqui.
 */
export const OUR_EMAIL_UTM_SOURCES: ReadonlySet<string> = new Set(['lifecycle'])

/** Mesmo formato do `searchParams` de página do Next (app router). */
export type QueryLike = Record<string, string | string[] | undefined>

function primeiro(params: QueryLike | null | undefined, chave: string): string {
  const v = params?.[chave]
  const s = typeof v === 'string' ? v : Array.isArray(v) && typeof v[0] === 'string' ? v[0] : ''
  return s.trim()
}

/**
 * Verdadeiro SÓ quando os três sinais estão juntos: `utm_medium === 'email'`,
 * `utm_source` no conjunto nosso e `utm_campaign` não vazio.
 */
export function arrivouDeEmailNosso(params: QueryLike | null | undefined): boolean {
  const medium = primeiro(params, 'utm_medium')
  const source = primeiro(params, 'utm_source')
  const campaign = primeiro(params, 'utm_campaign')
  const isEmail = medium === 'email'
  const isOurs = OUR_EMAIL_UTM_SOURCES.has(source)
  const hasCampaign = campaign.length > 0
  return isEmail && isOurs && hasCampaign
}

export interface EscolhaDePorta {
  /** Existe cookie `sb-…auth-token` neste aparelho (o sinal antigo). */
  readonly temCookieDeSessao: boolean
  /** `arrivouDeEmailNosso(searchParams)` (o sinal novo). */
  readonly veioDeEmailNosso: boolean
}

export type PortaDeAuth = '/login' | '/signup'

/**
 * /login se QUALQUER um dos dois sinais for verdadeiro; /signup caso
 * contrário. Sem sinal nenhum, o comportamento é idêntico ao de ontem.
 */
export function escolherPortaDeAuth({ temCookieDeSessao, veioDeEmailNosso }: EscolhaDePorta): PortaDeAuth {
  const jaTemConta = temCookieDeSessao || veioDeEmailNosso
  return jaTemConta ? '/login' : '/signup'
}
