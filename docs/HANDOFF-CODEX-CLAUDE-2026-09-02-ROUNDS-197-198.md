# HANDOFF CODEX → CLAUDE — RODADAS 197–198

**Data da verificação:** 2026-09-02 (BRT)

**Pista:** Codex / B2B / afiliados / integridade de medição

**Commit funcional:** `53243a19785ec040203f0134a614cf1206abebed`

**Deploy:** `dpl_7jvpVuFccZh33JxFBrKQhhNesNSw` — `READY`, produção, alias `www.usekineo.com`, build sem erro

## Resultado

**IMPLEMENTADO E VALIDADO EM PRODUÇÃO.** O medidor do funil de afiliados deixou de chamar eventos, linhas de clique e sessões anônimas de pessoas. O relatório `affiliate_funnel_report_v2` agora separa explicitamente:

- pessoas identificadas por `user_id`;
- sessões anônimas por `session_id`, nunca somadas às pessoas;
- eventos sem ator;
- linhas de primeiro toque;
- chaves de rede pseudônimas, que também não são pessoas;
- referrals por pessoa identificada;
- comissões atribuíveis e não atribuíveis a um referral externo verificável.

Não houve mudança de interface, oferta, preço, crédito, checkout, Stripe, render ou banco. Nenhum script com service-role foi executado nesta entrega.

## Evidência que motivou a rodada

**EVIDÊNCIA DE PRODUÇÃO — consultas somente leitura em 2026-09-02, contas internas excluídas.** O sistema customizado tinha 12 linhas de afiliado, sendo 1 interna e 11 externas. Nos 30 dias consultados havia 19 linhas de clique, 10 chaves de rede pseudônimas distintas e 2 linhas sem chave. Isso não permite concluir “19 pessoas”. No mesmo recorte, havia zero pessoa externa indicada, zero pessoa indicada paga e zero comissão externa verificável.

**DECISÃO:** nenhuma nova missão, CTA ou superfície de afiliado foi alterada. O gate de aprendizado ainda não abriu. Primeiro foi corrigida a régua que decidirá a próxima intervenção.

## Contrato de verdade

- `schemaVersion: affiliate_funnel_report_v2` explicita a quebra do JSON antigo.
- As seis consultas são paginadas e ordenadas; não existe teto silencioso de 1.000 linhas.
- A lista de contas internas é lida diretamente de `lib/internalAccounts.ts`; nenhum e-mail ou padrão foi copiado.
- Referrals históricos permanecem disponíveis para atribuir uma comissão ou renovação atual, enquanto o bloco de novas indicações respeita o cutoff.
- Somente `usd` é reconhecido como USD. Moeda ausente ou inesperada entra em `unknown`, sem inferência.
- **DECISÃO APROVADA preservada:** site e Stripe comunicam e cobram somente em USD. Não houve alteração comercial nesta rodada.

## Gates e testes

- `test-affiliate-funnel-report.mjs`: **44/44**
- `test-affiliate-ledger.mjs`: **83/83**
- `test-affiliate-funnel-missions.mjs`: **63/63**
- Sintaxe dos três scripts do relatório: válida
- `git diff --check`: sem erro; apenas aviso local de normalização LF/CRLF antes do commit
- Typecheck: somente os 3 erros preexistentes em `mrr.ts`, `me/subscription/route.ts` e `TrialDowngradeModal.tsx`; zero erro novo
- Auditoria adversarial final: **GO; P0=0, P1=0, P2=0**
- Build Vercel: concluído em 42 s, sem erro

## Gates de aprendizado e próximos ataques

1. Preservar a missão atual de afiliado até haver pelo menos 5 pessoas externas indicadas ou a primeira assinatura externa atribuída.
2. Quando o gate abrir, a hipótese candidata é trocar a missão repetida `script → script` por progressão `script → vídeo`, sem editar antes da amostra.
3. A hipótese de ligar o brief de negócio local aos packs também fica em espera: produção tem zero `local_business_brief_viewed`, zero `generated` e zero `activation_clicked`. Gate proposto: 10 sessões elegíveis e 3 gerações.
4. Próxima rodada alterna para B2C e reconcilia o estágio humano `inline_pricing_value_anchor_viewed`; a variante não deve ser reeditada antes do gate documentado nas rodadas 195–196.

## Coordenação

Arquivos desta entrega: `scripts/measure-affiliate-funnel.mjs`, `scripts/affiliate-funnel-report.mjs` e `scripts/test-affiliate-funnel-report.mjs`.

Não foram tocados arquivos da pista Claude, `GenerateClient.tsx`, preços, créditos, SKUs, checkout, render, cenas, voz ou legendas.
