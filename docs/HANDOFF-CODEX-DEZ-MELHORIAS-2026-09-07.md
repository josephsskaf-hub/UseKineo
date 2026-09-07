# Dez melhorias aprovadas + Omni sem preenchimento lateral

## Correção do fundador — vídeos no topo, 07/09/2026
**PEDIDO EXPLÍCITO:** retirar o bloco introdutório visível e o espaço vazio acima dos vídeos. **IMPLEMENTADO EM PRÉVIA:** título sem espaço visual, acessível a leitores de tela; remoção de eyebrow e parágrafo introdutório; padding superior 16px e margem da fileira zero. Todos os vídeos/posters passam a contain centralizado, sem zoom CSS adicional. Omni hero somente robô, conforme proposta de retirar apresentadores verticais do hero; eles permanecem na galeria e catálogo. Demais engines preservam rotação. O plano próximo que já existe no arquivo do moletom não é reconstruído por CSS. Antes/depois desktop e mobile em `docs/previews/HOME-VIDEOS-NO-TOPO.html`. Não publicar antes da aprovação visual desta revisão.

## Escolha final por screenshot — 07/09/2026
**DECISÃO DO FUNDADOR NO CHAT:** screenshot `codex-clipboard-b7b6286c-c563-4c15-a617-f6c5c48a0647.png` confirma **B homem na neblina**, personagem de moletom, cidade noturna e robô. Não é a opção A inicialmente sugerida. **IMPLEMENTADO:** `lib/ui/heroOpening.ts` prioriza esses quatro IDs apenas no chamador da fileira hero (`KineoLanding`), sem mudar o catálogo global, motores ou demais IDs. Posters estáticos de cada abertura extraídos dos mesmos previews, sem render pago. Ordem relativa dos demais clipes preservada; dois mares não abrem juntos, mas podem aparecer depois. Todos os cards permanecem 500/280; Omni sem preenchimento lateral.
**TESTADO LOCALMENTE:** contrato executável passa 270 verificações, incluindo abertura por ID/motor, não mutação, demais clipes preservados e existência dos quatro posters. Publicação e inspeção final ainda pendentes deste checkpoint. Trabalho de pagamentos/marca d'água do Claude fora desta entrega.

## Curadoria da abertura — nova escolha solicitada em 07/09/2026
**PEDIDO DO FUNDADOR:** os cards 2 (Kling 3) e 3 (MiniMax H3) começam com mar; mudar a sequência. Primeiro card (Veo 3.1) não agrada; apresentar opções antes da troca.
**FATO CONFIRMADO:** seletores reais retornam aberturas `16742e11` (Veo), `7efd12b8` (Kling 3), `ad6cb185` (H3) e `36a04f7b` (robô Omni). Inspecionados quatro frames dos candidatos locais, sem consulta de banco/render.
**SUGESTÃO, NÃO PUBLICADA:** A servidores vermelhos `98a5ac54` (Veo) → personagem de moletom `216cbed2` (Kling 3) → cidade noturna `8aabb05a` (H3) → robô `36a04f7b` (Omni). Alternativas do Veo: B homem na neblina `dc0fe3a6`, C rua noir `b9572715`. Alternativa Kling: professor `94d551a3`. Motores reais preservados; não reetiquetar assets.
**IMPLEMENTADO APENAS COMO DOCUMENTO:** `docs/previews/ESCOLHER-ABERTURA-HOME.html`, CSS e posters inline, vídeos existentes por HTTPS, botões locais para comparar combinações e reproduzir a fila. Antes/depois em quatro cards iguais, grade responsiva 2×2 no mobile. **NÃO VALIDADO NO BROWSER:** política bloqueou file://; não contornado. Arquivo e vídeos entregues como links para escolha do fundador. Nenhuma mudança nova em código público, nenhum push/main/deploy nesta rodada. Não afirmar ausência de mar durante todos os ciclos: somente proposta de abertura; sequência completa depende da escolha final.

## Resultado da correção de igualdade dos cards — 07/09/2026
**TESTADO EM PRÉVIA, NÃO PUBLICADO NA MAIN:** SHA `b473b3af5150fece65bd79bb0226057888ca293c`, branch remota `codex/omni-equal-cards-sep07`, URL `https://kineo-lupshqdne-josephsskaf-hubs-projects.vercel.app`. Chrome: quatro áreas de mídia exatamente 453,5 × 253,953125 CSS px no desktop; quatro áreas 166 × 92,953125 com viewport de 390px. Proporção 500/280 em todos, sem exceção vertical. TypeScript exit 0; curadoria 250, showcase 248, cinco melhorias 621, idiomas 2034, sharing 68 verificações verdes. Comparação autocontida `docs/previews/OMNI-CARDS-IGUAIS.html`.

**GATE VISUAL AINDA NÃO FECHADO:** cover elimina o fundo lateral, mas o apresentador vertical fica próximo e corta partes do cabelo/queixo durante a fala. A igualdade dos cards está corrigida; não declarar enquadramento perfeito, não publicar esse recorte sem resolver a escolha de um trecho mais aberto/horizontal. Robô e seleção original não removidos. Main continua com o trabalho do Claude preservado; nenhuma atualização nossa em produção nesta rodada.

## Aceite do enquadramento — atualização
**CORREÇÃO DO FUNDADOR NO CHAT, 07/09/2026:** cartão vertical REPROVADO. O “perfeito” anterior foi interpretado incorretamente. Todos os cards devem manter a mesma proporção horizontal 500/280. Removidos max-width 240px e aspect-ratio 9/16 do Omni; fonte sem preenchimento continua, agora com cover e ponto focal superior. Isso implica recorte mais próximo dos apresentadores verticais, não recuperação de imagem fora do quadro original. Robô preservado. Exige nova inspeção visual; versão vertical não foi enviada à main.

**DECISÃO DO FUNDADOR NO CHAT, 07/09/2026:** aprovou a recomendação vertical com “perfeito”. **IMPLEMENTADO:** cartão Omni 9:16, largura máxima 240px, fontes verticais sem composição de laterais. Object-fit contain preserva o robô largo inteiro dentro do palco estável; nele há espaço preto acima/abaixo, não preenchimento artificial. Outros motores, IDs e arquivos originais intactos. Ficha técnica (item 10) tem comparação em `docs/previews/FICHA-DA-PREVIA.html`.

## Mandato
**DECISÃO DO FUNDADOR NO CHAT, 07/09/2026:** aprovadas as dez propostas da rodada de pesquisa. Pedido adicional: retirar separação/fade lateral do vídeo Omni Flash e melhorar enquadramento. Execução incremental, sem publicar funcionalidade só por estar aprovada. Worktree `C:/tmp/kineo-omni-clean-2026-09-07`, branch `codex/omni-clean-frame-sep07`, base `30fb83a6`.

## Coordenação
**FATO CONFIRMADO:** main inclui trabalho de pagamentos do Claude (`3af3f2d0`, diário `30fb83a6`). Nenhum arquivo de pagamento/render/crédito será tocado nesta entrega. A aprovação não autoriza cobrança, mensagens, publicação de material privado ou migration automática. Coleções/identidade persistentes precisam de desenho e coordenação antes de qualquer banco.

## Lista aprovada — não equivale a concluída
1. Comparador visual: evoluir Arena existente, dois motores, diferenças reais; não afirmar mesmo roteiro se exemplos diferentes.
2. Busca global de ações e acervo: reaproveitar buscas existentes, respeitando dono.
3. Coleções privadas: vídeo/imagem/áudio por projeto; definir persistência antes de migration.
4. Ferramentas conectadas: reutilizar arquivo local sem reupload; preservar original.
5. Central de publicação: reunir ferramentas existentes; nenhuma postagem automática.
6. Identidade reutilizável: preview e confirmação; sem modificar vídeos antigos.
7. Guias de enquadramento: sobreposições aproximadas, não garantia das redes; sem render.
8. Ajuda contextual: exemplos curtos sob demanda; sem poluição ou nova promessa.
9. Comparação de planos: destacar diferenças, sem alterar preço/termos/pagamento.
10. Ficha de exemplo: motor da curadoria, duração/resolução do arquivo realmente decodificado; não confundir com capacidade do motor.

## Primeira implementação
**IMPLEMENTADO, NÃO VALIDADO:** item 10 na prévia da home. Details recolhido, EN/ES/HI, metadados só após loadedmetadata; inválidos/erro não geram números. Não altera a seleção aprovada nem os vídeos.

**FATO CONFIRMADO:** `scripts/build-founder-curation.ps1` usa split/boxblur/overlay para preencher a lateral dos previews horizontais. O defeito visual do Omni é asset composto, não CSS. Originais verticais locais mantidos, robô intocado. Enquadramento limpo depende de preservar proporção vertical ou aceitar aproximação para preencher cartão horizontal; preferência solicitada ao fundador.

**PENDENTE:** itens 1–9; fechamento do Omni; teste/preview/CI/deploy desta primeira implementação. Nenhum aumento de assinaturas medido. Não existe execução em segundo plano criada por este documento.

## Checkpoint local
**TESTADO LOCALMENTE:** teste showcase-premium 199 verificações, TypeScript bruto exit 0, diff --check sem erro (avisos CRLF). Sem commit/push/deploy nesta rodada. Ficha técnica do item 10 ainda precisa de teste no browser.

**EVIDÊNCIA VISUAL LOCAL:** recorte do apresentador de 540×960 para 540×304 aproxima demais e corta a parte inferior do rosto. Não publicado. `docs/previews/OMNI-SEM-LATERAIS.html` compara antes, proporção natural recomendada e alternativa horizontal rejeitada. Arquivo HTML autocontido com imagens embutidas, responsivo. Aguardando preferência explícita entre mudar formato do cartão ou manter horizontal próximo; pergunta enviada no chat. Nenhum original ou preview público foi sobrescrito.
