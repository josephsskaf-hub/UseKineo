# MISSÃO PARA O GPT/CODEX (Telas e Produto) — HOME DA KINEO — 13/11/2026

Escrita pela CEO (Claude) em 13/11 ~01:20, por ordem do dono: "pode aumentar as tarefas do GPT" (o Claude bateu 90% do limite da semana; o GPT tem 61% livre).
Dono: "eu queria a minha tela pronta amanhã". Não pare para perguntar: o que depender dele vai para a FILA DO DONO no relatório e você segue.

## Leia antes (estão neste repositório)
1. docs/PLANO-HOME-2026-11-13.md (o pedido do dono, a régua e a ordem do dia)
2. docs/home-1311/DOSSIE-HOME-LIDERES-1311.md (Higgsfield × Kineo medido e os 10 clipes propostos)
3. As últimas 60 linhas de C:\kineo\docs\QUADRO-DE-SESSOES.md (arquivo local: o que foi ao ar em 12/11)

## O que o dono quer
- "A pessoa tem que se vislumbrar quando ela olha alguma coisa." Cada cartão: isso podia ser eu, o meu produto, o meu canal. Paisagem bonita sem gente nem produto sai (onda, águia, rua molhada, arraia, montanha, cavalo).
- Recreate visível: no menu (no ar, 3d8638e83) e na PRIMEIRA tela.
- 10 clipes novos: 5 presets de Recreate e 5 vídeos normais. Ele quer VER antes de publicar.

## Tarefas, em ordem
1. Conferir no navegador o que foi ao ar em 12/11 23:44 e ninguém viu: https://www.usekineo.com/ e /recreate em 1366, 1440 e 390 px, deslogado. O menu com "Recreate" quebra ou estoura entre 1321 e 1390 px? A grade dos 30 modelos aparece inteira? O ▶ é fácil no celular? Nada toca sozinho? Nenhum texto < 12 px? Consertar o que estiver torto.
2. Pôr "Recreate" nos cabeçalhos que ficaram sem: /examples, /made-with-kineo e páginas de SEO (components/seo/PaginaClara.tsx).
3. Dado antes de gosto: cliques por cartão da home nos últimos 14 dias (tabela events). Listar quais cartões saem.
4. Cartões escuros no fim da home: achar a causa e consertar.
5. Os 12 quadros parados para o dono escolher 10: as 10 propostas do dossiê + as 2 alternativas do plano (seção 4). Imagem 4:5, assunto dentro da janela central 5:6, gente INVENTADA, sem texto, marca ou famoso. UMA imagem numerada de 1 a 12 com os títulos em C:\kineo\docs\home-1311\12-quadros.png. Teto US$ 2. NÃO gerar vídeo ainda.
6. Enquadramento: para cada quadro, uma linha dizendo se cabe na janela 5:6 e o que ajustar.
7. Faixa de Recreate na primeira tela, SÓ com modelos aprovados (lib/recreate/formats.ts, swapApproved). Commit local; print antes de publicar.
8. Linha do conector com o modelo atual ("Claude Fable 5.2"): app/kineo-in-claude/page.tsx e lib/ui/homeRemodela2010.ts. No site hoje não há nome de modelo.

## Regras que não se quebram
- Sem nome de motor e sem preço em cartão ou botão; nenhum texto < 12 px; nada toca sozinho; não tirar texto que o ChatGPT cita.
- Não prometer o que o cliente não faz hoje: nada de pessoa falando com a própria boca; preset só com troca aprovada. Troca de 2–3 pessoas e troca em vídeo enviado pelo cliente NÃO estão prontas.
- Número em cartão só se for número real nosso.
- Nenhum render de US$ 5 ou mais. Nada de anúncio pago, preço público ou apagar dado.
- Publicar: tsc + guardiões da área, linha de reserva no quadro, `bash scripts/enfileirar.sh` de dentro da worktree e `scripts\!RODAR-AGORA.bat`. Nunca `git branch -f entrega-atual`. Publicações pequenas; conferir no ar; anotar em "No ar".
- Mudança VISUAL da home: print ao dono ANTES de publicar. Conserto de defeito (itens 1, 2 e 4) pode ir direto.
- PC com 40 GB agora. Testes em fila, não em paralelo.

## Relatório (curto, até 08:00)
O que foi ao ar (commit e print) · o que espera o sim do dono (print) · a imagem dos 12 quadros · FILA DO DONO. Uma linha no fim do quadro a cada entrega.
