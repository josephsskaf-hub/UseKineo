# Qualidade e recuperação de vídeo — entrega de 11/09/2026

## Estado

**DECISÃO INFORMADA PELO FUNDADOR:** implementar a auditoria de motores (duração, voz, legendas, música e abertura). Créditos de execução renovados em 11/09. Não houve autorização inferida para trocar preços, mudar conta Fal ou disparar lote pago de teste.

**IMPLEMENTADO / TESTADO LOCALMENTE / PUBLICADO — infraestrutura validada em 11/09 às 14:10 UTC (11:10 BRT).** Código `d26de286d73e361853e13b5df438224fa0f1a9e0`, Vercel READY e Guardião success; detalhe abaixo. Worktree `C:/kineo-wt/render-poll-recovery-20260911`, branch `codex/render-poll-recovery-20260911`, base `f6e4e3e69b4d87e94789575dfdd155074019d3b7`. Árvore principal suja intocada. Validação audiovisual continua pendente.

## Alterações implementadas

- **Duração:** redução automática só com consentimento explícito; plano e montagem avançada verificam o mínimo escolhido. Áudio não pode inventar filmagem nem cortar payoff silenciosamente. Se não cabe, saída explícita em vez de entregar 40s como se fossem 60s. Fontes: `lib/cinematic/timelineContract.ts`, geração cinematográfica e compose.
- **Fala:** uma fonte por cena, nativa ou narração; narradas exigem texto e áudio. Legenda com tempo inventado não comprova voz nativa. Clone indisponível no caminho corrigido não vira outra voz silenciosamente. Fontes: `lib/cinematic/speechContract.ts`, `lib/compose.ts`, compose.
- **Música:** emoção separada do tema, com luto/alegria/tensão/calma e diretivas. Se o fornecedor falhar e não houver alternativa coerente, usar silêncio em vez de faixa no clima oposto. Nenhum fornecedor novo. Fontes: `lib/musicDirection.ts`, `lib/musicScore.ts`, `lib/lyriaMusic.ts`.
- **Visual e abertura:** positivo, negativo, still e fallback clássicos compartilham formato e estilo. Apresentador não recebe proibição de pessoas; animação não recebe proibição de animação. Hook orienta a abertura. Fonte: `lib/cinematic/visualPromptPolicy.ts` e callers reais.
- **Recuperação:** saída EN/ES/HI com referência, histórico e suporte; editar preserva ideia e só é oferecido com situação financeira confirmada. Trava retida impede composição duplicada; geração encerrada não vira render fantasma. Fontes: `qualityFailureUi.ts`, `qualityRejection.ts`, `VideoQualityFailurePanel.tsx`, compose/active.
- **Jobs pagos:** prova assinada por ID/modelo distingue conclusão, falha e desconhecido. URL pronta não regride por consulta posterior. Slot nulo não prova rejeição; ambiguidade impede estorno automático. Fontes: `lib/cinematic/claim.ts`, polling, publisher cinematográfico e qualityRejection.

## Caso da madrugada

**FATO CONFIRMADO — pontos de auditoria no código integrado:** `lib/cinematic/timelineContract.ts:18` e `:57`; `lib/cinematic/speechContract.ts:68`; `lib/musicDirection.ts:84`; `lib/cinematic/visualPromptPolicy.ts:27`; `lib/cinematic/qualityRejection.ts:104` e `:153`; `components/VideoQualityFailurePanel.tsx:33`; `app/api/generate-video-cinematic/route.ts:1422`. As localizações são deste snapshot; os nomes exportados permitem localizar após novos commits.

**EVIDÊNCIA DE PRODUÇÃO — SELECT de 11/09 às 13:39:46–13:40:07 UTC (10:39–10:40 BRT):** as três tentativas do fundador, prefixos `1a10bfa0`, `98c8cc39`, `2c15918b`, estão `released / provider_abandoned_refunded`. Ledger confirma 25 créditos devolvidos em cada uma às 06:30:38–06:30:39 UTC. Foi a rotina já existente, não esta implementação local. Não confundir estorno com entrega de filme.

**EVIDÊNCIA DE PRODUÇÃO anterior, 11/09:** status COMPLETED/ID correto, resultado HTTP403 e sinal `User is locked`, sem erro terminal de job no status. Isso não prova saldo insuficiente. Suporte Fal foi contatado nesta sessão, sem prompts/chaves. Consulta Gmail em 11/09 às 13:40 UTC não encontrou resposta de suporte. Desbloqueio e recuperação dos arquivos seguem **DESCONHECIDOS**.

## Verificação e limites

**TESTADO LOCALMENTE:** módulos reais, trechos executados das rotas, HMAC/CAS, ledger simulado e contagem de chamadas. Baterias de duração, fala, música, visual, rejeição financeira, integração, UI, active, prova terminal, diagnóstico, além dos contratos críticos já existentes. Rede, fornecedor e refund reais proibidos nas baterias. Contagens e CI registrados abaixo.

**QUESTÃO PENDENTE — audiovisual:** nenhum novo render pago de canário. Ainda é necessário assistir ao filme completo e medir o MP4, voz, lábios, legenda, música e payoff. ASR não certifica identidade de rosto nem movimento labial; nomes e números podem gerar falso negativo. Transcrição atual de MP4 tem limite de tamanho; não foi criada infraestrutura de extração/compressão de áudio. Clone/upload no compositor avançado não foi refeito integralmente. Não declarar todos os motores perfeitos.

**QUESTÃO PENDENTE — comparação visual:** `docs/quality-failure-ui-before-after-2026-09-11.html` contém componente real em desktop/mobile e EN/ES/HI. Política do navegador recusou abrir arquivo local e não foi contornada. Arquivo encaminhado ao visualizador do app; SSR verificado, inspeção visual no navegador não confirmada.

**RISCO EXPLÍCITO:** o gate pode recusar resultado antes entregue curto ou sem fala confiável. Não enfraquecer teste para maquiar isso. Job possível ou conciliação incerta exige suporte, sem frase de crédito devolvido e sem retry cego. Salvage legado não recebe prova de ausência de POST por ter um ID nulo.

## Entrega e coordenação

### Integração final — 11/09, 14:07 UTC

**TESTADO LOCALMENTE:** 16 baterias críticas verdes e `npx tsc --noEmit --incremental false` código 0. Duração 44; fala 125; música 112; visual 326; rejeição financeira 219; integração de rota 303; UI 65; active 61; prova terminal 197; polling 185; retry com mutex 258. Regressões: sharing 70, five-improvements 640, locale-readiness 2091, home-curation 178, showcase-premium 287. Números são asserções, não clientes, renders ou percentual de cobertura. Aviso SSR pré-existente de `fetchPriority` na vitrine não foi ocultado.

**FATO CONFIRMADO — `app/api/compose/route.ts`, `lib/cinematic/sceneRetry.ts` e teste de integração:** recuperação de cena e montagem usam a mesma exclusão por geração. A montagem relê a autoridade assinada DEPOIS de conquistar a trava: se houve retarget, falha de leitura, encerramento ou job ainda ativo, não compra áudio/render sobre o snapshot antigo. Liberação exige nonce único, autoridade, dono e estado pendente; retorno confirma a linha removida. Replay de retry incerto mostra suporte, sem crédito devolvido inventado nem reenvio pago.

**DECLARAÇÃO DE TESTE:** o fixture de slot nulo carregava prova terminal de um ID ausente; a integração corretamente recusou com 409. Corrigido apenas o fixture para não inventar prova órfã (revisão do agente em `e85e856e`, incorporada manualmente ao teste em edição). A política de assinatura não foi afrouxada. Cenários executam o ramo real de aquisição/replay e falha da releitura; comparação de posição no código é apenas suplementar.

**LIMITE:** os testes não certificam o audiovisual nem desbloqueiam a conta Fal.

### Confirmação de publicação — 11/09, 14:10 UTC

**EVIDÊNCIA DE PRODUÇÃO:** batch seguro publicou exatamente `d26de286d73e361853e13b5df438224fa0f1a9e0` sobre a base revisada. Vercel `dpl_EuRe6TXXh1T9127FA7ChYUehw637` READY, produção, SHA correspondente e alias `www.usekineo.com`; sem erro de alias. [Guardião 34608234129](https://github.com/josephsskaf-hub/UseKineo/actions/runs/34608234129) completed/success, incluindo typecheck e 16 baterias críticas. Diagnóstico legado manual skipped, não contado como teste aprovado.

**EVIDÊNCIA DE PRODUÇÃO:** smoke público após READY: `/` HTTP200; GET `/api/compose/active` sem sessão HTTP401 com mensagem de login, como esperado. Consulta de logs error/fatal deste deployment desde 14:08:33 UTC, realizada às 14:10 UTC, sem linhas retornadas. Janela curta e sem novo render pago: isso não prova ausência global de erro nem resultado final de cliente.

**HANDOFF:** artefato de código publicado e aprovado pelos gates locais/CI. Fal ainda sem confirmação de desbloqueio; nenhuma tentativa antiga reenviada. Próxima prova é canário audiovisual autorizado (MP4 medido, voz/lábios/legenda/música e duração), não mais um teste por regex. Este fechamento documental não muda o código de produção.

**PROCEDIMENTO:** testes offline + typecheck bruto; diff revisado; commit explícito; `bash scripts/enfileirar.sh`; BAT com SHA candidato e SHA da main revisada; confirmar GitHub/Guardião/Vercel. Sem force, reset, migration, crédito manual, preço ou conta Fal.

**PRÓXIMO PASSO:** após publicação segura, canário audiovisual autorizado e mensurável; acompanhar suporte sem reenviar cenas antigas. Claude deve ler este documento e o pedido de reserva antes de editar os mesmos caminhos.
