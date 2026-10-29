# Primeiro filme grátis — Kling 4 (28/10/2026)

**DECISÃO APROVADA:** pedido do fundador de 28/10/2026, registrado em `docs/DECISIONS.md`: testar por sete dias o primeiro filme grátis em Kling 4, 15 s, nos países já admitidos. Revisão e publicação pelo Claude; esta entrega não aplica migração nem faz render pago.

**FATO CONFIRMADO / IMPLEMENTADO:** `lib/kling4TrialPolicy.ts:2` contém o único interruptor `KLING4_TRIAL_LIVE=true`. `false` faz novos pedidos seguirem o Seedance existente. Claims já aceitos continuam recuperáveis. `lib/freeFilmPolicy.ts` não foi alterado. Não muda oferta, créditos, anúncios, Kling 3/Hollywood ou planos pagos.

**FATO CONFIRMADO / IMPLEMENTADO:** o nascimento usa a admissão existente e comprova ausência de filmes anteriores e débitos cinematográficos não estornados, excluindo o próprio débito. Erro nessa leitura conserva Seedance. Pedidos financiados do produto Kids separado continuam no fluxo próprio; um desenho feito pelo trial normal pode participar. Fonte: `app/api/generate-video-cinematic/route.ts:3596`, bloco `kling4TrialCandidate`.

**FATO CONFIRMADO / IMPLEMENTADO:** `lib/kling4Trial.ts:60` envia um único `multi_prompt`, com soma de 15 s, `resolution:720p` e prompts limitados a 512 caracteres Unicode. O URL final aprovado da cena 1 seleciona `kling/v4/image-to-video` com `start_image_url`; os aprovados das cenas seguintes entram em `middle_image_urls`, na ordem, no máximo oito. O I2V não recebe `aspect_ratio`: o still 9:16 determina o quadro. Sem aprovação da cena 1, usa T2V com `aspect_ratio:9:16`, sem imagens, pois esse endpoint não aceita quadros. Fontes: `lib/kling4Trial.ts:14` e [OpenAPI oficial I2V](https://fal.ai/api/openapi/queue/openapi.json?endpoint_id=kling/v4/image-to-video), [OpenAPI oficial T2V](https://fal.ai/api/openapi/queue/openapi.json?endpoint_id=kling/v4/text-to-video), consultados em 28/10/2026.

**FATO CONFIRMADO / IMPLEMENTADO:** aprovação exige PASS do URL efetivamente escolhido naquela cena; PASS de uma tentativa anterior não aprova sua substituta. ERRO/PULADO/FAIL não semeiam Kling. A lista mantém as cenas em `multi_prompt`; uma lacuna de still recebe direção só por texto. **QUESTÃO PENDENTE / limite do fornecedor:** `middle_image_urls` é uma lista de strings, sem índice de cena ou timestamp. Os prompts nomeiam o keyframe correspondente quando há lacuna; a fal não documenta garantia desse vínculo semântico. O canário deve conferir o alinhamento. Fontes: `lib/kling4Trial.ts:14` e schemas oficiais acima.

**DECISÃO APROVADA / IMPLEMENTADO — complemento 3:** `lib/kling4Trial.ts:31` calcula segundos de fala por cena com `narrationWordCount(voiceover) / narrationRate.wordsPerSecond`; o nascimento usa as falas finais, após os reparos do filme curto, e o ritmo já resolvido para voz, velocidade e idioma. A divisão proporcional fixa cenas curtas no piso de 3 s e distribui o restante entre as demais; maiores restos convertem para os segundos inteiros do schema, sempre somando 15. Uma fala de 24 palavras e duas de seis recebem 9/3/3, em vez de 5/5/5. Mais de cinco cenas não cabem nesse piso e são recusadas antes de qualquer POST. Fonte: `app/api/generate-video-cinematic/route.ts:7382`.

**FATO CONFIRMADO / limite da régua:** palavras/ritmo é a estimativa usada pelo filme curto, não uma medição do áudio TTS futuro. A soma continua 15 s como pedido; os pesos preservam a proporção das falas, sujeitos ao piso e ao arredondamento do fornecedor. A medição do MP4 e o piso final de 15 s permanecem no gate. O canário deve conferir o sincronismo ouvido e visto.

**FATO CONFIRMADO / IMPLEMENTADO:** o claim assina `kling4_trial.scene_plan` com prompt, fala, descrição, URL do still aprovado e início/duração de cada trecho, os mesmos segundos enviados em `multi_prompt`. A montagem continua recebendo um único clipe de 15 s. Os clipes de fallback mantêm seus próprios passos de 6/7/8 s; não recebem os segundos curtos do Kling. Fonte: `app/api/generate-video-cinematic/route.ts`, bloco `scenePlan`.

**FATO CONFIRMADO / IMPLEMENTADO:** `supabase/migrations/20261029011109_kling4_trial_daily_budget.sql:28` reserva no banco antes do POST pago. Livro em milliUSD, dia UTC, teto 60000; cada pedido reserva 2355 (= 15 × US$ 0,157 = US$ 2,355; exibição arredondada US$ 2,36). Cabem 25 reservas, US$ 58,875; a próxima é negada. Lock transacional da identidade e `FOR UPDATE` da linha diária; duplicata não autoriza outro POST. RPCs exclusivas de service-role; tabelas com RLS. Não há devolução de reserva em falha ambígua.

**FATO CONFIRMADO / IMPLEMENTADO:** cap seleciona `seedance15_cap`; banco indisponível, recusa, 503, resultado inválido ou tempo esgotado selecionam `seedance15_fallback`. Nenhum desses caminhos repete o POST Kling ou cria outro débito de créditos. Seguem as cenas Seedance existentes, com os próprios mecanismos de recuperação/estorno se esse fornecedor também falhar. Fontes: `lib/kling4Trial.ts:147`, `app/api/generate-video-cinematic/route.ts:7377`.

**FATO CONFIRMADO / IMPLEMENTADO:** o nascimento faz somente o POST de fila e persiste `request_id`, modelo e `submitted_at` no claim assinado; não espera o vídeo nem consulta status. `/api/cinematic-clip-status` e o resgate usam GET em `https://queue.fal.run/kling/v4/requests/{id}/status` e no resultado, com a mesma prova de propriedade. Antes de oito minutos, IN_QUEUE/IN_PROGRESS e falhas transitórias de consulta continuam pendentes. Falha terminal ou primeira consulta após oito minutos aciona o fallback. Não há POST Kling no status. Fontes: `lib/kling4Trial.ts:97`, `lib/kling4TrialAsyncStatus.ts:1`, `app/api/cinematic-clip-status/route.ts:1`.

**FATO CONFIRMADO / IMPLEMENTADO:** `supabase/migrations/20261029021044_kling4_trial_async_fallback.sql:1` cria três slots de fallback persistentes. Cada cena recebe permissão uma vez, ANTES do POST Seedance; o recibo é gravado imediatamente. Retomadas repetem apenas a persistência do mesmo recibo. Após 60 s, slot de worker morto vira ambíguo e não autoriza reenvio. Um CAS HMAC seleciona o fallback antes desses POSTs e disputa com a autorização do Kling concluído: uma fonte já autorizada impede trocar de motor; fallback já iniciado impede entregar um Kling tardio. Fontes: `lib/kling4TrialFallback.ts:1`, `lib/cinematic/claim.ts`, funções `startKling4TrialFallback` e `switchKling4TrialToSeedanceFallback`.

**FATO CONFIRMADO / IMPLEMENTADO:** o fallback restaura os metadados das três cenas e assina novos IDs/modelos. O cliente aceita apenas essa substituição autorizada; cron/status continuam pelo mesmo claim. Retentativas genéricas de cena ficam bloqueadas para esse fallback finalizado, preservando os três POSTs únicos. Uma cena aceita já permite filme de pelo menos 15 s. **QUESTÃO PENDENTE / limite de entrega:** se todas as tentativas Seedance também forem recusadas ou nenhum recibo puder ser persistido, não há vídeo comprovado; o crédito é estornado e o claim encerrado. Recibo perdido depois de POST não pode ser reenviado com segurança. Não se classifica estorno como filme entregue. Fontes: `lib/kling4TrialFallback.ts:1`, `app/api/cinematic-clip-status/route.ts`, `app/api/retry-hollywood-scene/route.ts`.

**FATO CONFIRMADO / IMPLEMENTADO:** `lib/compose.ts:2444` reproduz o vídeo Kling inteiro desde zero, volume `0%`, com nossa narração e música existentes; não o divide em três cópias. A montagem segue o aspecto assinado 9:16, mesmo se o navegador mandar quadrado/horizontal. Todas as três saídas do experimento têm piso 15 s. Narração maior é preservada; o vídeo pode repetir após os 15 s completos. O gate lê duração observada sem arredondar e reprova menos de 15 s. Fontes: `app/api/compose/route.ts:830`, `lib/compose.ts:2131`, `lib/free15Gate.ts:69`.

## Medição dos sete dias

**FATO CONFIRMADO / IMPLEMENTADO:** um evento `free_film_engine_used` por usuário/geração, com `engine_used`, `cost_usd`, `cost_basis`, `country`, `seconds`, `film_id`, `generation_id`. A reserva aceita inicialmente registra Kling; a transição terminal para Seedance atualiza a MESMA linha/evento, preservando custo e país. Replays não revertem o motor e reparam gravação interrompida. Fontes: `lib/kling4TrialBudget.ts:27` e RPCs `record_kling4_trial_film` / `transition_kling4_trial_fallback`.

**FATO CONFIRMADO / limite contábil:** `cost_usd` mede a reserva prudente do Kling, com `cost_basis=reserved_upper_bound`, não uma fatura consultada na fal. Falha comprovadamente anterior ao POST informa zero; após POST pode informar US$ 2,355 mesmo se o fornecedor não cobrar a falha. O teto continua retendo essa reserva. Custos de still, voz, música e Seedance não são gastos Kling desse teto.

**SUGESTÃO / procedimento D+7:** fixar a janela de exposição a partir do deploy do Claude; registrar início/fim UTC e SHA publicado. Desligar o interruptor na revisão de sete dias, salvo nova decisão do fundador. Não há agendamento ou monitoramento automático nesta entrega.

**FATO CONFIRMADO / junções disponíveis:**

- `free_film_engine_used.user_id` + `metadata.generation_id` → evento `compose_submission_claim`, mesmo usuário e `session_id`, `metadata.status='done'` → `metadata.render_id` → `videos.render_id`, mesmo usuário e `videos.status='completed'`. Fontes: `lib/cinematic/claim.ts`, `app/api/compose/route.ts`, `app/api/compose/status/[renderId]/route.ts`.
- Download efetivo: `video_downloaded`, mesmo usuário e `metadata.video_id=videos.id`. Fonte: `lib/videoDownload.ts:846`. Download sem `video_id` fica sem atribuição exata; clique não substitui download.
- Chegada ao checkout: `checkout_started`, mesmo usuário, depois da entrega, dentro da janela declarada; a rota emite após criar a sessão Stripe. Fonte: `app/api/stripe/checkout/route.ts:2998`.

**SUGESTÃO / denominadores:** por motor e país, contar pessoas externas distintas com filme concluído; numeradores são pessoas desse mesmo grupo com download do filme e com checkout posterior. Excluir internos pela regra canônica `lib/internalAccounts.ts:55`; não excluir quem pagou depois, pois isso removeria conversores. Mostrar também pedidos aceitos, entregas e falhas, separados da taxa de download. Não usar quantidade de eventos como quantidade de pessoas.

**QUESTÃO PENDENTE / DESCONHECIDO:** a base de download de 37% foi informada pelo fundador neste pedido (28/10/2026); janela/denominador não foram consultados nesta execução. Recalcular com a mesma definição antes de comparar. Cap/fallback não formam um controle aleatório: horário, país e indisponibilidade podem diferir. Uma diferença observada entre motores não comprova causalidade.

## Verificação e passagem para o Claude

**TESTADO LOCALMENTE — 28/10/2026:** guardas em `tests/kling4Trial.test.mjs`; SQL e RPCs em `tests/kling4TrialBudget.cjs`; regressões do gate em `scripts/test-filme15-gate-integration-2610.mjs` e `scripts/test-filme15-perfeito-2610.mjs`. Rede, SDKs, credenciais e render pago bloqueados nos testes. PGlite verifica SQL, limites, duplicata, rollover UTC, permissões e rollback atômico do evento; serializa requisições e não prova concorrência entre conexões reais de produção.

**TESTADO LOCALMENTE — revisão assíncrona de 28/10/2026:** 62 testes de nascimento/poll/fallback, HMAC/CAS e anúncio aprovados; provas SQL do teto e dos slots de fallback aprovadas. Regressões: polling (185 verificações), mutex de retry (258), resgate (13), integração do gate (nove) e rejeição de nove mutantes. Typecheck completo `tsc --noEmit --incremental false --pretty false`, exit 0; `git diff --check` limpo. Fontes executáveis: `tests/kling4Trial*.test.mjs`, `tests/kling4TrialBudget.cjs`, `tests/kling4TrialFallbackSql.cjs` e scripts abaixo. Sem render pago, conexão a produção ou arquivos de ambiente.

**SUGESTÃO / comandos de conferência local:**

```powershell
node --test tests/kling4Trial.test.mjs tests/kling4TrialAsync.test.mjs tests/kling4TrialFallbackClaim.test.mjs tests/kling4TrialNotice.test.mjs tests/kling4TrialAvailability.test.mjs
node tests/kling4TrialBudget.cjs
node tests/kling4TrialFallbackSql.cjs
node scripts/test-cinematic-poll-diagnostic-2026-09-11.mjs
node scripts/test-scene-retry-mutex-2026-09-11.mjs
node scripts/test-stranded-authorized-urls-fallback.mjs
node scripts/test-filme15-gate-integration-2610.mjs
node scripts/test-filme15-perfeito-2610.mjs
npx tsc --noEmit --incremental false
git diff --check
```

**QUESTÃO PENDENTE / DESCONHECIDO:** duas migrações preparadas, não aplicadas por esta execução: `20261029011109_kling4_trial_daily_budget.sql` e `20261029021044_kling4_trial_async_fallback.sql`. Claude deve conferir/aplicar ambas antes do canário. Nenhum render desta branch, publicação ou efeito de conversão foi validado em produção. Sem a primeira migração a reserva falha fechada e segue Seedance; sem a segunda o fallback assíncrono não consegue despachar. Não interpretar ausência de erro de typecheck como configuração de produção.

**DECISÃO APROVADA / correção da revisão de 28/10:** o fundador relatou teste fal de 10 s / 720p levando cerca de três minutos. A espera síncrona de 120 s da versão anterior foi removida, pois podia comprar Kling e abandoná-lo antes de terminar. **QUESTÃO PENDENTE:** medir no canário a latência do filme de 15 s e sua conclusão antes do fallback de oito minutos; ainda não há essa medição neste pipeline.

**Próximo passo recomendado — SUGESTÃO:** Claude revisar o SHA, conferir/aplicar as duas migrações e fazer o único render real de canário autorizado. Conferir: nascimento responde com recibo sem esperar o vídeo; status continua Kling após três minutos; start/middle usam os quadros aprovados em ordem; I2V sem `aspect_ratio`, 720p e still 9:16; cenas contínuas, ausência de áudio Kling, voz/música presentes, MP4 observado ≥15 s, débito/reserva/evento sem duplicação. Falha e oito minutos estão cobertos por testes offline; não provocar render adicional só para esse ensaio. Não publicar nesta execução; Claude publica após sua conferência e canário. No D+7 medir entrega/download/checkout.

**FATO CONFIRMADO / escopo da idempotência:** os três slots são os POSTs da transição para Seedance; nenhuma consulta de status ou retry legado pode comprá-los novamente. O reparo visual posterior de uma cena já concluída e julgada continua no gate existente, com seu próprio CAS e limite, assim como o refazer solicitado manualmente pelo usuário. Não é reenvio de um slot ambíguo. Fonte: `lib/free15GateServer.ts:75`, `lib/free15Gate.ts` e guardas de `app/api/retry-hollywood-scene/route.ts`.

## Complemento 2 — anúncio honesto do trial

**DECISÃO APROVADA — complemento direto de Joseph, 28/10/2026:** anunciar “First film free — made with Kling 4.0” na home atual, cadastro/login e preços, pelas 16 línguas do sistema de tradução da interface. A frase depende do mesmo `KLING4_TRIAL_LIVE` e do teto diário; sem capacidade, fica oculta. Fonte canônica: `docs/DECISIONS.md`, complemento de 28/10.

**FATO CONFIRMADO / IMPLEMENTADO:** `components/Kling4TrialNotice.tsx:9` é o único componente de anúncio, usado uma vez em cada uma das quatro superfícies (cadastro/login também cobrem o modal da home). `lib/ui/refinementCopy.json:3` contém o inglês e as 15 traduções, lidas pelo `UiLabel` existente. A faixa usa as variáveis de cor e o desenho atuais; a home mantém sua estrutura.

**FATO CONFIRMADO / IMPLEMENTADO:** `lib/kling4TrialAvailability.ts:17` lê `kling4_trial_days.reserved_milliusd` do mesmo dia UTC, o interruptor de política e os mesmos custo/teto usados na reserva. Só anuncia quando o próximo filme inteiro cabe no teto. Assim, US$ 58,875 já impede a frase: os US$ 1,125 restantes não pagam outro filme. A política atual de países é respeitada; país conhecido sem filme grátis não recebe a faixa. Leitura ou configuração inválida oculta, sem escrita ou reserva.

**FATO CONFIRMADO / IMPLEMENTADO:** `app/api/kling4-trial/availability/route.ts:11` serve apenas disponibilidade e datas, com `no-store` no navegador e CDNs. A resposta positiva tem validade máxima de 15 s, limitada à virada UTC. `lib/kling4TrialNotice.ts:7` recusa estado vencido, futuro ou malformado. O cliente começa oculto, expira a faixa, consulta novamente e oculta em erro/aba inativa; respostas atrasadas não ressuscitam a frase.

**QUESTÃO PENDENTE / limite de consistência:** o anúncio é uma leitura pontual, não uma reserva de vaga. Uma aba já aberta revalida em até 15 s; se outro pedido consumir a última capacidade nesse intervalo, a faixa some na revalidação. A geração continua consultando a reserva atômica antes de qualquer gasto. Não há afirmação de atualização instantânea entre navegadores.

**TESTADO LOCALMENTE — 28/10/2026:** `tests/kling4TrialAvailability.test.mjs` (sete verificações) e `tests/kling4TrialNotice.test.mjs` (12 verificações) aprovados. Incluem limite efetivo, interruptor, países, erro/migração ausente, cache, virada UTC, respostas atrasadas, limpeza de efeitos, presença nas quatro telas e renderização das 16 traduções pelo sistema real. Typecheck completo aprovado. Nenhum acesso a produção, render pago ou deploy.

**TESTADO LOCALMENTE / comparação visual:** `docs/kling4-trial-2810/preview.html` é o antes/depois autocontido de home, cadastro, login e preços, em desktop/mobile. É uma reprodução estática das áreas alteradas, não prova de publicação. Os controles permitem conferir a faixa disponível/oculta e as traduções.

**Próximo passo recomendado — SUGESTÃO:** Claude incluir a faixa na revisão do mesmo canário: ligar/desligar o interruptor; conferir dia com capacidade, dia sem saldo para outro filme e falha de leitura; conferir as quatro telas e uma língua RTL. Publicar apenas após a migração e a prova já previstas para o trial.

**TESTADO LOCALMENTE / QA visual — 28/10/2026:** imagens inspecionadas em `docs/kling4-trial-2810/`: home, cadastro, login e preços, cada uma em desktop/mobile; também `home-cap-mobile.png` (sem anúncio) e `signup-ar-mobile.png` (RTL). Renderização de HTML estático local pelo Edge em modo headless; nenhuma consulta à aplicação ou produção. A comparação inclui apenas as áreas tocadas, identificadas como ilustrativas.

**SUGESTÃO / conferir o complemento localmente:** `node --test tests/kling4TrialAvailability.test.mjs tests/kling4TrialNotice.test.mjs`, seguido de `npx tsc --noEmit --incremental false`. O resultado nesta entrega foi 19 testes aprovados e typecheck exit 0.

## Complemento 3 — refação em Seedance e tempo da fala

**DECISÃO APROVADA:** complemento 3 de Joseph, recebido em 29/10/2026, registrado em `docs/DECISIONS.md`. A refação grátis de um filme Kling compra somente a cena Seedance 1.5 e emenda seu intervalo; o tempo dos planos Kling acompanha a fala conforme descrito no início deste documento.

**FATO CONFIRMADO / IMPLEMENTADO:** a cena virtual deriva de `scene_plan` e `multi_prompt` no claim verificado, mais o RenderScript e o elo de versão assinados. Com still aprovado, usa o mesmo URL em Seedance I2V; sem still naquela cena, usa Seedance T2V. Modelo, prompt e intervalo são decididos no servidor. Kling não entra na lista de motores reenviáveis da refação. Fontes: `lib/freeRedo/kling4Scene.ts:49`, `lib/freeRedo/core.ts:295` e `lib/cinematic/refazerGratis2810.ts:28`.

**FATO CONFIRMADO / contrato do fornecedor — consultado em 29/10/2026:** o Seedance 1.5 aceita durações inteiras de 4 a 12 segundos. Por isso uma cena Kling de 3 s compra 4 s e usa só os 3 s do intervalo; uma cena de 9 s compra 9 s. O payload pede 720p, 9:16 e `generate_audio:false`; o trecho inserido também tem volume zero. Fontes oficiais: [Seedance I2V](https://fal.ai/models/fal-ai/bytedance/seedance/v1.5/pro/image-to-video/api), [Seedance T2V](https://fal.ai/models/fal-ai/bytedance/seedance/v1.5/pro/text-to-video/api).

**FATO CONFIRMADO / IMPLEMENTADO:** a emenda conserva duração, offsets do Kling antes/depois, eventuais repetições após os primeiros 15 s e os objetos de voz, música e legendas. A segunda refação preserva a primeira correção quando outra cena é escolhida. O servidor refaz a leitura da autoridade antes da montagem e da gravação do elo; a entrega confere duração bruta ≥15 s antes de registrar vídeo concluído, sem aceitar arredondamento de 14,9 s. Fontes: `lib/freeRedo/filmServer.ts:488` e `lib/freeRedo/kling4Scene.ts:88`.

**FATO CONFIRMADO / IMPLEMENTADO:** a fonte assinada da segunda refação é gravada antes de concluir a primeira; uma retomada repara gravação interrompida sem comprar outra cena. Chave duplicada só vale após reler e conferir assinatura, geração, qualidade, elo e hash canônico da emenda exata, incluindo áudio e demais objetos. O reparo automático de qualidade também localiza o intervalo virtual e usa a mesma emenda Seedance, evitando substituir todo o filme por compartilhar uma URL Kling. Fontes: `lib/freeRedo/filmServer.ts:563`, `lib/free15Gate.ts:41` e `lib/free15Gate.ts:142`.

**FATO CONFIRMADO / IMPLEMENTADO:** o painel existente usa `preview_start` do servidor para mostrar o começo de cada trecho do vídeo contínuo; layout, textos e estilos permanecem os mesmos. O caminho efetivo de vídeo é `/api/free-redo/film`; `/api/regenerate-scene` edita descrição/prompt via OpenAI e não submete vídeo à fal. Fontes: `components/video/SceneRedoPanel.tsx:235`, `lib/cinematic/refazerCena.ts:124`, `app/api/free-redo/film/route.ts:105` e `app/api/regenerate-scene/route.ts:98`.

**TESTADO LOCALMENTE / comparação visual — 29/10/2026:** `docs/kling4-trial-2810/redo-preview.html` contém antes/depois do painel Kling em desktop/mobile, com os estilos e textos existentes. `redo-desktop.png` e `redo-mobile.png` foram renderizados pelo Edge local e inspecionados. A arte das cenas é ilustrativa, identificada no HTML; não é render real nem prova do sincronismo do fornecedor.

**QUESTÃO PENDENTE / DESCONHECIDO:** ainda falta o canário real do Claude. Claims anteriores sem `scene_plan` seguro não inventam intervalos/stills e não ganham a oferta virtual. Não foi feita nova migração, chamada paga, escrita em produção ou publicação neste complemento.

**TESTADO LOCALMENTE — 29/10/2026:** bateria Node com 75 testes aprovada, incluindo a suíte de refação que executa 18 verificações funcionais internas com banco/fornecedores falsos e HMAC real. Cobre Seedance sem Kling, intervalo/still, duas refações, concorrência, adulterações, colisões de fonte assinada, retomada do elo, gate automático por intervalo, duração bruta, miniaturas, POST da tela e as duas rotas reais. As oito guardas novas de timing incluem uma fala longa e duas curtas, idiomas, ordem, piso/soma e payload/claim iguais. Fontes: `tests/kling4FreeRedo.test.mjs`, `tests/kling4TrialTiming.test.mjs` e `tests/kling4TrialRedoWiring.test.mjs`.

**TESTADO LOCALMENTE / regressões — 29/10/2026:** refazer-grátis (17), refazer-cena (17), meta95-refazer (23), gate (nove verificações de integração e nove mutantes rejeitados), todos aprovados. R1/R2 do guardião meta95 falhavam também em `e60fc31b1`, por projeções históricas anteriores à base aprovada; foram reancorados na igualdade dos arquivos completos dessa base, preservando hooks, idiomas, ausência de crédito e todas as demais verificações/mutantes. Não se alteraram os arquivos protegidos de compose e histórico. Fonte: `scripts/test-meta95-refazer-1910.mjs`, testes R1/R2.

**TESTADO LOCALMENTE — 29/10/2026:** typecheck completo após a última correção de fonte assinada: `tsc --noEmit --incremental false --pretty false`, exit 0. `git diff --check` limpo. Nenhum render pago ou acesso a produção foi necessário.

**SUGESTÃO / comandos de conferência do complemento:**

```powershell
node --test tests/kling4FreeRedo.test.mjs tests/kling4TrialRedoWiring.test.mjs tests/kling4TrialTiming.test.mjs tests/kling4Trial.test.mjs tests/kling4TrialAsync.test.mjs tests/kling4TrialFallbackClaim.test.mjs tests/kling4TrialNotice.test.mjs tests/kling4TrialAvailability.test.mjs
node scripts/test-meta95-refazer-1910.mjs
node scripts/test-refazer-gratis-2810.mjs
node scripts/test-refazer-cena-2710.mjs
node scripts/test-filme15-perfeito-2610.mjs
node scripts/test-filme15-gate-integration-2610.mjs
npx tsc --noEmit --incremental false
git diff --check
```

**Próximo passo recomendado — SUGESTÃO:** Claude revisar o novo SHA na mesma branch e usar o canário já previsto para conferir o casamento entre fala e cortes do Kling. Os testes provam a regra de refação e a matemática; não comprovam sincronismo ouvido/visto em um render real. A chamada paga e a publicação seguem fora desta execução.
