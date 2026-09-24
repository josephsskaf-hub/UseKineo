# GPT-LOJA-20260924 — recusas do link de assistente

## Aceite visual e integração pelo Board — 24/09/2026 21:21 UTC

**EVIDÊNCIA DE APROVAÇÃO:** fundador respondeu “aprovado” nesta tarefa ao preview das duas recusas, desktop/mobile, SHA256 `559BB7F9DB982AEAECBD21C630E0C2E7873FEC8FB567F4040BF503EABFAD7449`. Gate humano satisfeito; bloqueio do navegador do agente não foi contornado e não equivale a inspeção visual automatizada.

**IMPLEMENTADO / LOCAL:** Board integrou `82bd8ec410d206ead2b8deadca2bf1889f55190a` em sua worktree `C:/kineo-wt/gpt-5h`, preservando os registros de fechamento e reservas. Código e testes idênticos ao candidato comparado à base `ce50b9c0d372118465e6243a5a14b29c55d725ae`; diferenças adicionais apenas documentais. Comparação integral herdada: 613 testes na base, 614 no candidato, mesmos 129 vermelhos preexistentes. Não declarar suíte integral verde.

**PRÓXIMA AÇÃO:** fila única e batch guardado com candidato/base imutáveis; execução pelo fundador. Aprovação e enfileiramento não comprovam publicação no Git, deploy READY, exposição ou receita. Recorte 2 permanece pendente, sem alteração.

**LOCAL / TESTADO LOCALMENTE — 24/09/2026, corte técnico 21:18 UTC.** Base `ce50b9c0`. Reserva nominal do Board nesta tarefa; fila e publicação continuam com o Board. Sem deploy, exposição ou pagamento comprovados por esta entrega.

## Contrato e escopo

**HIPÓTESE:** pessoas que chegam por `/make` com roteiro pronto descobrem tarde duas incompatibilidades já recusadas pela Action. Recusar antes de criar/reutilizar o link, com explicação e saída na página existente, pode evitar uma chegada sem próximo passo útil. Não há amostra comercial nova nesta rodada; o sucesso técnico é impedir a gravação dos casos inválidos mantendo os casos válidos. Pagamento incremental e conversão permanecem DESCONHECIDOS.

**DECISÃO DE DONO:** Board reservou `/make` e apresentação dos slugs em `/chatgpt-to-youtube-shorts`. Correção reversível, sem nova variante comercial. Eventos existentes `gpt_handoff_refused`, `gpt_handoff_error_shown` e `organic_handoff_opened`, canal `assistant_link`; nenhuma origem convertida artificialmente em ChatGPT. Parada: alteração necessária de preço/acesso/render, perda de dados/privacidade, falha nova ou ausência de aceite visual. Corte semanal 25/09 05:10 UTC preservado.

**FATO CONFIRMADO / IMPLEMENTADO:** `app/make/route.ts:152` reutiliza `handoffEngineRefusal` depois de limites/bot/too_short e antes de hash, lookup ou insert. Recusas retornam apenas `script_too_long_for_kineo1` ou `engine_language`, sem roteiro/PII na URL de retorno ou evento. `app/chatgpt-to-youtube-shorts/page.tsx:62` contém as duas frases, com nomes dos motores e teto derivados das fontes existentes. Hash, TTL, idempotência, limites, bots e geração do token não foram alterados.

## Candidatas e limite conhecido

- **PARCIAL:** recorte 1, implementado e testado LOCAL; inspeção visual e aceite das frases pendentes antes de fila.
- **BLOQUEADA / decisão do Board:** recorte 2, `handoffOutcome`, sem alteração. `app/api/generate-video-cinematic/route.ts:1538` resolve persona usando `body.vertical`; `app/(dashboard)/generate/GenerateClient.tsx:8958` fornece `analysis?.niche`, produzido depois do handoff. `HandoffInput` não tem essa categoria. `topic` livre não é categoria canônica. Não inventar vertical nem chamar a estimativa atual de equivalente à configuração futura. Dependência: categoria/voz canônica disponível e contrato aprovado pelo dono; nenhuma troca parcial para Kineo 1/Hollywood autorizada nesta rodada.
- **BLOQUEADA:** candidato Seedance `3fb96b1a` preservado, com seu gate humano independente. Reteste80 permanece encerrado e não foi repetido.

## Provas offline

**TESTADO LOCALMENTE:** `node node_modules/typescript/bin/tsc --noEmit --incremental false` passou. Guardas: GPT Loja 27/27, V31 40/40, avisos 106/106, assistant-deep-link 153/153; `test-gpt-handoff.mjs` verde na comparação integral. Teste novo `test-assistant-engine-refusal-2026-09-24.mjs`: 43 verificações e três mutantes de bypass/privacidade rejeitados. Rota executada com banco, eventos, cookies e resposta Next simulados; sem chamada HTTP, credencial, render ou checkout. Casos válidos, recusas por motor/idioma, limites IP/global, bots, hash, TTL, reutilização, corrida e indisponibilidade cobertos.

**TESTADO LOCALMENTE / comparação integral:** base 613 testes, 129 vermelhos; candidato 614 testes, os mesmos 129 vermelhos. Não é suíte integral verde. A primeira execução do candidato teve um falso positivo extra em C8 de `test-assistant-deep-link`: regex de metadata atravessava o evento inline até o insert; reancorada para verificar os dois objetos separadamente e reexecutada com êxito. Guardião de avisos também passou a reconhecer dígito em slug e referências a `ENGINE_LABELS`, mantendo a proibição de números/nomes literais. Nenhuma regra comercial relaxada.

Evidências privadas (fora do Git): `C:/Users/josep/.codex/outputs/gpt-5h-suite-citacoes-make-base.json`, `gpt-5h-suite-citacoes-make-candidate.json` (inicial preservado) e `gpt-5h-suite-citacoes-make-final.json` (reexecução específica documentada). Runner revisado do Board, ambiente sem credenciais herdadas, guarda de rede externa; nenhum `.env.local` presente nestas worktrees limpas.

## Preview e próxima ação

**LOCAL:** `preview.html`, gerado por `build-preview.cjs`, autocontido; dois avisos em desktop 1000px e mobile 390px. O depois usa JSX real de `HandoffErrorNotice` com estado hidratado simulado offline. Antes documenta ausência de recusa e continuação para `/go`; não se apresenta como screenshot dessa página. Sem redesenho de `/go`, eventos, rede ou criação de links pelo preview.

**BLOQUEADO:** Browser Use rejeitou a abertura do arquivo local pela política de URLs. Nenhuma inspeção visual realizada pelo agente, nenhum contorno por servidor/URL alternativa/browser externo. Board deve apresentar o arquivo ao fundador pelo fluxo humano permitido. Objeto do aceite: as duas frases e sua apresentação desktop/mobile neste preview, antes de enfileirar.

**PRÓXIMA AÇÃO:** Board recebe SHA/base/provas e coordena revisão visual, aceite e fila única. Não executar BAT, publicar recorte 2, consultar banco ou contar receita. **FILA DO FUNDADOR:** aceite visual deste objeto; nenhum gasto ou alteração de oferta solicitado.
