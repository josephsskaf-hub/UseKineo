# Wan 3.0 no filme narrado com personagem fixo

**SUGESTÃO · decisão da CEO, 19/11/2026.** Priorizar o controle H3 Turbo com edição da folha por cena. Guardar Wan para um ensaio interno de continuidade. Para 60 s a 35 créditos no Studio, a contribuição parcial do cenário abaixo é **−US$ 1,77 com Wan**, contra **+US$ 0,02 com H3** e **−US$ 5,19 com Kling** (valores exatos na tabela). A qualidade final com voz, legenda e montagem continua em aberto nos três casos.

## O que a comparação mediu

**EVIDÊNCIA DE PRODUÇÃO · playground, 17/11/2026.** Mesma imagem do personagem da casa, mesmo roteiro vertical de 20 s em quatro planos. Kling 4 custou US$ 3,14 e levou 163 s. Wan custou US$ 1,80 e levou 438 s. A CEO viu o mesmo homem e a ordem pedida em oito quadros de cada vídeo. Joseph preferiu ligeiramente o Kling. Foram duas execuções individuais. Os tempos incluem a espera observada até o arquivo. O tempo exclusivamente em fila e os percentis seguem desconhecidos. [Régua e arquivos do ensaio](C:/kineo/docs/revisoes/motores-1711/REGUA-KLING4-X-WAN3.md)

**EVIDÊNCIA DE PRODUÇÃO · playground, 18/11/2026.** Em outro roteiro de 30 s, a Kineo animou dois primeiros quadros editados a partir da mesma folha. Cada edição custou US$ 0,15 e cada clipe H3 Turbo de 15 s custou US$ 0,45. O subtotal desse braço foi US$ 1,20. A tira manteve rosto e roupa nas seis ações amostradas. A contagem de edições foi duas. No modelo de margem abaixo, cada cena de 5 s ganha uma edição própria. [Registro local e imagens](C:/kineo/docs/revisoes/motores-1711/custo-minimo-1811)

## Contrato do fornecedor

**FATO CONFIRMADO · consulta em 19/11/2026.** A página do modelo e o OpenAPI da fila fal identificam `alibaba/wan-3.0/reference-to-video`. As opções abaixo pertencem a esse endpoint. [Modelo e tarifas](https://fal.ai/models/alibaba/wan-3.0/reference-to-video) · [OpenAPI](https://fal.ai/api/openapi/queue/openapi.json?endpoint_id=alibaba%2Fwan-3.0%2Freference-to-video) · [Campos e fila](https://fal.ai/models/alibaba/wan-3.0/reference-to-video/api)

| Campo do Wan | Consequência para a integração |
|---|---|
| `prompt` único, até 20.000 caracteres | Numerar os planos e suas ações no texto. Cortes e durações individuais ficam sujeitos à geração. O contrato não expõe `multi_prompt` nem quantidade garantida de planos. |
| `reference_image_urls`, até 10 | Identificar a imagem do protagonista como `Image 1`. O ensaio de custos usa uma única folha. |
| `reference_video_urls` e `reference_audio_urls` | Até cinco arquivos de cada tipo e até 15 s no total por tipo. Vídeos precisam de pelo menos 16 fps e seu tempo também é faturado. |
| `duration` de 2 a 30 s, padrão 5 | Fixar o inteiro no pedido. Para 60 s, planejar dois blocos de 30 s com a mesma folha e verificar o corte entre blocos. |
| `resolution` de 480p, 720p ou 1080p, padrão 1080p | Preço por segundo de saída com referência de imagem de US$ 0,05, US$ 0,10 ou US$ 0,20, respectivamente. Pedir 720p explicitamente. O ensaio de 20 s foi cobrado abaixo dos US$ 2,00 da tabela. |
| `aspect_ratio`, `audio`, `seed` | Pedir 9:16. O áudio gerado vem ligado por padrão e pode incluir fala. No filme narrado, pedir `audio:false` para montar a locução da Kineo. Fidelidade de palavras e sincronização da fala nativa permanecem sem ensaio. |
| `file_url`, `web_url`, `enable_thinking` | Documento ou página pública como referência direta exigem o modo de raciocínio. Essa entrada não aparece nos contratos comparados do Kling 4 Reference nem do H3 Max Turbo Image. É uma capacidade exclusiva nesta comparação, com pouco valor imediato para um elenco já definido. |
| `enable_prompt_expansion`, `enable_safety_checker` | Controlar a reescrita no ensaio para comparar a ordem dos planos. Preservar a moderação padrão. A resposta inclui vídeo, duração, seed e pode trazer o prompt reescrito. |

**FATO CONFIRMADO · comparação de contratos.** O Kling 4 oferece instrução e duração por plano, referências visuais e vozes vinculadas. A tarifa de 720p para referência apenas de imagem é US$ 0,157/s. O H3 Max Turbo aceita primeiro e último quadros e trilha de áudio. A estratégia da Kineo obtém o primeiro quadro por edição da folha. Na tabela da fal vigente desde 16/11, o vídeo H3 a 768p custa US$ 0,04/s. A edição padrão Nano Banana Pro custa US$ 0,15 por imagem. Gerar a partir de uma referência humana é possível nas três estratégias. O teste da casa ainda não demonstrou superioridade do Wan nessa tarefa. [Kling 4](https://fal.ai/models/kling/v4/reference-to-video/api) · [Tarifa Kling](https://fal.ai/models/kling/v4/reference-to-video) · [H3 Turbo](https://fal.ai/models/minimax/h3-max-turbo/image-to-video) · [Contrato H3](https://fal.ai/models/minimax/h3-max-turbo/image-to-video/api) · [Edição](https://fal.ai/models/fal-ai/nano-banana-pro/edit)

**FATO CONFIRMADO · uso de rostos, 19/11.** A página do modelo indica uso comercial. A política da fal proíbe violação dos direitos de imagem e voz e personificação comercial ou prejudicial sem consentimento. Para o ensaio, usar o personagem da casa com direitos documentados ou um personagem fictício. Consentimento e direito de usar foto, voz e resultado precisariam ser verificados antes de qualquer entrada de cliente. [Política de uso da fal](https://fal.ai/legal/acceptable-use-policy) · [Termos da fal](https://fal.ai/legal/terms-of-service)

## Margem de contribuição parcial por filme

**FATO CONFIRMADO · entradas do cálculo em 19/11.** Plano mensal padrão em USD, sem desconto, com os créditos totalmente utilizados. Starter US$ 9 por 40 créditos, Creator US$ 19 por 150, Studio US$ 59 por 470. Aplicada uma vez por mensalidade a fórmula de líquido do repositório. Receita líquida atribuída ao filme = `(mensalidade × 0,971 − 0,30) × créditos debitados ÷ créditos mensais`. Fontes na base `6934f7ac3`, `lib/checkoutPricing.ts:181`, `:535` e `:633`.

**HIPÓTESE DE CÁLCULO · cenário comparável.** Uma folha nova por filme (US$ 0,015), cenas de 5 s com o protagonista em todas, uma tentativa bem-sucedida, nenhuma referência de vídeo. H3 inclui US$ 0,15 de edição e US$ 0,001 de juiz por cena. Os demais usam a mesma folha diretamente. Custos em USD para 15 / 30 / 60 s, respectivamente: Kling **2,370 / 4,725 / 9,435**, H3 **1,068 / 2,121 / 4,227**, Wan **1,515 / 3,015 / 6,015**. Uma folha já disponível reduz cada coluna em US$ 0,015. Fontes de custo de imagem e juiz em `lib/cinematic/folhaDePersonagem.ts:59`. O número de cenas escolhido muda o resultado do H3. Com quatro cenas editadas de 15 s, o H3 de 60 s custa US$ 3,019 com folha e juiz.

**HIPÓTESE DE CÁLCULO · leitura.** Cada célula mostra USD por filme e, entre parênteses, porcentagem da receita líquida atribuída. Voz, roteiro, montagem, armazenamento, falhas, impostos e reembolsos ainda precisam ser descontados. Os débitos de 35 e 50 são cenários do pedido. A margem final exige os custos por pedido concluído.

| Plano | Créditos | Segundos | Receita líquida | Kling 4 | H3 Turbo editado | Wan 3.0 |
|---|---:|---:|---:|---:|---:|---:|
| Starter | 35 | 15 | 7,38 | 5,01 (68%) | 6,32 (86%) | 5,87 (79%) |
| Starter | 35 | 30 | 7,38 | 2,66 (36%) | 5,26 (71%) | 4,37 (59%) |
| Starter | 35 | 60 | 7,38 | -2,05 (-28%) | 3,16 (43%) | 1,37 (19%) |
| Starter¹ | 50 | 15 | 10,55 | 8,18 (78%) | 9,48 (90%) | 9,03 (86%) |
| Starter¹ | 50 | 30 | 10,55 | 5,82 (55%) | 8,43 (80%) | 7,53 (71%) |
| Starter¹ | 50 | 60 | 10,55 | 1,11 (11%) | 6,32 (60%) | 4,53 (43%) |
| Creator | 35 | 15 | 4,23 | 1,86 (44%) | 3,17 (75%) | 2,72 (64%) |
| Creator | 35 | 30 | 4,23 | -0,49 (-12%) | 2,11 (50%) | 1,22 (29%) |
| Creator | 35 | 60 | 4,23 | -5,20 (-123%) | 0,01 (0%) | -1,78 (-42%) |
| Creator | 50 | 15 | 6,05 | 3,68 (61%) | 4,98 (82%) | 4,53 (75%) |
| Creator | 50 | 30 | 6,05 | 1,32 (22%) | 3,93 (65%) | 3,03 (50%) |
| Creator | 50 | 60 | 6,05 | -3,39 (-56%) | 1,82 (30%) | 0,03 (1%) |
| Studio | 35 | 15 | 4,24 | 1,87 (44%) | 3,18 (75%) | 2,73 (64%) |
| Studio | 35 | 30 | 4,24 | -0,48 (-11%) | 2,12 (50%) | 1,23 (29%) |
| Studio | 35 | 60 | 4,24 | -5,19 (-122%) | 0,02 (0%) | -1,77 (-42%) |
| Studio | 50 | 15 | 6,06 | 3,69 (61%) | 4,99 (82%) | 4,55 (75%) |
| Studio | 50 | 30 | 6,06 | 1,34 (22%) | 3,94 (65%) | 3,05 (50%) |
| Studio | 50 | 60 | 6,06 | -3,37 (-56%) | 1,84 (30%) | 0,05 (1%) |

¹ **FATO CONFIRMADO.** O Starter concede 40 créditos mensais. A linha de 50 mostra equivalência pelo valor unitário do plano. Uma compra adicional ou um saldo anterior teriam sua própria base de custo. A tabela tampouco concede acesso a motores.

## Onde entraria e como decidir

**FATO CONFIRMADO.** Na base `6934f7ac3`, o ensaio Kling do commit `6c310f982` já seleciona uma referência nominal do protagonista humano e tem ensaio sem render em `lib/cinematic/kling4PersonagemFixo.ts:14` e no despacho em `app/api/generate-video-cinematic/route.ts:8115`. O H3 com edição por cena de `8be922385` é uma entrega local distinta. Esse commit não é ancestral dessa main. Sua proposta gera ou herda a folha, edita cada quadro inicial elegível, passa o juiz e só então anima. Seu relatório está em `8be922385:docs/revisoes/PERSONAGEM-FIXO-BARATO-1811.md`.

**EVIDÊNCIA DE PRODUÇÃO + FATO CONFIRMADO.** Os 438 s observados para o Wan correspondem a 7 min 18 s até o clipe, antes da montagem Kineo. A interface cinematográfica informa 5–10 minutos em `app/(dashboard)/generate/GenerateClient.tsx:17481`. Restariam 2 min 42 s daquele limite superior para as demais etapas nesse exemplo. Duas solicitações para 60 s adicionam uma dependência de montagem e a duração total não pode ser deduzida de um render de 20 s. A fila fal aceita submissão assíncrona, consulta de estado e recuperação do resultado. Medir tempo em fila, execução e montagem separadamente.

**SUGESTÃO · desenho da chave.** No despacho do filme narrado, depois da escolha do elenco e antes de submeter clipes, selecionar o adaptador experimental apenas com chave de servidor desligada por padrão, conta do fundador, pedido de ensaio e referência elegível. Reutilizar o roteiro e a folha do ensaio Kling. Traduzir planos para um prompt ordenado por bloco, enviar 720p/9:16 e áudio desligado. Persistir endpoint e ID por bloco antes de consultar a fila, para que retomar a página não faça um segundo pedido pago. Falha antes do despacho preserva o fluxo existente. Após o despacho, reconciliar o ID e tratar o estorno existente antes de qualquer nova geração. Aplicar voz, legenda e montagem da mesma maneira nos três braços. O estudo não altera o produto.

| Opção | Decisão para a Kineo |
|---|---|
| **A · recomendada** | Revisar o H3 com edição de quadro por cena como controle e fazer dry-run dos três pedidos com o mesmo roteiro. É a menor despesa do cenário de 5 s por cena. |
| B · ensaio Wan da CEO | Depois de aprovação do dono, testar apenas no fundador. A vantagem a investigar é preservar o personagem entre ações sem editar uma imagem por ação. |
| C · Kling com planos temporizados | Manter para histórias que exigem corte e duração explícitos. Tem a preferência visual do dono neste exemplo e o maior custo nominal a 720p. |

**SUGESTÃO · régua de aprovação.** Fazer primeiro os dry-runs de 15, 30 e 60 s. Conferir folha, ordem, duração de cada bloco, crédito previsto e zero chamadas pagas. Se a CEO receber autorização para o ensaio, comparar os mesmos roteiros e montagem nos três braços, com avaliação cega. Em cada plano, inclusive nos cortes entre clipes, pontuar identidade, roupa, época e ação de 0 a 10. Exigir identidade ≥8 em cada plano, nenhuma troca de personagem, todas as ações na ordem e voz/legenda sincronizadas. Medir a espera até o MP4 final, custo real incluindo tentativas e margem após montagem. Só avançar se o Wan atender à qualidade, à janela anunciada e melhorar custo por filme aprovado frente à opção que substituiria. Uma única execução não estabelece p90. Nesta rodada não houve nova geração paga.
