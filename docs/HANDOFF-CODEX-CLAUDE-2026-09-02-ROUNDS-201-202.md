# HANDOFF CODEX → CLAUDE — Rounds 201–202

**Data:** 2026-09-02  
**Workstream:** Growth B2B · aquisição → ativação → checkout → assinatura  
**Commit funcional:** `68a36cb1ceaa0b1c5617effe595657bbe104b7aa`  
**Deploy funcional:** `dpl_BbqwcZoD4MkjDHc6FRVX775mBYRZ` · **READY** · produção

## Resultado executivo

**EVIDÊNCIA DE PRODUÇÃO (2026-09-02):** uma consulta agregada, somente leitura, buscou os eventos versionados `local_business_brief_*` desde a fronteira canônica de instrumentação. O resultado foi zero linha elegível. Contas internas foram excluídas.

**DECISÃO:** o gate de produto permanece fechado. Nenhuma tela, CTA, oferta ou landing page foi alterada porque não há amostra que autorize uma mudança causal.

**IMPLEMENTADO:** a medição do funil do brief B2B agora é reproduzível e auditável:

- separa linha, sessão anônima e pessoa identificada;
- exclui contas internas e mantém identidade desconhecida fora da coorte;
- exige `version`, `campaign` e `surface` canônicos;
- exige a ordem `viewed → generated → activation_clicked` na mesma sessão;
- separa brief manual de exemplo carregado;
- o gate exige 10 sessões vistas e 3 sessões com brief **manual**;
- três cliques no exemplo não abrem o gate;
- checkout e pagamento só viram receita atribuída quando usam o mesmo `stripe_session_id` e o pagamento ocorre depois do checkout;
- somente `payment_success` é evidência de receita.

## Arquivos

- `scripts/local-business-brief-funnel-report.mjs`
- `scripts/measure-local-business-brief-funnel.mjs`
- `scripts/test-local-business-brief-funnel-report.mjs`
- `scripts/measurement-helpers.mjs`

## Gates

**TESTADO LOCALMENTE:**

- local business brief funnel report: **46/46**
- local business brief observability: **29/29**
- local business ad brief: **46/46**
- local business tool discovery: **30/30**
- affiliate funnel report: **45/45**
- result video decision report: **51/51**
- sintaxe dos três arquivos novos: verde
- whitespace: verde
- auditoria adversarial independente: **GO · P0=0 · P1=0 · P2=0**

**CONTRADIÇÃO PRÉ-EXISTENTE:** `npx tsc --noEmit` continua com exatamente três erros anteriores a esta entrega: dois de versão da API Stripe e um `Promise<Promise<T>>` em `TrialDowngradeModal.tsx`. Nenhum erro novo foi introduzido.

## Regra comercial preservada

**DECISÃO APROVADA:** a UseKineo vende em uma moeda comercial única, **USD**, em toda a jornada. Site, oferta e Stripe devem coincidir exatamente. A fonte canônica continua sendo `lib/checkoutPricing.ts`; esta rodada não alterou preço, moeda, crédito, SKU, Stripe Tax ou checkout.

## Próximo gate

**QUESTÃO PENDENTE:** zero evento elegível não prova que a página está quebrada; prova apenas que ainda não observamos uso qualificado suficiente.

Não reeditar essa superfície antes de:

1. 10 sessões elegíveis com `local_business_brief_viewed`;
2. 3 sessões com `local_business_brief_generated` e `draft_source=manual`.

Quando os dois limites abrirem, decidir com os dados se um caminho secundário para packs B2B melhora a ativação sem canibalizar o CTA principal.

## Limites respeitados

Nenhuma mudança em render, cenas, voz, legendas, qualidade, créditos, preços, checkout ou produto pós-login. Nenhuma comunicação externa e nenhuma escrita no banco.
