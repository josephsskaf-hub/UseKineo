# KINEO-ADS-ESCOLHA-2310

**DECISÃO DO FUNDADOR — 23/10/2026:** pessoa → cenário → quatro fotos → escolha humana → vídeo. Autorização desta tarefa: `[TRAVA 8.2 — vai do fundador 23/10 "vamos fazer igual"]`. Base de implementação: `36a5286aa9bc8aa16e8b4c72edc42fbf1d1ac7a7`. Sem publicação, PR ou render pago nesta entrega.

## O que estava errado e a correção

**EVIDÊNCIA DE PRODUÇÃO — relato do fundador, 23/10/2026:** o creme do pedido `694ff53e` recebeu nota 7, com mão invertida, duas identidades faciais e cenário/acabamento inadequados. O vídeo e o banco de produção não foram acessados nesta sessão; o relato é a evidência disponível.

**FATO CONFIRMADO / IMPLEMENTADO:** o fluxo novo exige um dos seis apresentadores aprovados e um dos seis cenários por categoria (nove categorias; `lib/ads/cena/escolhaCatalog.ts:9`). As quatro prévias permanecem em um pedido `planned`, antes do início e do débito de vídeo (`lib/ads/cena/internalEscolha.ts:49`). O juiz registra nota, motivos e defeitos de membros, articulações, dedos, mãos invertidas e joelhos; defeitos anatômicos ficam no fim da lista, sem veto (`lib/ads/cena/escolhaStills.ts:25`). A imagem escolhida pelo cliente é a referência de todas as tomadas. O caminho salvo de pedidos AJUSTE antigos e o código 9,5 são preservados.

**FATO CONFIRMADO / IMPLEMENTADO:** o anúncio novo tem duração fixa de 15 segundos e encerra dentro da cena escolhida. A fala é ajustada por frases inteiras antes da síntese; áudio narrado longo recebe uma tentativa menor antes do vídeo. Não se estica a duração nem se corta a fala para esconder um CTA incompleto. A oferta digitada aparece uma vez no fechamento sobre a cena. Skincare facial usa o próprio rosto. O enquadramento reserva uma faixa para legendas fora do rótulo; contorno e sombra reforçam a leitura, e a montagem aplica correção de contraste leve e música opcional baixa.

**DECISÃO DO FUNDADOR — complemento de 23/10/2026 / IMPLEMENTADO:** Product e UGC passam por três tomadas sequenciais: pessoa inteira e reconhecível usando o produto (0–5 s), plano médio (5–10 s), close do produto real em uso (10–15 s). Product mantém o produto como protagonista; UGC apresenta para a câmera. O modo explícito de voz permanece: `narrated` usa cena silenciosa e TTS; `talking` mantém uma única voz nativa. Não há montagem em quatro quadrantes. O Kling recebe `multi_prompt` com três durações de 5 segundos, `shot_type:"customize"`, sem `prompt` simultâneo nem referência final que force voltar ao aberto (`lib/ads/cena/escolhaVideo.ts:5`). Veo conserva 8+7 segundos úteis com aberto, médio e close descritos nos dois segmentos (`lib/ads/cena/escolhaPlan.ts:90`). A roupa vem da referência do apresentador e permanece na imagem escolhida.

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

**TESTADO LOCALMENTE — preenchido após congelar a fonte:** guardião `scripts/test-ads-escolha-2310.mjs`, mutantes comportamentais, desfaz integral mais novo primeiro, TypeScript e comparação da suíte completa contra a base. Os resultados e SHAs de evidência serão registrados aqui após os comandos reais.

**SUGESTÃO / PRÓXIMO PASSO RECOMENDADO:** após revisão e publicação pelo responsável, testar creme UGC PT e tênis product EN: conferir rosto, roupa, mãos e rótulo nas quatro fotos, escolher uma e avaliar o vídeo entregue de 15 segundos. Registrar se o vídeo corresponde à foto escolhida e dar nota visual ao acabamento. Esta sessão não publica nem executa esse teste pago.

**PREVIEW LOCAL:** [comparação visual antes/depois, desktop e mobile](previews/ADS-ESCOLHA-2310.html). Ilustrações e dados de demonstração não são vídeos de produção.

**BLOQUEADO / QUESTÃO PENDENTE — inspeção visual, 23/10/2026:** o navegador recusou a abertura `file://` pela política de URLs e proibiu contornos por outra superfície. O HTML autocontido foi preparado a partir do componente com estados simulados, mas não houve captura PNG nem inspeção visual automatizada. Não se apresenta esse artefato como aparência validada em navegador ou em vídeo real.
