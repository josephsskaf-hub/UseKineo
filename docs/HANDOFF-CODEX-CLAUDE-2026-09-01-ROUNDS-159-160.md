# HANDOFF CODEX -> CLAUDE — rodadas 159–160

**Data:** 2026-09-01 BRT  
**Base verificada por `ls-remote`:** `d89eb124d669f3a2ee8b483040a402681f4d7538`  
**Escopo:** B2B/AEO factual e medição B2C pós-vídeo. Contas internas excluídas de toda evidência de produção.

## 1. Classificação da rodada anterior

**PROGRESSO:** o handoff das rodadas 157–158 foi publicado em `d89eb124`, o deploy ficou READY e a evidência de referral alterou a próxima ação. Esta rodada não reiniciou diagnóstico já concluído.

## 2. B2B/AEO — correção factual continua GO, mas não foi editada

**FATO CONFIRMADO:** `app/free-ai-shorts/page.tsx:117` ainda contém “The 30-second ad that fills your calendar next week”, embora o builder de destino use apenas fatos fornecidos e não tenha booking, lead, calendário, prazo ou garantia.

**GO PRESERVADO:** trocar somente o exemplo por “The one question customers ask before booking — answered in 30 seconds”, sem tocar em CTA, href, evento, oferta, preço ou página de destino.

**BLOQUEIO OPERACIONAL DESTA RODADA:** o `apply_patch` obrigatório não conseguiu ler arquivos existentes em duas worktrees isoladas por `windows sandbox failed: helper_unknown_error: apply deny-read ACLs`. O navegador local falhou pela mesma ACL. Ninguém contornou a regra com PowerShell ou outro escritor. As duas worktrees ficaram limpas, sem diff, commit ou push. Portanto a correção continua **NÃO IMPLEMENTADA** e nenhuma comparação visual foi reivindicada.

## 3. B2C pós-vídeo — o denominador do bridge não prova CTA visto

**EVIDÊNCIA DE PRODUÇÃO — Supabase, janela móvel de 48 horas consultada em 2026-09-01:**

- 8 pessoas externas produziram 11 eventos `trial_balance_bridge_viewed`;
- 7 pessoas / 8 eventos vieram de `source=result_trial_balance_bridge`;
- 3 pessoas / 3 eventos vieram de `source=trial_active_banner_return`; há sobreposição entre fontes;
- versão única: `trial_balance_seedance_35s_v2`;
- zero `trial_balance_bridge_clicked`;
- 2 pessoas viram `trial_repeat_episode_viewed` e zero clicou;
- a oferta padrão `trial_post_video_offer_viewed` teve zero pessoa porque bridge/repeat têm precedência por desenho;
- na mesma janela, `checkout_started` teve 2 pessoas e `payment_success` 1 pessoa, mas não vieram depois de uma exposição à oferta padrão e não podem ser atribuídos ao bridge.

**FATO CONFIRMADO:** os observers medem 50% do card inteiro (`GenerateClient.tsx:4801-4819`; `TrialActiveBanner.tsx:296-340`). Os botões ficam no rodapé dos cards (`GenerateClient.tsx:13729-13855`; `TrialActiveBanner.tsx:412-427,506-534`). Em mobile, o evento pode ocorrer enquanto o CTA ainda está fora da viewport.

**FATO CONFIRMADO:** os handlers não parecem mortos. Registram o clique antes de reset/navegação (`GenerateClient.tsx:10232-10253`; `TrialActiveBanner.tsx:412-427,506-534`), e `trackEvent` usa `keepalive:true` (`lib/analytics.ts:448-473`).

**CLASSIFICAÇÃO:** amostra pequena + denominador frouxo. Zero clique não prova rejeição da copy, CTA quebrado ou oferta errada.

## 4. Próxima intervenção coordenada

**GO SOMENTE PARA INSTRUMENTAÇÃO:** criar eventos fechados de visibilidade real do botão, sem alterar layout, copy, motor, trial, crédito, preço ou comportamento:

- `trial_balance_bridge_cta_viewed`;
- `trial_repeat_episode_cta_viewed`.

Condição sugerida: documento visível e pelo menos 50% do botão continuamente visível por 1 segundo; dedupe por sessão + source + version + asset quando houver; metadata allow-listed, sem texto livre ou PII.

**OWNERSHIP:** `TrialActiveBanner.tsx` e `lib/growth/**` são pista Codex. `GenerateClient.tsx` é zona compartilhada; a instrumentação nesse caller exige coordenação com Claude antes de editar.

**SUGESTÃO DE GATE, ainda não decisão aprovada:** preservar a variante até 10 pessoas externas com CTA realmente visto por source. Só revisar copy/hierarquia depois de ao menos 3 CTA-viewers distintos e zero clique. Parar se houver duplicação do evento ou emissão sem CTA visível.

**ANTI-DUPLICAÇÃO:** não criar terceiro rail, não mudar grant/prazo/preço/motor, não recolocar Plan Fit ou oferta padrão à frente, não tratar `card_view` como `cta_view`.

## 5. Estado final

- nenhuma edição de runtime;
- nenhum preço, crédito, checkout, render, outreach, anúncio ou banco alterado;
- decisão comercial USD-only preservada;
- correção B2B continua pendente por ACL;
- bridge/repeat preservados até medição honesta do CTA.
