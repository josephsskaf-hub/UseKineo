# AUDITORIA DE PREÇOS E LINKS — 08/09/2026, 06:00–08:30 BRT

**Ordem do fundador (dormindo até 10h):** "auditoria nos preços: links certos,
cobranças certas, nenhum link fora do site parecendo valor maior ou menor".

## 1. Cobrança (código do checkout, lido linha a linha)

| o que a pessoa compra | valor cobrado | de onde vem |
|---|---|---|
| Starter / Creator / Studio mensal | $9,00 / $19,00 / $29,00 | `monthlyPriceMinor` ← `TIER_PRICES` |
| anual | $90 / $190 / $290 (10 meses) | `getAnnualPrice` ← `ANNUAL_PRICES` |
| trial de $1 | **$1,00 hoje** (add_invoice_item) + assinatura Creator $19,00 com `trial_period_days: 7` | checkout route 1541-1549 |
| First Pack / bulk / top-ups | inalterados | `PACK_*`, `BULK_PACKS`, `TOPUP_USD_PRICES` |
| PayPal | 9.00 / 19.00 / 29.00 | `lib/paypalCatalog.ts` ← `TIER_PRICES` (guardião 9.00/19.00) |
| Dodo (UPI/Pix) | ⚠ produtos de TESTE criados a $7/$15/$29 em 07/09 | live ainda não existe (KYC); criar a $9/$19/$29 |

Stripe é `price_data` inline: nenhum preço a criar no painel. Guardiões de
dinheiro verdes: `test-checkout-currency-truth` 8194/8194,
`test-subscription-revenue-ledger` 31/31, `test-paypal-canonical-catalog`
(valores), `test-plan-fit` 394/394, `test-trial-1-dolar` 22/22.

## 2. Links de checkout (sondados deslogado em produção)

Todos os 10 (starter/basic/pro × mensal/anual, trial=1, pack=starter, bulk10,
autopilot) → **307 para /signup ou /login com o `redirect` preservado**;
controle inexistente → 404. Nenhum 404/500. As 4 hrefs de checkout achadas
no HTML das 189 páginas (`?pack=bulk10/20/30/50`) existem.

## 3. As 189 páginas do sitemap (varredura automática + leitura manual)

Zero "$7", "$15", "$70", "$150", "$9.90", "40 credits", "90 credits" **nossos**.
Os "$15"/"$7"/"$29" que a varredura marcou em `/vs/*` e `/alternatives/*`
são preços de **concorrentes** (OpusClip $15, Submagic, Synthesia) — corretos.
"25 credits" que sobrou em `/models-pricing`, `/cheapest…`, `/facts`,
`/ai-shorts-series` = **custo do Seedance por filme**, correto.

Corrigido nesta auditoria (além das 42 páginas da madrugada): fallback SSR da
home ($7/$15 digitados), tabela da home ("Free videos, no credit card"), chip
"✓ No credit card" da home, FAQ "New accounts get free credits…" (home +
JSON-LD), `/facts` (3 frases), `/api/facts` (trialAccess: 80cr, cartão
obrigatório, só Kineo 1 + Seedance), `/llms.txt` (2 verdicts + changelog),
páginas de motor (Seedance/Kling/Veo FAQ "unlocked on every account"),
`/chatgpt`, `/cheapest-ai-shorts-maker`, `/examples`, `/kineo-vs-higgsfield`,
`/omni-flash-vs-sora`, `/models-pricing` (coluna calculava com 25),
e-mail de extensão do trial ("no card needed"), assunto do e-mail de fim de
trial ("$15"). Sonda final: home/facts/motor/chatgpt/examples/higgsfield/
models-pricing sem "Start free", "free credits" ou "no card" (fora as 12
ferramentas grátis sem conta, que continuam grátis e é verdade).

## 4. Fora do site

| lugar | estado | ação |
|---|---|---|
| **TAAFT** (theresanaiforthat.com/ai/kineo) | ❌ diz "25 credits, every engine unlocked, no card" e "Studio $37.90 / 150 credits" (era V5) | Cowork edita com o texto de `docs/TAAFT-LISTING-2026-09-03.md` |
| **Google** (snippet da home) | ⚠ ainda mostra "$7.00 / 40 credits / 25 free credits" (cache) | IndexNow reenviado: 190 URLs, HTTP 200 às 05:48 UTC; Google recrawla em dias |
| **GPT do ChatGPT** (docs/GPT-KINEO-VIDEO-MAKER.md) | ✅ atualizado ($9/$19/$29, $1, sem free) | Cowork cola as instruções quando o GPT for publicado |
| **/gpt/openapi.json** | ✅ sem preço literal | — |
| **ColorMango / ToolRiot** | rascunhos em `docs/RASCUNHOS-DIRETORIOS-2026-09-07.md` ainda dizem free $0/25cr e Starter $7 | reescrever antes de enviar (ver §5) |
| **Product Hunt** | ficha ainda não existe; plano já diz $1/9/19/29 | — |
| **Dodo** | produtos de teste a $7/$15/$29 | criar os live a $9/$19/$29 |
| trustradius.com/products/kineo | outro Kineo (LMS) | ignorar |

## 5. Ficou fora (decisão do fundador ou pista alheia)

- `docs/RASCUNHOS-DIRETORIOS-2026-09-07.md`: os dois e-mails de diretório
  ainda têm a tabela antiga (Free $0 25cr, Starter $7). **Não enviar** sem
  trocar por: $1 trial (7 dias, 80cr) · Starter $9/60cr · Creator $19/150cr ·
  Studio $29/180cr · sem free tier.
- `send-winback-25` (rota admin, dry-run) dá 25 créditos de presente a
  contas antigas — campanha de presente, não de preço; segue como está.
- Traduções ES dos rótulos novos (Codex) e e-mails de lifecycle que usam
  literais (rotina, M7).
