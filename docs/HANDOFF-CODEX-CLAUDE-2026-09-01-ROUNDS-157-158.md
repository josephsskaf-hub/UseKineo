# HANDOFF CODEX -> CLAUDE — rodadas 157–158

**Data:** 2026-09-01 BRT  
**Base verificada:** `da486da1b4828b2e0e4d92426f85a99c724b845b`  
**Escopo Codex:** aquisição, fluxo, afiliados/referral e B2B. Nenhuma alteração em render, créditos, preço ou checkout.

## 1. Decisão comercial preservada

**DECISÃO APROVADA:** uma única moeda comercial pública, USD, para o mundo inteiro. Não voltar a prometer moeda local. A coerência entre página, oferta e Stripe é parte da confiança no último metro.

## 2. Referral: recompensa encalhada após o primeiro vídeo

**FATO CONFIRMADO:** `ReferralAutoTrigger` chama `/api/referral/qualify` somente quando o `pathname` muda (`components/ReferralAutoTrigger.tsx:20-62`). A conclusão do primeiro vídeo apenas muda o estado local para `done`; não navega e não chama a qualificação (`app/(dashboard)/generate/GenerateClient.tsx:5413-5445`). A rota de qualificação é idempotente e exige e-mail confirmado, `referred_by` e ao menos um vídeo (`app/api/referral/qualify/route.ts:35-147`).

**EVIDÊNCIA DE PRODUÇÃO — Supabase, 2026-09-01, contas internas excluídas:**

- 6 pessoas externas têm `referred_by`;
- 5 estão elegíveis: e-mail confirmado e ao menos um vídeo concluído;
- 3 das 5 receberam a recompensa;
- 2 das 5 continuam com `referral_reward_granted=false` mais de 10 minutos depois do primeiro vídeo;
- nenhuma das 6 é assinante paga no snapshot;
- no funil de compartilhamento `push29_share_delivery` dos últimos 30 dias, 290 pessoas externas viram o prompt, 30 clicaram, 15 concluíram um compartilhamento registrado e 19 abriram um canal; os eventos foram reconciliados por pessoa, não tratados como clientes.

**CLASSIFICAÇÃO:** P0 de continuidade do referral, comprovado em produção. A promessa “quando o convidado cria o primeiro vídeo” não fecha na própria conclusão.

**OWNERSHIP:** Claude. O caller correto cruza `GenerateClient`/conclusão pós-login, zona compartilhada em que o Codex não deve editar o fluxo de produto.

**CORREÇÃO MÍNIMA SUGERIDA:** após a conclusão persistida do primeiro vídeo, chamar a mesma rota idempotente `/api/referral/qualify` e registrar resultado allow-listed por trigger (`first_video_completion` ou `navigation`). Não mudar bônus, promessa, saldo, card, link nem pipeline de render.

**GATES:**

1. zero crédito duplicado em corrida/retry;
2. 100% dos novos convidados elegíveis com recompensa em até 2 minutos do primeiro vídeo;
3. nenhum grant para e-mail não confirmado ou sem vídeo;
4. evento sem PII com resultado fechado (`granted`, `already_granted`, `no_video`, `email_unconfirmed`, `not_referred`, `failed`) e trigger;
5. reconciliar `share -> referred signup -> eligible -> rewarded -> checkout_started -> payment_success` por pessoa.

## 3. B2B/AEO: promessa factual incompatível no hub

**FATO CONFIRMADO:** o card `Local Business Video Ads` em `app/free-ai-shorts/page.tsx:117` promete “The 30-second ad that fills your calendar next week”. O destino exige fatos fornecidos pelo negócio e não tem mecanismo de booking, leads, calendário, prazo ou garantia (`app/free-ai-shorts/[niche]/page.tsx:473-485`; `lib/growth/localBusinessAdBrief.ts:63-107`).

**CONTRADIÇÃO:** a descoberta promete resultado e prazo; o artefato corretamente produz apenas um roteiro factual.

**GO CODEX:** corrigir somente o exemplo para uma ideia factual compatível, sem CTA, evento, oferta ou landing nova. Como é mudança visual, exige preview antes/depois desktop e mobile. O gate atual do builder permanece até 10 sessões externas.

## 4. O que não foi feito

- nenhuma edição de runtime;
- nenhuma mudança em moeda, preço, crédito, checkout, oferta ou termos;
- nenhum render, e-mail, outreach, recrawl ou anúncio;
- nenhum dado pessoal foi registrado neste documento.
