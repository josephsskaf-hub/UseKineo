# KINEO-ADS-ESCOLHA-2310

**DECISÃO DO FUNDADOR — 23/10/2026:** pessoa → cenário → quatro fotos → escolha humana → vídeo. Autorização desta tarefa: `[TRAVA 8.2 — vai do fundador 23/10 "vamos fazer igual"]`. Base de implementação: `36a5286aa9bc8aa16e8b4c72edc42fbf1d1ac7a7`. Sem publicação, PR ou render pago nesta entrega.

## O que estava errado e a correção

**EVIDÊNCIA DE PRODUÇÃO — relato do fundador, 23/10/2026:** o creme do pedido `694ff53e` recebeu nota 7, com mão invertida, duas identidades faciais e cenário/acabamento inadequados. O vídeo e o banco de produção não foram acessados nesta sessão; o relato é a evidência disponível.

**FATO CONFIRMADO / IMPLEMENTADO:** o fluxo novo exige um dos seis apresentadores aprovados e um dos seis cenários por categoria (nove categorias; `lib/ads/cena/escolhaCatalog.ts:9`). As quatro prévias permanecem em um pedido `planned`, antes do início e do débito de vídeo (`lib/ads/cena/internalEscolha.ts:49`). O juiz registra nota, motivos e defeitos de membros, articulações, dedos, mãos invertidas e joelhos; defeitos anatômicos ficam no fim da lista, sem veto (`lib/ads/cena/escolhaStills.ts:38`). A imagem escolhida pelo cliente é a referência de todas as tomadas. O caminho salvo de pedidos AJUSTE antigos e o código 9,5 são preservados.

**FATO CONFIRMADO / IMPLEMENTADO:** o anúncio novo tem duração fixa de 15 segundos e encerra dentro da cena escolhida. A fala é ajustada por frases inteiras antes da síntese; áudio narrado longo recebe uma tentativa menor antes do vídeo. Não se estica a duração nem se corta a fala para esconder um CTA incompleto. A oferta digitada aparece uma vez no fechamento sobre a cena. Skincare facial usa o próprio rosto. O enquadramento reserva uma faixa para legendas fora do rótulo; contorno e sombra reforçam a leitura, e a montagem aplica correção de contraste leve e música opcional baixa.

**DECISÃO DO FUNDADOR — complemento de 23/10/2026 / IMPLEMENTADO:** Product e UGC passam por três tomadas sequenciais: pessoa inteira e reconhecível usando o produto (0–5 s), plano médio (5–10 s), close do produto real em uso (10–15 s). Product mantém o produto como protagonista; UGC apresenta para a câmera. O modo explícito de voz permanece: `narrated` usa cena silenciosa e TTS; `talking` mantém uma única voz nativa. Não há montagem em quatro quadrantes. O Kling recebe `multi_prompt` com três durações de 5 segundos, `shot_type:"customize"`, sem `prompt` simultâneo nem referência final que force voltar ao aberto (`lib/ads/cena/escolhaVideo.ts:5`). Veo conserva 8+7 segundos úteis com aberto, médio e close descritos nos dois segmentos (`lib/ads/cena/escolhaPlan.ts:102`). A roupa vem da referência do apresentador e permanece na imagem escolhida.

**FATO CONFIRMADO / IMPLEMENTADO:** os cenários têm direção aspiracional e prévias distintas, incluindo orla ao nascer do sol, pista e rua noturna para calçados, banheiro com luz natural/penteadeira para skincare e noite elegante para perfume. O clima musical é configurado no cenário, com ganho aproximado de −18 dB sob a voz. A montagem mantém cada visual de cena em tela cheia; nome, oferta e CTA usam trilhas separadas sobre o último plano (`lib/ads/cena/escolhaMontage.ts:45`). O texto não é renderizado dentro das imagens geradas.

**QUESTÃO PENDENTE / DESCONHECIDO:** referências, prompts e composição não garantem anatomia perfeita, identidade ou fidelidade de rótulo em todos os quadros de um modelo generativo. A escolha humana serve justamente para revisar as quatro imagens antes do vídeo. Qualidade final, leitura real de legendas, cor, música e continuidade ainda exigem o teste visual posterior autorizado pelo fundador.

## O que os concorrentes fazem

**FATO DOCUMENTAL — fontes oficiais consultadas em 23/10/2026:** a [HeyGen](https://help.heygen.com/en/articles/12704854-product-placement-combine-a-product-with-an-avatar-in-a-video) documenta combinar avatar e produto, gerar quatro imagens e escolher uma antes do vídeo. A própria documentação limita a adequação a produtos pequenos ou de mão; não comprova fidelidade universal. A [Pippit](https://www.pippit.ai/tools/product-in-hand) também descreve prévias da pessoa com produto e seleção antes da geração final. A [Higgsfield](https://higgsfield.ai/blog/mcp-for-marketers) recomenda iterar na referência antes do gasto maior em vídeo. São práticas e descrições dos fornecedores, sem prova independente de conversão ou de nota visual.

**DECISÃO DE IMPLEMENTAÇÃO:** adaptar a seleção humana de imagem ao motor AJUSTE já existente, usando os apresentadores aprovados da Kineo. Não trocar fornecedor nem criar cobrança. As prévias dos cenários são ilustrações identificadas; somente as quatro imagens retornadas pelo fornecedor são apresentadas como fotos geradas.

**FATO DOCUMENTAL:** a pesquisa começou pelo Stripe Directory conforme a skill disponível. O CLI exigido não estava instalado e não havia ferramenta de busca Directory conectada; suas instruções públicas não documentam busca HTTP equivalente. A comparação acima foi feita diretamente em fontes oficiais, sem instalar serviço, autenticar ou contratar fornecedor.

## Contratos e limites

**FATO CONFIRMADO / IMPLEMENTADO:** `/api/admin/ads-cena` mantém autenticação de admin e lista interna. `/api/ads/v2/cena` serve a mesma máquina ao Studio Ads autenticado, apenas para a lista interna e `ADS_CENA_LIVE='internal'`. Pedidos de outras contas, apresentadores fora da lista, cenários inválidos e IDs de imagem que não pertencem ao pedido não iniciam vídeo.

| Etapa | Corpo além dos dados do produto | Resultado |
|---|---|---|
| Planejar | `stage:"plan"`, `presenter_id`, `scenario_id`, `category`, foto/frase/idioma/formato/modo de voz | Plano e `order_id`; sem vídeo ou débito. Com `dry_run:true`, também sem persistência ou mídia. |
| Quatro fotos | `stage:"stills"`, `order_id` | Inicia/consulta as quatro imagens. Repetir enquanto `stage:"stills"`; `stage:"choose"` traz quatro URLs, notas e motivos. Sem débito de vídeo. |
| Escolher | `stage:"choose"`, `order_id`, `still_id` | Salva uma escolha explícita, sem iniciar ou debitar. |
| Renderizar | `stage:"render"`, `order_id`, `still_id` | Salva a escolha e usa o `/start` existente. O mesmo ID pode ser repetido sem novo débito. Depois acompanha o `status_url` existente. |

**FATO CONFIRMADO / IMPLEMENTADO:** cada intenção de imagem é persistida antes do envio. Um envio sem recibo não é repetido; falha confirmada permite uma nova tentativa. Provedor indisponível ou ausência de mídia é erro técnico distinto de ressalva visual. A escolha já confirmada fica travada para impedir que chamadas concorrentes renderizem uma imagem diferente da aprovada.

**FATO CONFIRMADO / TESTADO LOCALMENTE:** o caminho normal retorna quatro fotos. Se o fornecedor falhar em uma opção mesmo após a repetição limitada, o fluxo espera as demais e mantém as imagens disponíveis para escolha, com aviso visível do número retornado; não abandona três fotos prontas por causa da quarta. Ausência total de imagens continua sendo falha técnica sem débito de vídeo. Um recibo tardio é recuperado antes de desistir do envio ambíguo, sem repetir o POST. A oferta usa comparação de tokens com caixa e pontuação normalizadas, preservando moeda/percentual para não confundir dose com preço.

**FATO DOCUMENTAL:** o endpoint de edição permanece [fal-ai/nano-banana-pro/edit](https://fal.ai/models/fal-ai/nano-banana-pro/edit/api), com `image_urls` do produto e do apresentador, uma imagem por chamada. O vídeo reutiliza os [adaptadores existentes](../lib/ads/cena/adapters.ts), incluindo [Kling 3 Pro image-to-video](https://fal.ai/models/fal-ai/kling-video/v3/pro/image-to-video/api). Os campos de sombra e `color_filter:"contrast"` estão documentados no [RenderScript da Creatomate](https://creatomate.com/docs/api/render-script/element-properties). Consulta em 23/10/2026; nenhum endpoint foi executado nesta entrega.

**FATO CONFIRMADO:** preço, tabela de créditos, ledger e política de estorno não foram alterados. A etapa de prévias tem custo de fornecedor quando executada em produção, embora não debite vídeo. Não há cotação/fatura nova validada nesta sessão, nem promessa de custo final total.

## Provas e próximo passo

**TESTADO LOCALMENTE — 23/10/2026:** fonte do produto congelada em `c6ca52927789966045fb6198cafefa29530c5d43`; reancoragens de testes em `790d5bebf9ff0d612278f22952e08cd448afbb84`, sem alteração posterior de TS/TSX. Os testes usam dublês de GPT, fal, voz, música, armazenamento, pedidos e débito. Não houve chamada paga, consulta ao banco, leitura de `.env`, build ou deploy.

| Prova | Resultado observado |
|---|---|
| Guardião ESCOLHA | `scripts/test-ads-escolha-2310.mjs`: 39 mutantes comportamentais ficam vermelhos, 29 provas da tela passam; mutantes com erro de sintaxe/importação não contam como detecção. Passou na execução completa e no controle final. |
| Desfaz exato | 14 arquivos existentes voltam integralmente à base; 16 arquivos novos enumerados. Hashes, CRLF, idempotência e fonte adulterada conferidos. A camada ESCOLHA é removida antes de Texto e das camadas antigas. |
| TypeScript | `node node_modules/typescript/bin/tsc --noEmit --incremental false --pretty false`: saída 0, sessão 83810. Os 1.839 inputs são equivalentes à fonte congelada e às reancoragens finais; não se declara outra execução do compilador. |
| Suíte | 996 scripts: **847 verdes / 149 vermelhos herdados**, sem vermelho novo, sem alteração de checks vermelhos ou cabeçalhos de erro frente à base efetiva. Guardas e timeouts externos: zero. |
| Isolamento | Quatro leitores e sete testes que alteram fonte executados em fase serial; arquivos restaurados byte a byte, inclusive CRLF. Cinco avisos recuperáveis de checkpoint EPERM mantidos nos journals; nenhum resultado perdido. |
| Preservação | 111 arquivos protegidos e os 16 arquivos existentes do motor Cena 9,5 iguais à base. Preço, cobrança e estorno não alterados. |

**FATO CONFIRMADO / PROVENIÊNCIA DAS PROVAS:** a execução completa real dos 996 scripts ocorreu em `c6ca5292`, em 926.612 ms. Após os três paths de reancoragem, os quatro controles `test-ads-nota9-2110`, `test-ugc-ajustes-2010`, `test-ads-escolha-2310` e `test-ads-cena-texto-2310` foram executados novamente em `790d5beb`, em janela própria de 144.437 ms. O resultado final combina esses recibos por script e comprova a equivalência dos demais inputs; não representa uma segunda execução integral. Nota9 passou; P3 do UGC passou, M12 continuou sensível e a única falha restante do UGC é herdada.

**FATO CONFIRMADO / PROVENIÊNCIA DA BASE:** a base efetiva tem 995 scripts, 846 verdes / 149 vermelhos. Reutiliza 993 resultados reais de `b8ba625b5a5bb8f485aa9353dfb0267a04d4aaef` e dois controles de contexto Git executados na base `36a5286aa`; a diferença entre essas bases é documental, com 1.829 inputs antigos iguais, referências e consultas Git conferidas. Não se declara uma nova execução completa nem um novo compilador na base. Recibo `base36-reuse-receipt.json`, SHA256 `895c44fa79a6f0210bd6ac2a81e21af6eeb065b25f65d10bebe6229bc515bbca`.

**FATO CONFIRMADO / RECIBOS LOCAIS:** preservados em `.claude/ads-escolha-proof-2310/` do checkout original. Comparação: `ads-escolha-final-effective-790d5beb-comparison.json`, SHA256 `5d3ce4d431a5b7471c9e11d734452bee4983b23ad8a844b9494929931064c838`. Rodada composta: `ads-escolha-final-effective-790d5beb-round.json`, SHA256 `0525344c28c5858ddb9c694f9e8c5a5a066d11f4b84699947fd4f5639d05f1b1`. Equivalência do compilador: `ads-escolha-final-delta-790d5beb-tsc-source-equivalence.json`, SHA256 `797ac6f6ff2b0c6472f08afee615872e10a9a9c3696aaa0ae6cec196fd201fd7`.

**FATO CONFIRMADO / AUDITORIA DOS LOGS:** 697 checks vermelhos e 88 cabeçalhos de erro compartilhados permaneceram iguais. As diferenças de 41 corpos e um payload foram revisadas sem caso inexplicado: PIDs de avisos, diretório da mesma guarda, inventários observados, amostra de UUID, diagnóstico TS2307 em diretório temporário e fixture Git/CAS esperada. O diagnóstico TEMP recebeu controle pontual separado; os dumps originais truncados permanecem preservados e não foram apresentados como recuperados. Recibo `review-escolha-bodies.json`, SHA256 `0f25cd5125b86384ad33ff8e4877f95e046a201132537374f9e3793f0e08dd84`.
**FATO CONFIRMADO / REVISÃO LOCAL:** a revisão React conferiu importação sob demanda restrita à conta interna, armazenamento versionado por usuário/workspace, limpeza de efeitos e requisições, trava de envio concorrente e controles com rótulos/foco de teclado (`app/(dashboard)/ads/v2/AdsV2Escolha.tsx:39`). A rota identifica o usuário no servidor e os pedidos são filtrados pelo seu dono (`app/api/ads/v2/cena/route.ts:17`; `lib/ads/cena/internalEscolha.ts:55`), seguindo o contrato documentado de [getUser](https://supabase.com/docs/reference/javascript/auth-getuser). Consulta documental em 23/10/2026; autorização e concorrência foram exercitadas só com dublês, sem validar configuração de produção.

**FATO CONFIRMADO / INTEGRAÇÃO — 23/10/2026:** `git fetch origin` confirmou `origin/main` em `36a5286aa9bc8aa16e8b4c72edc42fbf1d1ac7a7`; `git merge origin/main` retornou `Already up to date`. A árvore de trabalho da tarefa é isolada da árvore original compartilhada.

**SUGESTÃO / PRÓXIMO PASSO RECOMENDADO:** após revisão e publicação pelo responsável, testar creme UGC PT e tênis product EN: conferir rosto, roupa, mãos e rótulo nas quatro fotos, escolher uma e avaliar o vídeo entregue de 15 segundos. Registrar se o vídeo corresponde à foto escolhida e dar nota visual ao acabamento. Esta sessão não publica nem executa esse teste pago.

**PREVIEW LOCAL:** [comparação visual antes/depois, desktop e mobile](previews/ADS-ESCOLHA-2310.html). Ilustrações e dados de demonstração não são vídeos de produção.

**BLOQUEADO / QUESTÃO PENDENTE — inspeção visual, 23/10/2026:** o navegador recusou a abertura `file://` pela política de URLs e proibiu contornos por outra superfície. O HTML autocontido foi preparado a partir do componente com estados simulados, mas não houve captura PNG nem inspeção visual automatizada. Não se apresenta esse artefato como aparência validada em navegador ou em vídeo real.
