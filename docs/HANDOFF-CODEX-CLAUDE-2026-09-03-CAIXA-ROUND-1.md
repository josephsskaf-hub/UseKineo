# HANDOFF CODEX → CLAUDE — CAIXA ROUND 1 — 03/09/2026

**Janela:** 03/09/2026 21:00–21:16 BRT  
**Base:** `feb427d2f85e46e1167c9fe2c2ace7bc057942d9`  
**Commit funcional:** `0fea12efd17eca1c53aba62c9772dd970a9b52bf`  
**Pista:** CAIXA · pedido aberto Claude → Codex das 14:15 BRT

## Dado que doía

- **EVIDÊNCIA DE PRODUÇÃO (Supabase, 03/09/2026 21:02 BRT):** desde o marco `2026-09-03 16:00 UTC`, 13 pessoas externas se cadastraram, 8 fizeram filme, 1 pessoa com filme abriu checkout, 1 pessoa sem filme abriu checkout, 0 assinaturas e 0 pessoas com falha sem filme.
- **EVIDÊNCIA DE PRODUÇÃO (Supabase, 03/09/2026 21:03 BRT):** nenhuma pessoa externa abriu checkout e ficou sem pagar nas 2 horas anteriores à consulta. O vigia não encontrou caso novo que superasse o pedido aberto.
- **EVIDÊNCIA DE PRODUÇÃO (diário Claude #1, publicado em `origin/main`):** 34 renders de aproximadamente 30 pessoas foram recusados em 30 dias pelo gate de narração; 24 tinham cobertura de pelo menos 60%.
- **FATO CONFIRMADO:** `GenerateClient.tsx` ainda interrompia o primeiro clique de roteiro verbatim curto e só deixava o servidor decidir no segundo clique, apesar do degrau já estar implementado no servidor.

## O que mudou

- **IMPLEMENTADO:** removido o preflight local `scriptTooShortPreflight` e a chave `preflightFiredRef`. O primeiro clique segue para análise e para a decisão canônica do servidor.
- **FATO CONFIRMADO:** o autofit de roteiro longo continua intacto; somente a recusa local do roteiro curto foi removida.
- **FATO CONFIRMADO:** falhas reais devolvidas pelo servidor continuam usando o painel de roteiro curto existente.
- **NÃO ALTERADO:** preço, crédito, checkout, Stripe, render, banco e oferta.
- Arquivos:
  - `app/(dashboard)/generate/GenerateClient.tsx`
  - `scripts/test-script-preflight.mjs`
  - `docs/previews/CAIXA-FIRST-CLICK-AUTOFIT-2026-09-03.html`

## Gates

- `node scripts/test-script-preflight.mjs`: **25/25**
- `node scripts/test-narracao-degrau.mjs`: **746/746**
- `node scripts/test-guardiao-yaml-2026-09-03.mjs`: **12/12**
- `npx tsc --noEmit`: **exit 0**
- `git -c core.whitespace=cr-at-eol diff --check`: **limpo**
- **QUESTÃO PENDENTE:** a abertura automatizada do preview no Chrome falhou duas vezes com `windows sandbox failed: helper_unknown_error: apply deny-read ACLs`. O HTML estático antes/depois existe e é clicável; não houve inspeção automatizada por screenshot nesta rodada.

## Validação pós-push

- **VALIDADO EM PRODUÇÃO (03/09/2026 21:21 BRT):** `origin/main` recebeu `3474989c2945d1d6a270ae3c7a844bced5b9ea3d` por fast-forward.
- **VALIDADO EM PRODUÇÃO:** Vercel `dpl_CWJuqzDtBjpgvyxKkuP4UuBQEozT` = `READY`, target `production`, SHA `3474989c`, alias `www.usekineo.com`.
- **VALIDADO EM PRODUÇÃO:** smoke de `https://www.usekineo.com/generate` terminou em `https://www.usekineo.com/studio`, HTTP 200, corpo com 89.252 bytes.
- **VALIDADO EM PRODUÇÃO:** Guardião GitHub — suíte de testes = `success`; TypeScript = `success`; Vercel Preview Comments = `success`.
- **EVIDÊNCIA DE PRODUÇÃO:** a consulta de erros runtime em 15 minutos encontrou apenas um `DEP0169 url.parse()` em `/api/generate-broll-plan`, às 21:12 BRT, no deploy anterior `dpl_CXxjYmRsekFBiyGxic4nb5FFPTYg`. Nenhum erro foi atribuído ao deploy desta rodada.

## Como medir

- Métrica primária: `script_preflight_blocked` originado em `/generate` deve parar de nascer após o deploy.
- Métrica de resultado: pessoa que chega com roteiro curto deve alcançar `script_duration_autofit_down` no primeiro clique.
- Gate de parada: qualquer aumento de falha sem filme ou ausência do evento de degrau após amostra válida exige reversão de `0fea12ef`.
- Risco: baixo e reversível; a mudança elimina uma recusa duplicada no cliente e preserva a regra do servidor.

## Contradição documental

- **CONTRADIÇÃO:** o incremento do fundador cita a seção 8 do programa, mas `origin/main:docs/PROGRAMA-CODEX-ASSINATURAS-2026-09-03.md` termina na seção 6 em `feb427d2`. Nesta janela, o texto direto do fundador de 03/09 21:00 BRT foi tratado como a seção 8 operacional.

## Próxima jogada

Atender o pedido aberto das 16:30 BRT: comunicar, nas superfícies próprias do Codex, que um roteiro completo do ChatGPT pode ser colado com direções visuais sem que elas sejam narradas, sem criar promessa além do comportamento já entregue pelo parser.

## ✅ O QUE VOCÊ PRECISA FAZER

Nada.

## 📋 O QUE ACONTECEU

A parede do primeiro clique foi retirada. O cliente não precisa mais clicar duas vezes para o servidor aplicar a duração que cabe no roteiro; a regra financeira e o render não foram tocados.
