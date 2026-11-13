# MISSÃO 2 PARA O GPT/CODEX (Telas e Produto) — MENU, RECREATE, CARTOON E CLIP — 13/11/2026

Escrita pela CEO (Claude) em 13/11 ~02:40, com as palavras do dono (áudio de 13/11 ~02:33) e os números do banco. Vem DEPOIS da missão da home (docs/MISSAO-GPT-HOME-1311.md), a não ser que o dono diga outra ordem.
Prints do dono, na pasta local C:\kineo\docs\telas-1311\ (1 a 6).

## O que o dono disse (ideia por ideia)
1. **/recreate ("Video templates")**: "Todo recreate que a gente comprar ou fizer tem que vir na lista, por ordem." Leitura da CEO: a grade lê o catálogo inteiro (lib/recreate/formats.ts) e o mais NOVO entra em cima, sem ninguém precisar editar a página. Continua valendo: só entra modelo testado.
2. **Botão "Recreate" dos cartões**: "tem que ficar maior, com aquele efeito gordinho", igual ao "Make my film →" da home (print 3). "Eu acho que fica melhor em branco." Hoje é um link azul pequeno embaixo do cartão.
3. **Menu "Films" da home (print 4)**: "não precisa abrir essa mini tela… eles nem querem saber qual motor é; só querem digitar, ver quantos créditos vai gastar e acabou." → "Films" vira link direto para a tela do filme. Sai a lista de motores e sai o bloco "Create: Studio / Examples".
4. **Examples**: "é uma página antiga, a gente pode excluir."
5. **Nome**: "se você quiser mudar para um nome melhor… Filmes, filmes." → fica "Films" (nome aprovado em 11/11). Não mudar.
6. **Cartoon (print 5)**: "colocar todos os cartoons que a gente faz na parte de baixo, quando a pessoa desce a tela", como a grade do Recreate. E o botão "Use idea ↗" / "Selected ✓" com o mesmo botão gordinho.
7. **Clip (print 6)**: "clipe e recreate é a mesma coisa, a gente podia juntar." A tela do Clip hoje mostra "My clips" (os que a pessoa fez, inclusive trocas do Recreate) no lugar de modelos para escolher.

## Números (14 dias, sem robô) para decidir sem gosto
| O quê | Medida |
|---|---|
| Clique em "Films" no menu público | 112 cliques, 46 pessoas (o item mais clicado) |
| Clique em "Examples" no menu | 2 cliques, 2 pessoas |
| Entradas diretas em /examples | 2 |
| Clique em "Clips" (More, logado) | 40 cliques, 27 pessoas |
| Clipes de ideia livre feitos | 72, por 5 pessoas |
| Cartão Desenho infantil na home | 73 pessoas (2º mais clicado) |
Não há medida de clique por MOTOR dentro do menu "Films": o evento só grava o item de cima.

## O que fazer
A. **Menu do topo**: "Films" sem submenu, direto para a tela do filme (visitante: a entrada de sempre que leva ao cadastro e volta para o filme). Tirar "Studio" e "Examples" do menu. Pares obrigatórios: app/KineoLanding.tsx, lib/ui/nomesDeProduto.ts, lib/ui/homeRemodela2010.ts, lib/ui/workspaceNavigation.ts, components/Sidebar.tsx, components/MobileNav.tsx, components/Footer.tsx.
B. **As páginas de motor NÃO saem** (/ai-video-generator/kling-4, seedance-2-5, etc.): são as que o ChatGPT cita e trazem cadastro. Só saem do menu. Manter os links delas no rodapé, para o robô continuar achando.
C. **/examples**: tirar do menu e do rodapé e responder 308 para /made-with-kineo. Não apagar arquivo de vídeo nem texto que outra página use. Conferir antes se alguma página citada pelo ChatGPT aponta para /examples e trocar o link.
D. **/recreate**: grade pelo catálogo inteiro, mais novo em cima (se o catálogo não tem data, um campo de ordem em lib/recreate/formats.ts — esse arquivo é da Div. 2 do Claude: peça no quadro a linha que precisa, não edite). Botão "Recreate" gordinho e branco em cada cartão: pílula, texto escuro em negrito, seta, altura de toque ≥ 44 px, texto ≥ 15 px. Sem preço e sem nome de motor no cartão.
E. **Cartoon**: grade "Made with Kineo cartoons" embaixo da tela, com os desenhos que a casa já fez (os aprovados; nada toca sozinho), e o botão "Use idea" no mesmo estilo gordinho.
F. **Clip + Recreate numa tela só**: um item de menu, "Recreate". A ideia livre ("one scene, your idea in motion", com ou sem foto) vira o PRIMEIRO cartão da grade. "My clips" sai dali e fica em My videos. /create/clip responde 308 para /recreate (ou para o cartão da ideia livre). Nada muda no que a pessoa paga nem no motor. Antes de construir: proposta de 1 tela (print ou protótipo) para o dono.

## Regras
- Consertos pequenos (A, C) podem ir direto com tsc + guardiões + conferência no ar. Mudança que o dono VÊ e ainda não aprovou no detalhe (botão branco da D, grade da E, tela única da F): print ao dono ANTES de publicar.
- Sem nome de motor e sem preço em cartão ou botão; nenhum texto < 12 px; nada toca sozinho; não tirar texto que o ChatGPT cita.
- Publicação pequena, uma por vez; linha em "Em obra" antes e em "No ar" depois, no quadro local C:\kineo\docs\QUADRO-DE-SESSOES.md.
