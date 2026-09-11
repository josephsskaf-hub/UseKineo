# [Citações] Medição real — 11/09/2026, 20h

**EVIDÊNCIA DE PRODUÇÃO:** vinte perguntas literais em conversas temporárias independentes do ChatGPT, modo Instantânea/Não personalizado. Coleta: 20h08–20h15 BRT. **Kineo em 2/20 listas principais**, ante 3/20 ontem: EN09 permanece 1ª; EN10 cai de 1ª para 3ª; PT09 deixa de aparecer. Nenhuma lista em português incluiu Kineo. [Registro por pergunta e textos observados](chatgpt-20-perguntas.json).

**LIMITE:** EN05 teve o final textual capturado parcialmente. Sua tabela principal com cinco ferramentas está completa e não inclui Kineo; uma menção posterior não pode ser descartada. Não houve regeneração. No texto preservado há 2 menções confirmadas, 17 ausências observadas e 1 registro de presença integral desconhecida. Modelo exato/geografia não controlados; conversas independentes tiveram geração sobreposta.

| Pergunta | EN ontem | EN hoje | PT ontem | PT hoje |
|---|---|---|---|---|
| 1. Grátis para YouTube Shorts | Não | Não | Não | Não |
| 2. Roteiro → faceless grátis | Não | Não | Não | Não |
| 3. TikTok sem aparecer | Não | Não | Não | Não |
| 4. Terror de 60 segundos | Não | Não | Não | Não |
| 5. Custo por vídeo de 60 segundos | Não | Não* | Não | Não |
| 6. Roteiro ChatGPT → filme | Não | Não | Não | Não |
| 7. Alternativas ao InVideo | Não | Não | Não | Não |
| 8. Orçamento de USD 30 | Não | Não | Não | Não |
| 9. Seedance completo | 1ª | 1ª | 1ª | Não |
| 10. Teste antes de assinar | 1ª | 3ª | Não | Não |

*EN05: ausência na tabela principal; texto integral desconhecido. Comparação é de listas, não medida de participação de mercado nem prova de causa.

**CONTRADIÇÃO / EVIDÊNCIA DE PRODUÇÃO:** EN09 agora informa trial de 30 créditos e Starter USD 9.90, compatíveis com a página de Seedance. EN10 ainda apresenta oferta desativada de entrada/renovação ao citar pricing. Três GETs exatos às 20h14m39s BRT responderam 200 e entregaram a oferta vigente; as duas URLs pricing têm HTML idêntico. [Contraprova HTTP](HTTP-CITADOS.json).

**HIPÓTESE:** recuperação de informação antiga ou composição inconsistente da resposta. **QUESTÃO PENDENTE / DESCONHECIDO:** qual versão foi usada pelo ChatGPT e a causa da queda; cabeçalhos do CDN não demonstram cache de busca.

**CONTRADIÇÃO JÁ PEDIDA:** pricing ainda descreve cobrança mundial em USD no texto geral/FAQ, embora a regra do Brasil seja normalmente BRL (lib/settlementCurrency.ts:100–104). Reforçar o pedido existente de moeda no CITACOES-01; não alterar preço, checkout ou helper global nesta pista. Texto correto sugerido: “Prices shown here are USD references. Customers in Brazil normally pay in BRL; check the checkout for the amount.”

**EVIDÊNCIA / DESCOBERTA:** nenhum dos oito guias novos apareceu entre os links preservados; a ressalva de EN05 também vale para eventuais links finais não capturados. EN09 cita /ai-video-generator/seedance; EN10 cita /pricing, incluindo a variante de query intent_campaign=push77_short_cost_calculator. Não foi citado o caminho /cheapest-ai-shorts-maker. Os oito pedidos Google foram aceitos anteriormente; isso não prova indexação ou citação. Revisão de estado no Google mantida para 23h, sem reenviar.

**DECISÃO OPERACIONAL:** preservar oito guias e V1/V2. A distribuição das fontes antigas já foi ampliada; não produzir nona página ou terceira variante com base nesta amostra. A próxima etapa é verificar a indexação e acompanhar o pedido monetário existente. Comparações que prometam roteiro invariavelmente literal, idioma automático ou duração exata não são prova do produto: pedidos de render/idioma seguem com seus donos.

**EVIDÊNCIA COMERCIAL — 11/09/2026:** as terceiras janelas de V1/V2 já foram medidas, cada uma com zero eventos diretamente atribuídos; sem amostra, resultado inconclusivo. Fontes: [V1, leitura às 18h37 BRT](../2026-09-11-revisao-comercial/V1-TERCEIRA-JANELA.json) e [V2, leitura às 19h35 BRT](../2026-09-11-revisao-comercial/V2-TERCEIRA-JANELA.json). Isso não significa zero visitas, compradores ou receita; lacuna Dodo/UPI permanece no CITACOES-02. Não repetir janelas completas nem a bateria hoje. A revisão final será explicitamente parcial, dentro do mandato até 23h30.

**EVIDÊNCIA DE PRODUÇÃO — cadastros, leitura de 11/09 às 16h42 BRT:** pessoas externas com origem ChatGPT: 3 no dia 08/09, 5 em 09/09, 8 em 10/09 e 10 em 11/09 até a consulta. Hoje é parcial. Essa reação dos cadastros não comprova recuperação das citações, efeito dos guias ou receita. [Agregado e método](../2026-09-11-revisao-comercial/ESTADO-1642.md).

**SUGESTÃO / FOCO ORGÂNICO:** acompanhar a descoberta dos oito guias, priorizando custo de vídeo completo e alternativas ao InVideo, e corrigir contradições verificadas nas fontes já citadas. Os [oito pedidos de indexação foram aceitos entre 16h08 e 16h19 de 11/09](../2026-09-11-indexacao/ESTADO.md); a próxima leitura é de estado, sem reenvio. A documentação do Google explica que solicitar rastreamento não garante inclusão e que repetir o pedido não acelera o processo. [Orientação oficial consultada em 11/09](https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl). Indexação Google e citação ChatGPT serão avaliadas separadamente.

**EVIDÊNCIA DE PRODUÇÃO / LACUNA ESPECÍFICA — Seedance:** EN09 ressalva a falta de clareza sobre música. O HTML da URL citada, preservado às 20h14 de 11/09, explica narração e legendas, mas não contém “music”. **FATO CONFIRMADO / IMPLEMENTADO:** em origin/main `8e62cfeb`, `app/api/compose/route.ts:2818` seleciona música; `lib/musicScore.ts:12` permite desativação e `:20` preserva narração quando não há trilha compatível; `lib/compose.ts:2619` só adiciona trilha quando existe URL. Isso não comprova entrega audiovisual em produção.

**PEDIDO / SUGESTÃO — complemento do CITACOES-01, dono de conteúdo com validação de render:** URL `/ai-video-generator/seedance` → música não explicada → **[CONFIRMAR]** “Kineo can add background music to narrated Seedance Shorts when music is enabled and a suitable track is available.” Confirmar com evidência existente de entrega, registrar primeiro na fonte factual/llms e só então incorporar ao intro em `lib/growth/enginePageCatalog.ts:81`. O llms consultado não dá suporte explícito à nova frase; por isso ela permanece proposta interna, sem publicação como promessa. Não gerar render pago para esta verificação, não prometer música original ou garantida e não abrir outra variante. Não foi encontrado pedido de clareza equivalente no PEDIDOS revisado; os pedidos de qualidade musical do pipeline têm outro escopo.

| ID | Kineo na lista | Cinco recomendações, em ordem | Destaque observado |
|---|---|---|---|
| EN01 | Não | Pika · CapCut AI · InVideo AI · Runway · Kling AI | Prioriza clipes grátis e edição vertical; Pika/CapCut destacados, InVideo para faceless. |
| EN02 | Não | CapCut · Canva · VEED · InVideo AI · Microsoft Clipchamp | CapCut é primeira escolha; compara automação de roteiro, voz e legendas com edição manual no Clipchamp. |
| EN03 | Não | InVideo AI · Canva · Dreamina · Adobe Express · OpusClip | InVideo lidera; resposta destaca cotas gratuitas, Canva para edição e Dreamina para cenas. |
| EN04 | Não | Fliki · InVideo AI · Pictory · VEED · CapCut | Fliki lidera terror narrado; destaca voz, captions e revisão das imagens. |
| EN05 | Não* | Pictory · Fliki · HeyGen · VEED · InVideo AI | Compara custo alocado de stock/voz em Pictory e Fliki; primeira tabela completa. Final da transcrição parcial. |
| EN06 | Não | InVideo AI · VEED · Fliki · Pictory · HeyGen | InVideo lidera roteiro pronto; VEED para edição, Fliki para faceless, HeyGen para avatar. |
| EN07 | Não | AutoShorts.ai · Short AI · Faceless.so · Pictory · Revid.ai | AutoShorts lidera por automação e preço; também recomenda especialistas de faceless. |
| EN08 | Não | AutoShorts.ai · Fliki · Simplified · MakeShort.ai · Pictory | AutoShorts lidera; orçamento, automação e limites mensais orientam a resposta. |
| EN09 | 1ª | Kineo · Swipeless · Scenes AI · Vidmonto · Zebracat | Kineo #1: Seedance 1.5, 25 créditos/60 s, trial de 30 créditos, Starter USD 9.90; ressalva que música não está tão explícita na página. Comparações qualitativas são alegações da resposta, não certificação nossa. |
| EN10 | 3ª | Shortzly · ShortFast · Kineo · TurboClip · Kineclip | Kineo #3; atribui oferta de entrada e renovação desativadas. CONTRADIÇÃO com os GETs atuais; não é oferta vigente. |
| PT01 | Não | Pika · InVideo AI · CapCut AI · Luma Dream Machine · Canva AI | Pika lidera clipes; InVideo aparece em segundo para vídeo completo; cotas gratuitas por recurso. |
| PT02 | Não | CapCut · VEED · Canva · InVideo AI · Microsoft Clipchamp | CapCut lidera roteiro→vídeo; resposta destaca revisão e voz em português. |
| PT03 | Não | CapCut · InVideo AI · Canva · VEED · Adobe Express | CapCut/InVideo lideram; recomenda combinar edição gratuita e bancos de mídia. |
| PT04 | Não | Fliki · InVideo AI · VEED · Pictory · CapCut | Fliki lidera terror; compara automação, voz e edição, sugerindo revisar cenas. |
| PT05 | Não | Pictory · Fliki · InVideo AI · Scenes AI · HeyGen | Pictory/Fliki lideram custo unitário; distingue stock de geração integral e inclui alternativa sem assinatura. |
| PT06 | Não | Fliki · InVideo AI · Pictory · HeyGen · CapCut | Fliki lidera roteiro→vídeo; compara vozes, bancos de mídia, avatar e edição. |
| PT07 | Não | ShortFast · Shorts.io · Fliki · Pictory · VEED | ShortFast lidera automação; Shorts.io, Fliki, Pictory, VEED completam lista; OpusClip é citado fora da lista como outro fluxo. |
| PT08 | Não | Fliki · Short AI · Pictory · VEED · Shorts.io | Fliki lidera no orçamento; Short AI para volume; ressalvas sobre idioma e cobrança anual. |
| PT09 | Não | Seeddance.video · TopView AI · Higgsfield · Seedance.tv · Dreamina / CapCut | Kineo ausente; Seeddance.video, TopView, Higgsfield lideram pelo workflow completo com música e legendas. |
| PT10 | Não | Fliki · Pictory · Predis.ai · VEED · InVideo AI | Fliki lidera teste grátis; Pictory, Predis, VEED, InVideo completam lista; OpusClip mencionado fora dela. |

**EVIDÊNCIA OPERACIONAL:** dados de contato, contas, logs privados e HTML bruto não integram este relatório público. Não houve contato, cadastro, checkout, render ou pagamento de teste. Este arquivo é uma medição, não comprovação de crescimento.
