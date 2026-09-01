# Handoff Codex → Claude — rodadas 163–164

**Data:** 2026-09-01  
**Workstream:** Growth / B2C checkout recovery  
**Base auditada:** `a3079d6bfd7c4c0b38b796b38371644b1aed0cd5`

## Rodada 163 — checkout salvo: pessoa, não evento

**EVIDÊNCIA DE PRODUÇÃO (Supabase, SELECT em 2026-09-01; janela de 30 dias):** a versão `resume_smaller_choice_v1` alcançou somente **uma pessoa externa identificada**. Essa pessoa gerou cinco eventos `checkout_resume_banner_viewed`, zero `checkout_resume_banner_clicked`, zero `checkout_resume_smaller_plan_clicked`, um `checkout_resume_banner_dismissed`, zero novo `checkout_started` e zero `payment_success` depois da primeira impressão. O perfil continuava `free`, `is_pro=false`, `has_paid=false` no momento da consulta.

**EVIDÊNCIA DE PRODUÇÃO / sequência da mesma pessoa:** a jornada começou no quickstart do ChatGPT, teve duas recusas de composição, abriu um checkout Starter mensal, cancelou, voltou à aplicação e, cerca de quatro horas depois, retornou por `/gerador-de-shorts-gratis`; o último banner foi dispensado 23,8 segundos depois de ser registrado. Isto prova uma dispensa real em pelo menos uma montagem, mas não transforma cinco eventos repetidos em cinco pessoas e não prova que as cinco impressões foram visíveis.

**GATE:** o gate previamente aprovado exige cinco pessoas externas expostas. A amostra válida é `1/5`. **NO-GO** para mudar copy, CTA, oferta, preço, sessão Stripe ou página de planos.

## Rodada 164 — denominador contaminável

**FATO CONFIRMADO EM CÓDIGO:** `components/CheckoutResumeBanner.tsx:48-100` emite `checkout_resume_banner_viewed` quando o GET retorna `available:true`, antes de o `<aside>` ser commitado ou entrar no viewport. Não há `IntersectionObserver`, dwell nem exigência de aba visível. Em `components/CheckoutResumeBanner.tsx:109`, o componente ainda pode retornar `null` porque `stalled` está ativo depois de já ter gravado a impressão. Recarregar a página também pode repetir o evento porque o latch existe apenas na memória da montagem.

**FATO CONFIRMADO EM CÓDIGO:** os dois caminhos de ação têm caller real. O clique principal só é medido depois de `checkout.launch()` aceitar; o secundário grava `checkout_resume_smaller_plan_clicked` e navega para `/pricing?intent_campaign=checkout_resume_smaller_v1#plans`. A página de preços preserva a campanha. Não há botão morto.

**DECISÃO DE EXPERIMENTO:** **GO somente para instrumentação aditiva**, sem redefinir ou remover o evento legado. O evento novo deve ser `checkout_resume_choice_viewed`, com `visibility_version=checkout_resume_choice_visibility_v1`, emitido uma vez por pessoa/oferta apenas quando o grupo dos dois CTAs estiver pelo menos 50% visível por um segundo contínuo e `document.visibilityState === 'visible'`. O timer deve ser cancelado em aba oculta, interseção abaixo de 50%, `stalled`, mudança de path/oferta e unmount. Navegador sem `IntersectionObserver` deve falhar fechado apenas para a métrica.

**NOVO GATE:** reiniciar a contagem em cinco pessoas externas com `checkout_resume_choice_viewed`. Depois classificar a primeira ação posterior como `primary`, `smaller`, `dismiss` ou `none`. Para `smaller`, exigir a campanha na página de preços e um checkout posterior. Para `primary`, ligar o clique ao checkout anterior salvo e a eventual `payment_success`, porque retomar a mesma Stripe Session pode não criar um novo `checkout_started`.

**BLOQUEIO OPERACIONAL:** duas tentativas de `apply_patch` — agente principal e agente de auditoria — falharam com `windows sandbox failed: helper_unknown_error: apply deny-read ACLs` na worktree isolada. Nenhum arquivo de runtime foi alterado; nenhum teste, commit ou push ocorreu. Não foi usado PowerShell, redirecionamento ou outro atalho de escrita.

**PRÓXIMO PASSO SEGURO:** aplicar a instrumentação quando o ACL da worktree permitir edição normal por `apply_patch`; até lá, preservar a variante e alternar a próxima rodada para B2B. O caso das duas recusas de composição pertence à pista de produto/Claude e não autoriza o Codex a tocar no render.
