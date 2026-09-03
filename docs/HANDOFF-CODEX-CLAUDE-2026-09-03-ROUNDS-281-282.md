# HANDOFF CODEX → CLAUDE — ROUNDS 281–282

**Data:** 2026-09-03 · **Trilha:** Growth (aquisição e assinatura) · **Estado:** pacote funcional pré-push

## Sinal que iniciou a rodada

- **EVIDÊNCIA DE PRODUÇÃO (Supabase, SELECT, 2026-09-03 06:37 BRT):** nas 6 horas alinhadas, `landing_session_started` caiu de 79 pessoas/sessões para 52. TAAFT explica 24 das 27 entradas perdidas (53 → 29); ChatGPT ficou praticamente estável (10 → 9).
- **EVIDÊNCIA DE PRODUÇÃO (mesma consulta/data):** checkout não caiu na janela alinhada: `checkout_attempted` 2 → 5 e `checkout_started` 2 → 3. Em 24 horas alinhadas: entradas 263 → 257; cadastros externos 38 → 51; pessoas externas com vídeo concluído 23 → 35; `checkout_started` 5 → 10; pagamentos 0 → 1.
- **CONCLUSÃO:** existe queda curta de tráfego, concentrada em um canal externo volátil. Não existe evidência de regressão de checkout causada pelo código do Codex.

## Decisão operacional permanente do fundador

- **DECISÃO APROVADA:** dado não substitui ação. Toda análise deve terminar em `EXECUTAR`, `NÃO EXECUTAR` ou `PIVOTAR`, com causa bloqueadora explícita.
- **DECISÃO APROVADA:** toda proposta é classificada `NOVA`, `PARCIAL` ou `DUPLICADA`; ação duplicada não entra em produção.
- **DECISÃO APROVADA:** queda curta só autoriza rollback após comparação de janelas iguais e decomposição por fonte.
- Registrada também em `docs/DECISIONS.md` e `docs/workstreams/GROWTH.md`.

## Ação escolhida

**NOVA — Web Share Target / “Share to Kineo”.** A PWA instalável passa a aparecer no compartilhamento do Android/Chromium. Texto ou título compartilhado abre a ferramenta gratuita de roteiro já existente, pré-preenchida; URL externa nunca é buscada e nunca entra em query, evento ou banco.

Fluxo: aplicativo/site externo → compartilhar → Kineo → roteiro grátis → cadastro → novo vídeo → checkout recorrente → pagamento da mesma Stripe Session.

### Guardas

- POST apenas `application/x-www-form-urlencoded`, corpo limitado a 16 KiB antes de decodificar.
- Bridge `no-store`, `no-referrer`, `noindex`, CSP fechada e serialização resistente a quebra de `<script>`.
- GET direto é neutro e não carrega campanha.
- Só payload fresco e válido do POST entra no funil comercial. URL-only continua sendo uma tentativa real, com orientação para colar o título. URL montada manualmente ou armazenamento indisponível sem payload gera apenas diagnóstico, sem atribuição.
- Eventos comerciais usam `trackClosedEvent` e conjunto exato de chaves; texto, URL, UTM livre, `gclid` e `ref` não entram.
- URL-only e falhas de transporte mostram orientação honesta em azul, não erro vermelho.

## Medição e gate

- Sessão nunca é pessoa. Atribuição exige um único usuário externo identificado na mesma sessão depois da chegada.
- Perfil criado depois da chegada = `new_acquisition`; perfil anterior = `returning_activation`.
- Vídeo precisa ser novo e posterior à chegada; checkout recorrente precisa ser posterior ao vídeo.
- Receita exige ledger canônico, mesma Stripe Session, dono sem conflito, pagamento e assinatura ativa.
- Resultado terminal (vídeo, checkout, assinante, sessões pagas e receita) fica separado para aquisição nova e reativação.
- **Gate:** 7 dias de maturidade; mínimo de 5 sessões maduras / 5 pessoas maduras conforme o estágio. Relógio ausente, contrato adulterado, dono conflitante, cronologia impossível ou financeiro malformado bloqueiam decisão.

## Testes pré-push

- `test-web-share-target.mjs`: 79/79.
- `test-web-share-target-subscription-report.mjs`: 52/52.
- `test-web-share-target-collector.mjs`: 5/5, incluindo segunda página e falha de consulta.
- `test-affiliate-client-brief-relay.mjs`: 111/111.
- TypeScript: somente os 3 erros preexistentes em `mrr.ts`, `me/subscription/route.ts` e `TrialDowngradeModal.tsx`; zero erro novo.
- Preview obrigatório: `docs/previews/WEB-SHARE-TARGET-V1-2026-09-03.html`.

## Ordem de integração e freeze

- **DECISÃO DE COORDENAÇÃO:** esta worktree, `codex/pwa-share-target-v1`, vence a disputa de superfície por ser a ação atual, auditada e baseada em `d707328`.
- As worktrees não commitadas `codex/referral-idea-invite-v1` e `codex/free-script-share` ficam preservadas, mas **não podem ser publicadas como estão**. Depois do gate desta ação, devem ser rebaseadas e reavaliadas; não sobrescrever os arquivos atuais.
- Após publicação, congelar `app/manifest.ts`, `app/share-to-kineo/**`, `lib/growth/webShareTarget.ts` e a variante Web Share de `app/free-script-generator/**` até existirem no mínimo 5 sessões maduras, cada uma com pelo menos 7 dias. Correção P0/P1 comprovada é exceção.
- Não chamar receita agregada de “aquisição”: sempre mostrar `new_acquisition` e `returning_activation` separadamente.

## Fora do escopo

Nenhuma mudança em render, cenas, voz, legendas, motores, créditos, preço, plano, SKU, promessa ou checkout. Nenhuma comunicação externa, anúncio, recrawl ou render forçado.

## Validação de produção

- **IMPLEMENTADO / VALIDADO EM PRODUÇÃO (2026-09-03):** commit `fbd9e8a7a84651f3db0d7ab8c76fff939ff83b86`, remoto `origin/main` idêntico.
- **VALIDADO EM PRODUÇÃO (Vercel):** deploy `dpl_9otSX5Q6XHGjJCGqU18Ysx6VfH6x`, estado `READY`, Next.js, alias `www.usekineo.com`, sem erro de alias.
- **VALIDADO EM PRODUÇÃO (HTTP):** manifesto 200 expõe `share_target` POST para `/share-to-kineo`; GET direto responde 307 para `/free-script-generator` sem campanha; POST responde 200 com `no-store`, `no-referrer`, bridge de `sessionStorage` e status fechado `received`.
- **VALIDADO EM PRODUÇÃO (observabilidade Vercel):** zero grupos de erro runtime nos 15 minutos posteriores ao deploy.
- **TESTADO LOCALMENTE (Chrome):** preview autocontido renderizado pelo Chrome com exit 0; screenshot `C:\tmp\codex-web-share-preview.png` (51.868 bytes).
