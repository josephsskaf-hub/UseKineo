# Dez melhorias aprovadas + Omni sem preenchimento lateral

## Aceite do enquadramento — atualização
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
