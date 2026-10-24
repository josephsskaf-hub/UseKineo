# KINEO-CARDS-GIRO-2410

Base: origin/main `1c078ed013302ac47c42f783305df688c4e97cfd`. Branch: `codex/cards-giro-2410`. Data: 24/10/2026.

**FATO CONFIRMADO — escopo confirmado pelo fundador nesta tarefa em 24/10:** Filmes e Produto recebem três clipes cada. UGC e Desenho mantêm um aprovado cada até haver novos clipes, conforme resposta expressa: “Manter um aprovado em cada até haver novos clipes”. Nenhum render novo foi gerado.

**FATO CONFIRMADO — IMPLEMENTADO:** as quatro listas ficam em `lib/ui/homeThreeCards.ts:107` (`HOME_CARD_PLAYLISTS`). Cada item declara `src`, `poster`, `objectPosition` e pode declarar `mobileObjectPosition`/`objectFit`/`scale`. A API de clipe único continua disponível para as páginas UGC em `lib/ui/homeThreeCards.ts:128`. Para trocar vídeos, editar somente a lista correspondente, usando arquivos aprovados já existentes.

**FATO CONFIRMADO — IMPLEMENTADO:** `components/home/HomeCardCycleMedia.tsx:24` mantém dois elementos de vídeo persistentes e o pôster do primeiro no HTML inicial. `lib/ui/homeCardPlayback.ts:101` solicita o próximo no evento `ended`; `:84` só o revela quando começa a tocar; `:102` só recicla o anterior ao terminar a transição de opacidade. Não há relógio de rotação. Só o próximo é pré-carregado. Fora da tela, os vídeos pausam; movimento reduzido mostra o primeiro pôster estático.

**FATO CONFIRMADO — IMPLEMENTADO:** enquadramento próprio por clipe em computador e celular, sem zoom herdado. O anúncio lifestyle de tênis e o desenho usam quadro inteiro (`contain`); isso preserva rosto e produto e deixa barras laterais. O UGC usa topo 0% para preservar a cabeça nos planos de rosto. Os seletores novos vencem as regras antigas com `!important` (`components/home/HomeCardCycleMedia.tsx:9`).

**FATO CONFIRMADO — IMPLEMENTADO / TESTADO LOCALMENTE:** só o Flannan, sem rosto, preserva a escala superior 1.1 que esconde o letreiro queimado na borda; os demais ficam em 1. O pôster acompanha a escala do clipe, o buffer reciclado recebe sua própria escala e o hover não acrescenta zoom. A revisão visual detectou e corrigiu a reaparição desse letreiro na primeira versão; a comparação específica está no HTML.

**FATO CONFIRMADO — preservado:** `home_card_clicked` e seus metadados `card`/`position`/`href`, destinos, textos, preços e posição real do card continuam iguais. `lib/engineWall.ts` e `lib/homeVideoCuration.ts` permanecem iguais à base. O guardião compara as fontes protegidas e executa os cliques reais dos quatro cards, em português/inglês e com/sem sessão.

**TESTADO LOCALMENTE — 24/10/2026:** typecheck bruto verde (exit 0), registrado em `typecheck.json`. A inspeção de mídia em `media-inspection.json` registra tamanho, ausência de áudio, faststart e decodificação integral dos arquivos selecionados. Todos ficam dentro de 1.500.000 bytes e já existiam na base.

**TESTADO LOCALMENTE — 24/10/2026:** navegador real verifica eventos `ended → playing → transitionend`, pausa/retomada, SSR, movimento reduzido inclusive alteração ao vivo, somente ativo+próximo, posições computadas e ausência de 404. A prévia autocontida `PREVIEW-HOME.html` mostra antes/depois dos quatro cards no computador/celular e todos os clipes selecionados. Consulte os JSON de navegador e enquadramento anexos.

**TESTADO LOCALMENTE — guardião e desfaz:** `node scripts/test-cards-giro-2410.mjs --mutants` executa o controlador, SSR, arquivos e cliques reais, com mutantes efetivamente aplicados. `node scripts/test-cards-giro-undo-2410.mjs` prova retorno exato das fontes anteriores, preservação LF/CRLF, idempotência e rejeição de alterações fora da entrega. O workflow Guardião executa ambos. O manifesto guarda a base imutável e hashes completos; não aplica desfaz sobre uma fonte divergente. Para reverter a entrega em Git, reverter os commits desta branch; o auxiliar dos testes desfaz as camadas em memória, sem escrever arquivos.

**FATO CONFIRMADO — provas separadas:** a fixture histórica de Páginas recebe somente as fontes anteriores ao Giro e mantém sua comparação integral do SSR e seus mutantes de origem. O novo guardião executa o componente atual em 64 combinações de idioma, sessão, três/quatro cards e origem UTM/referrer, incluindo Cartoon primeiro no ChatGPT. Ele compara o SSR atual, ordem DOM sem duplicação e eventos/destinos reais; a alteração autorizada de mídia não dispensa a prova atual de atribuição.

**CONTRADIÇÃO corrigida no comentário tocado:** os arquivos atuais do Close e UGC mostram tênis e creme GLOW, embora o comentário antigo dissesse LUME/Atheeri. A seleção foi feita olhando os arquivos reais. O perfume adicional é uma foto com aproximação, não movimento de produto gerado.

**FATO CONFIRMADO — limite do acervo:** UGC e desenho incluem closes originalmente enquadrados nas mãos/produto; CSS não recupera uma cabeça que já está fora do vídeo original. Os planos com rosto não recebem o corte adicional antigo. Há só um desenho e um UGC adequado verificado; os trios com pessoas posando não foram reclassificados como fala UGC.

**SUGESTÃO — próximo passo recomendado:** quando houver dois novos UGC com pessoa falando/produto e dois desenhos aprovados, acrescentá-los às listas existentes e repetir os dois testes e a comparação visual. O mecanismo já aceita as listas, sem alterar curadoria global.

**QUESTÃO PENDENTE / DESCONHECIDO:** comportamento em produção e impacto comercial; esta entrega é testada localmente e enviada somente à branch solicitada.
