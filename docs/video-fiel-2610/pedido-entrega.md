# Entrada fiel — 26/10/2026

DECISÃO APROVADA: Joseph pediu correção da geração e do juiz; foco no filme curto de entrada. Esta peça não muda oferta, preço, crédito concedido, motor ou tela. Base: `9d8d3fad413d94798081528dbd61f3ba7848a76a`.

IMPLEMENTADO:

- Pedido de produção numa linha, incluindo português, é reconhecido sem depender de duas quebras de linha. Roteiro com fala rotulada, diálogo, aspas ou marcadores continua preservado. O parser não substitui nem apaga o texto.
- `reviewRequestFidelity` retorna revisão 422 nas três entradas: `brief_requires_review` quando o texto é pedido e a pessoa não escolheu IA; `request_duration_mismatch` quando o brief pede 50/60 s e a duração efetiva é menor. O corpo fica intacto, `charged:false`, `retryable:false`. A saída é editar a narração/pedido ou escolher explicitamente IA/duração; nenhum render automático.
- O escritor não transforma verbatim em IA. Dois caminhos antigos de conversão silenciosa (brief sem fala em Kineo1 e tour narrado) agora exigem revisão explícita.
- Mensagens de revisão em português, espanhol e inglês; `fraseDoQueNaoDamosConta` aceita segundo argumento de idioma, com inglês como padrão. A integração desse argumento nas chamadas TSX pertence ao root.
- Contexto do descritor inline ampliado de 200 para 12000 caracteres, mesmo teto da rota, sem nova chamada.
- Consome `completeSceneDescriptions.reviewRequired?: number[]` (índices zero-based, contrato do agente de cenas). Essa etapa é **depois do débito existente**: confirma devolução, libera claim somente quando confirmada e interrompe antes do despacho de vídeo. Responde422 com devolução confirmada,503 se pendente, sem prometer devolução não comprovada. O helper de cenas chega por integração separada; na base ele não emite esse campo.

TESTADO LOCALMENTE, sem rede, credenciais, banco ou modelo:

- `node docs/video-fiel-2610/pedido-test.mjs`: 19 grupos de provas comportamentais; módulos reais, guardas extraídas por AST das três rotas, preservação de entrada, duração, localização, fallback/refund confirmado e pendente, mutante de bypass.
- `test-brief-e-ideia-colada-2026-09-12.mjs`: 44/44.
- `test-diretrizes-coladas-2026-09-04.mjs`: 61/61.
- TypeScript `--noEmit --incremental false`: passou na árvore desta peça.
- Diff verificado com `core.whitespace=cr-at-eol`, pois scriptParser já é rastreado com CRLF.

LIMITES: detector determinístico conservador, sem promessa de reconhecer toda língua/paráfrase. As provas de rota executam os blocos reais de guarda e verificam sua ordem no arquivo; não são E2E autenticado. Nenhum dado integral dos dez clientes entrou no repositório. A média editorial5,7 não é alvo numérico nem rubrica automática. Integração de cenas/juiz, guardiões históricos e validação completa ficam no root. Não publicado nem validado em produção.


## Bordas encontradas pela revisão independente — segundo lote

FATO CONFIRMADO / IMPLEMENTADO: o leitor anterior só reconhecia duração com unidade (segundos/minutos), deixando passar pedidos como “vídeo de1:00” com seleção de15s. Agora mm:ss exige contexto adjacente de filme/duração; horário da história (3:00), formato9:16 e segundos inválidos não viram duração. O primeiro pedido explícito continua prevalecendo. Nenhuma duração ou modo é alterado.

FATO CONFIRMADO / IMPLEMENTADO: HOOK/Pexels posterior não isenta uma instrução inicial que sobrevive na narração real do parser. O detector consulta o parser puro somente nessa borda; preserva roteiros rotulados/aspas quando a fala foi corretamente isolada. Texto original continua intacto.

TESTADO LOCALMENTE:19 grupos no pedido-test (incluindo os3 casos reproduzidos pelo root, guardas reais das3 entradas, relógio/proporção e3 mutantes comportamentais);44/44 de brief e61/61 de diretrizes. TypeScript sem emissão passou. Nenhum render, banco, rede, publicação ou gasto.
