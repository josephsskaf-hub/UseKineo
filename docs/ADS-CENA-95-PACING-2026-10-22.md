# KINEO-ADS-CENA-95-PACING-2110

**EVIDÊNCIA DE PRODUÇÃO — relato do fundador/Cowork, 22/10/2026, 14:40.** Na main `2b2ea9397`, creme UGC/PT teve dry_run 0/4; tênis Product/EN teve dry_run 2/3 e pedido real 0/3. A resposta informada foi502 `cena_plan_failed`, com reason `cena95_speech_pacing`. As respostas literais do GPT não foram fornecidas; as novas fixtures longas são representativas, não transcrições de produção.

**FATO CONFIRMADO — problema reproduzível na base.** O parser da base recusava fala fora de39–42 palavras e ganchos fora da régua, dependendo de outra resposta do GPT para corrigir. Esse contrato não garantia que o pedido seguinte coubesse. A correção passa a ajustar o texto recebido em código: `lib/ads/cena/script95Repair.ts:62`, `lib/ads/cena/script95.ts:14`.

**FATO CONFIRMADO — IMPLEMENTADO.** O orçamento editorial é conservador por idioma: PT2,25pal/s, ES2,4pal/s e EN2,6pal/s, com pausa de0,35s antes do CTA. São parâmetros de planejamento, não velocidades medidas da voz (`lib/ads/cena/speech95Policy.ts:3`). Não há mínimo de palavras a preencher. Frases inteiras de demonstração, dor e, se necessário, benefícios saem do meio até caber; nunca se corta uma frase para atingir a contagem. O plano registra frases retiradas, benefícios omitidos e ganchos originais. Oferta digitada e CTA digitado ficam protegidos; ganchos inválidos são substituídos por alternativas completas e curtas antes da seleção.

**FATO CONFIRMADO — contrato implementado, autorizado pelo fundador nesta tarefa em22/10/2026.** Recusar por duração apenas quando o núcleo obrigatório não couber sozinho. Nesse caso, a rota devolve422 `cena95_required_speech_does_not_fit`, com explicação, antes de gravar pedido ou cobrar (`lib/ads/cena/internal.ts:59`). Autenticação, segurança, entrada inválida e falhas reais dos fornecedores continuam tendo suas próprias recusas.

**FATO CONFIRMADO — IMPLEMENTADO.** Direções visuais/vocais reconhecíveis são retiradas da fala opcional do GPT; os benefícios são reconstruídos somente a partir dos fatos de entrada, com sujeito/verbo, maiúscula e pontuação. Oferta imperativa não recebe outro imperativo na frente. CTA digitado é preservado, inclusive um verbo como “Veja” ou um qualificador como “[Pro]”; não passa pelo filtro de instruções do GPT. `visualDirectionOnly` fica separado no pedido de roteiro (`lib/ads/cena/plan95.ts:44`). Regras de números, alegações e clichês continuam no parser; instruções de cena não ganham autorização para virar promessa de produto.

**FATO CONFIRMADO — IMPLEMENTADO.** Product usa uma tabela de planos próximos por categoria, com produto inteiro, mãos/antebraços/pés pertinentes e roupa contínua; não herda o `athlete_demo` de UGC. UGC preserva a cena humana. Product/talking mantém a boca recortada como contexto secundário; Product/narrated permite rosto fora do quadro. O juiz exige produto protagonista e ausência de corpo inteiro nesses planos, mantendo anatomia, fidelidade e roupa (`lib/ads/cena/composition95.ts:19`, `:78`; `lib/ads/cena/pipeline95.ts:32`). Planos antigos sem a nova composição mantêm seu contrato original.

**FATO CONFIRMADO — IMPLEMENTADO.** Um preflight puro verifica roteiro canônico, requisição de voz, divisão nativa e legenda durante o planejamento, antes da divisão dry/live. O start reutiliza o mesmo preflight antes do débito; preparação da voz e montagem também o chamam (`lib/ads/cena/preflight95.ts:12`; `lib/ads/v2StartCore.ts:81`; `lib/ads/cena/finish95.ts:23`; `lib/ads/cena/runtime95.ts:84`). Nunca se reinterpreta o roteiro canônico como JSON bruto, o que duplicaria a oferta.

**FATO CONFIRMADO — diferença de gates corrigida.** O real moderava a narração gerada depois do ponto em que o dry_run retornava. Agora a narração passa pelo mesmo gate antes da bifurcação (`lib/ads/cena/internal.ts:42`). O veredicto é reutilizado somente dentro daquela requisição autenticada, inclusive indisponibilidade/recusa; não existe token de aprovação no body ou banco (`lib/ads/cena/moderation95.ts:5`; `app/api/admin/ads-cena/route.ts:23`). O start público continua moderando por padrão. Indisponibilidade permanece503; bloqueio permanece422.

**FATO CONFIRMADO — IMPLEMENTADO.** Texto nativo pode continuar através de um corte sem perder palavras ou recusar apenas porque o CTA atravessa a fronteira. A pausa é indicada no segmento em que começa o CTA (`lib/ads/cena/adapters95.ts:7`). Um núcleo muito curto pode deixar uma tomada lógica sem palavras: nessa tomada o prompt explicita silêncio e o juiz exige boca fechada, conservando fala nos demais segmentos. O áudio agregado mantém a mesma composição. Legendas preservam o padrão existente; um token excepcionalmente longo é paginado por grafemas, sem diminuir fonte, perder caracteres ou recusar o plano (`lib/ads/cena/captions95.ts:102`). Sílabas continuam sendo uma estimativa de alinhamento, não medição de áudio. O layout final também passa no preflight com o nome classificado; nomes excepcionais recebem paginação quando o layout anterior não comporta o texto. Colchetes de nome/oferta/CTA ficam literais no display, sem alterar a fala (`lib/ads/cena/montage95.ts:72`).

**FATO CONFIRMADO — escopo.** Base `2b2ea93971ca7fef45ec1bfa46d94d48281bd934`. Continua restrito a admin, conta da casa e `ADS_CENA_LIVE='internal'`. Sem alteração de preço, créditos, tabelas de tarifas, cobrança ou estorno. Sem diff em `lib/engineWall.ts` e `lib/homeVideoCuration.ts`. Sem uso de arquivos de credenciais, chamada paga, banco, render, PR ou deploy nesta tarefa. O desfaz encadeia esta camada antes de BUG1, roteiro curto e Ads95; snapshots são exatos e divergência de fonte é recusada.

**QUESTÃO PENDENTE / DESCONHECIDO.** Não foi validado o tempo da voz real, obediência do GPT, qualidade de vídeo, aparência das legendas renderizadas, anatomia em movimento ou resultado em produção. Mesmos gates não congelam o resultado de dois pedidos GPT independentes. Duração e alinhamento medidos só existem depois do TTS; são verificados antes dos vídeos de pessoa. Falhas de mídia continuam no caminho de falha/estorno existente.

**SUGESTÃO — próximo passo recomendado.** Depois da revisão e publicação autorizadas em outra rodada, repetir os pedidos literais do Cowork e conferir plano, fala, frases removidas e enquadramento. Depois, validar a duração medida e o anúncio final. O avanço aqui deve ser classificado como implementado/testado offline, não como qualidade audiovisual validada.

**QUESTÃO PENDENTE — documento histórico.** O caminho solicitado anteriormente `docs/ESTUDO-LIDERES-ANUNCIOS-PRODUTO-UGC-2026-10-21.md` não existe na base desta tarefa. Foram consultados o estudo disponível de16/10 e `docs/ADS-QUALIDADE-2026-10-21.md`; não se alega ter lido as seções7/8 do arquivo ausente.


**TESTADO LOCALMENTE — provas concluídas em22/10/2026.** O novo `scripts/test-ads-cena-95-pacing-2110.mjs` executa POST, `cenaJson`, planejador e start reais com transportes, banco e ledger dublados. As duas fixtures longas PT/EN têm três ganchos curtos válidos e reproduzem `cena95_speech_pacing` na base; passam após o reparo. Também prova CTA/oferta protegidos, frases de benefícios, direções removidas, moderação e cache por requisição, nove categorias nos dois modos, juiz de rosto/mãos, palavra longa, texto final, silêncio nativo e voz medida antes de vídeo. São32mutantes reais, com sintaxe válida e falha por asserção; erro de importação/sintaxe não conta como mutante detectado. O desfaz final cobre22fontes existentes e declara os10arquivos novos.

**TESTADO LOCALMENTE — suíte inteira e deltas identificados.** Baseline imutável `2b2ea93971ca7fef45ec1bfa46d94d48281bd934`; rodada integral em `b5c86aae73eacee45507c55dd7cb7238a3fb52d5`; correção exclusiva de guardião/metadata em `2b61b9f5f771f43b49e37acc492920478804f21c`. Não houve uma segunda execução dos988 no último SHA. O consolidado retém983resultados integrais e incorpora cinco execuções reais dos guardiões afetados na segunda snapshot. O commit posterior altera somente este relatório.

| Execução | Scripts | Verdes | Vermelhos |
|---|---:|---:|---:|
| Base2b, integral |987|838|149|
| b5c, integral bruta preservada |988|838|150|
| 2b61, deltas afetados |5|5|0|
| Consolidado integral + deltas |988|839|149|

**FATO CONFIRMADO — reancoragem estrita.** O único vermelho novo da integral foi4c de `test-moderacao-2026-09-25.mjs`: a varredura conta imports usados só como tipos, e os dois novos caminhos elevaram36para38. O ajuste exige os dois caminhos exatos, mantém a proibição de `use client` em todos e prova que os dois imports somem do JavaScript compilado; o guardião encerrou60/60. Os cinco deltas verdes foram `test-moderacao-2026-09-25.mjs`, `test-ads-cena-95-pacing-2110.mjs`, `test-ads-cena-2110.mjs`, `test-ads-cena-ajuste-2110.mjs` e `test-ads-qualidade-2110.mjs`.

**FATO CONFIRMADO — resultados dos recibos.** `newRed=[]`, `changedRedChecks=[]`, `fixed=[]`: os149scripts ainda vermelhos são os mesmos da base, com os mesmos checks; não se apresenta a suíte como totalmente verde. Foram comparados987logs compartilhados e71cabeçalhos de exceção de cada lado, sem exceção adicionada/removida. Guardas offline e timeouts externos:0. Os sete testes que mutam fontes terminaram com código0, zero reparos de bytes e snapshots limpas. O grupo focado preservou157mutantes históricos e detectou os32novos; essa não é uma contagem global do repositório. O desfaz anterior do roteiro curto manteve725verificações.

**TESTADO LOCALMENTE — tipos e igualdade.** `tsc --noEmit --incremental false` passou na base e na snapshot integral b5c. Depois da reancoragem MJS, a prova comparou5606arquivos rastreados: somente o guardião de moderação e seu JSON de desfaz mudaram; os outros5604blobs são iguais. Também conferiu1845arquivos reais TS/produto/config byte a byte. O resultado TSCb5c foi reutilizado por essa igualdade, sem alegar outro compilador no2b61.

**FATO CONFIRMADO — arquivos e custos.** `git diff 2b2ea9397 2b61b9f5 --name-only` contém32arquivos:19de produto (17em `lib/ads/cena/`, a rota admin e `lib/ads/v2StartCore.ts`), nove de provas/fixtures, três de desfaz e este relatório. Não foram adicionadas dependências, endpoints ou tarifas, nem proposta de preço. Créditos, cobrança e estorno conservam o caminho existente. A paginação excepcional garante representação do texto; sua legibilidade em vídeo de dois segundos não foi validada com render.

**FATO CONFIRMADO — recibos locais auditáveis.** Pasta `.claude/ads-cena-95-pacing-proof-2210/` na árvore principal do repositório. Brutos, stdout/stderr, inventários, tentativas e comparadores originais da base permanecem preservados. O consolidado declara `wholeSuiteRunAtFinalCommit:false` e a proveniência de cada linha. SHA-256 conferidos:

| Recibo | SHA-256 |
|---|---|
| `ads-cena-95-pacing-origin-main-round.json` | `e7fe9030e899153bb8f0b0f2bd4d55c91d1ccece55e76d372970bc07086ae15a` |
| `ads-cena-95-pacing-final-b5c-round.json` | `804f38fb2c809397114eae5a4f22e19167d2ab44d875f124aa25347267b43786` |
| `ads-cena-95-pacing-final-2b61-deltas.json` | `8ce536ada6f05d3384101e7e6530149df8b1c3eddcc79237ed0c9f3993230b44` |
| `ads-cena-95-pacing-final-2b61-round.json` | `a2677cb5d933df46ce7b9b0187e524bf5d3d895c27bb3df2b3d4bb0e6f5daef1` |
| `ads-cena-95-pacing-final-2b61-comparison.json` | `2b9339f41e4e8b3d7b15c4c425b739fea237c1496983054e5d900824c5a23772` |
| `ads-cena-95-pacing-final-2b61-exceptions.json` | `2f96baacf00adc81dfb82adda71ea20d75ba40cec2ecccfb43e4c623c6d33b3d` |
| `2b61-source-equality-proof.json` | `ddf2c085aa773ee8230886d9dadfa7f462525b0b76ecbd2f71af65209a759334` |
| `ads-cena-95-pacing-final-2b61-summary.json` | `167afdce00a0d8835006ee527e91eb0bc4f6d5652c6414807d924fe98e596a90` |
