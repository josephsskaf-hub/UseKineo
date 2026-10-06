# Decisão — compra sem login (06/10/2026)

**Status:** código pronto na branch `codex/compra-sem-login2-0610` (sobre a main e6a89a8e): primeiro os commits com o
interruptor DESLIGADO (o site se comporta exatamente como hoje) e, por último e sozinho, o commit que só vira o
interruptor para LIGADO. Nada foi publicado; publicar é o clique do fundador.

## A decisão

Em 06/10 o fundador aprovou: **"pode fazer compra sem login, sem problema nenhum"**.

Quem ainda não tem conta clica num plano e vai direto para a página de pagamento da Stripe. A conta nasce depois,
no webhook, a partir do e-mail que a pessoa digitou na Stripe. Só a Stripe; PayPal, Mercado Pago e Hotmart não mudaram.
Preço, moeda, plano, créditos e ofertas são exatamente os do caminho com login (mesmas variáveis, mesma conta).

## Por quê — os números de 30 dias (medidos em 06/10)

| Degrau | Pessoas |
|---|---|
| Cliques anônimos em plano | 89 |
| Sessões que caíram no "entre primeiro" (cadastro antes de pagar) | 37 |
| Voltaram logadas | 13 |
| Chegaram à Stripe | 12 |
| Pagaram | 3 |
| Sumiram no "entre primeiro" | 24 |

O "entre primeiro" perdeu 24 de 37 antes de chegarem à Stripe; dos 12 que chegaram, 3 pagaram. A compra sem login
tira esse degrau do caminho. O que acontece dentro da página da Stripe (o preço) não muda com isso.

## O fluxo

1. **Clique no plano, sem conta** — `app/api/stripe/checkout/route.ts` (bloco "quem não tem conta paga primeiro",
   ~linha 1160). A régua `guestCheckoutFallbackReason` (`lib/growth/guestCheckout.ts`) decide: compra simples vira
   convidado; cupom, desconto de 1º mês, trial com cartão, volta da marca d'água, recuperação de checkout e robô
   voltam ao caminho de hoje (cadastro antes), porque dependem de saber quem compra.
2. **Sessão da Stripe sem conta** — `buildGuestSubscriptionAndRedirect` (~linha 2570): mesmo preço/moeda do logado,
   sem `customer`, metadata `kineo_guest=1`, o afiliado (`aff_code`/`aff_click`) e o hash de um segredo guardado num
   cookie httpOnly do navegador que abriu a compra. A Stripe coleta o e-mail e avisa que a conta é esse e-mail.
3. **Nunca pior que hoje** — se a Stripe der erro (qualquer exceção ou 4xx), devolver sessão sem URL, ou qualquer
   coisa quebrar no meio, o visitante cai EXATAMENTE no caminho de hoje: o mesmo redirect ao cadastro e o mesmo
   `checkout_auth_required`, mais um evento `guest_checkout_fallback` com o motivo (`stripe_session_failed`,
   `stripe_session_without_url`, `guest_session_threw`, ou o motivo da régua). Nunca a mensagem crua da Stripe.
4. **Pagamento → webhook** — `app/api/stripe/webhook/route.ts` (~linha 1739): acha a conta pelo e-mail ou cria
   (confirmada, carimbada em `app_metadata` com a sessão Stripe), carimba o dono no Customer e na Assinatura (as
   renovações acham a pessoa) e concede EXATAMENTE o grant do caminho logado. Idempotente pela sessão Stripe; erro
   = 500 para a Stripe reenviar. E-mail que já tinha plano ativo de outra assinatura = conflito: nada concedido,
   evento `guest_checkout_conflict` e aviso ao fundador.
5. **E-mail "sua conta Kineo está pronta"** — `sendGuestAccountReadyEmailOnce` (`lib/stripe/guestCheckout.ts`), chamado
   pelo webhook só quando a conta NASCEU desta compra, depois do grant. Um por sessão Stripe (reserva em
   `stripe_events`), sem preço no texto, com um link de entrada de uso único que vale 72 h (token nosso, assinado;
   `lib/auth/guestAccess.ts`). Cobre quem fechou a aba antes de voltar da Stripe. Conta que já existia continua
   recebendo só o link que a página manda.
6. **Volta da Stripe** — `/checkout/guest` consulta `app/api/stripe/checkout/guest-access/route.ts`:
   - conta nova + o mesmo navegador da compra + dentro de 15 min + primeira vez = login de uso único, direto no
     Studio (o id dessa sessão fica em `app_metadata`);
   - conta que JÁ existia = nunca loga sozinha: o plano entra na conta e um link vai para a caixa do e-mail;
   - outro navegador, fora da janela ou já usado = "pedir link por e-mail" (até 3 por compra).
7. **Links por e-mail** — `app/auth/guest-link/route.ts` troca o link (`?token_hash=` do e-mail pedido na página, ou
   `?ready=` do e-mail "conta pronta") por sessão no servidor, uma vez.

## Riscos e o que segura cada um

| Risco | Mitigação |
|---|---|
| Alguém paga digitando o e-mail de OUTRA pessoa que não tinha conta e entra pelo login automático | A 1ª entrada que prova o e-mail (link por e-mail, Google pela `/auth/callback`, recuperação de senha pela `/api/auth/guest-sessions`) derruba as OUTRAS sessões (`signOut` scope `others`) e troca a senha por uma aleatória (linha abaixo), uma vez por conta, e grava `guest_sessions_revoked`. Prova = método da sessão no claim `amr` do JWT (oauth, otp, recovery…); **senha nunca prova**. A sessão do login automático não dispara a derrubada. Depois da prova, o login automático daquela compra não abre mais. O token de acesso que a sessão derrubada já tinha vale até expirar (até 1 h) em leitura direta ao banco; renovação e `getUser` param na hora. |
| Mesmo cenário, se quem pagou pôs uma SENHA direto na API do Auth antes da dona entrar | **FECHADO (decisão do coordenador em 06/10, leva 3).** Na mesma 1ª prova, uma vez por conta e só em conta nascida de compra sem login, a senha vira uma aleatória forte que ninguém conhece (256 bits, nunca gravada nem registrada) e o evento `guest_sessions_revoked` leva `password_scrambled: true`. Link por e-mail e Google: troca pelo admin; como no Auth a troca de senha pelo admin encerra TODAS as sessões (inclusive a que acabou de provar o e-mail), a sessão da dona é religada na mesma requisição (`session_reentered`). Recuperação de senha: troca pela própria sessão de recuperação (o Auth mantém essa sessão e derruba as outras); pelo admin, a pessoa perderia a sessão no meio da troca, e a página espera essa troca terminar antes de gravar a senha escolhida. Se a troca falhar, a derrubada segue e o motivo vai em `password_scramble_error`. Quem usa as telas do site nunca tem senha antes da 1ª prova, então ninguém de boa-fé perde uma senha que escolheu. |
| E-mail de quem já tinha conta | Nunca loga sozinho; o plano entra na conta; o link vai só para a caixa dela. |
| Dois cliques / reenvio do webhook | Mesma sessão Stripe por navegador (idempotência); conta, eventos e e-mails com reserva por sessão. |
| Resend fora na hora do webhook | O pagamento segue entregue (200); a falha vira `guest_account_ready_email_failed` e a reserva volta — um novo evento da mesma sessão reenvia. Não há fila de reenvio dedicada; a pessoa ainda entra pela página, por Google ou por "Forgot password". |
| Derrubada desloga o próprio comprador | Quando a dona é a própria compradora e entra depois por outro aparelho (Google/link), a aba da compra sai uma vez. Ela entra de novo pelo link ou Google. |
| Afiliado | O cookie viaja na metadata da sessão e a comissão nasce no webhook, para a conta nova. |

O que só um pagamento real prova: o e-mail que a Stripe coleta de verdade, o claim `amr` real do Auth na volta do
Google/recuperação (medido no banco: `oauth`, `otp`, `recovery`, `password`), a troca de senha + religar a sessão no
Auth de produção (comportamento lido no código do supabase/auth: admin → encerra todas as sessões; a própria sessão →
encerra as outras), a entrega do Resend e o pixel de compra.

## O interruptor

`export const GUEST_CHECKOUT_LIVE` em `lib/growth/guestCheckout.ts` — um lugar só (o guardião
`scripts/test-compra-sem-login-2026-10-06.mjs` falha se aparecer outro). Ele controla a rota de checkout, o rótulo dos
botões de plano (/pricing, home, /ads) e as notas de "você cria a conta antes".

## Como desligar

1. Trocar a linha para `export const GUEST_CHECKOUT_LIVE = false`.
2. Publicar pelo caminho de sempre (enfileirar + clique do fundador).

Desligado, o anônimo volta a ver o cadastro antes da Stripe, byte a byte como antes. Quem JÁ pagou como convidado
continua atendido: webhook, página `/checkout/guest`, links por e-mail e a derrubada de sessões não dependem do
interruptor.

## Como medir depois de ligar

- `checkout_guest_started` → `payment_success` com `metadata.guest_checkout = true` (por pessoa, não por evento).
- `guest_checkout_fallback` por motivo — se `stripe_session_failed` aparecer, a Stripe está recusando a sessão.
- `guest_account_created` vs `guest_account_matched` vs `guest_checkout_conflict`.
- `guest_login_link_used` por método (`auto`, `email_link`, `ready_email_link`) e `guest_login_refused` por motivo.
- `guest_sessions_revoked` — conta de convidado em que a dona do e-mail entrou com prova; `password_scrambled` (e
  `password_scramble_error` quando falha) e `session_reentered` (link/Google) dizem se a senha foi trocada e se a
  sessão da dona voltou.
- `guest_account_ready_email_sent` / `guest_account_ready_email_failed`.
