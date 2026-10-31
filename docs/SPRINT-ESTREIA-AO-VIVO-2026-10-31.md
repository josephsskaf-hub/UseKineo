# Sprint "A espera vira a estreia" — 31/10 → 01/11

**Decisão do fundador (31/10):** "Aprovado… tornar a espera a estreia… vamos fazer isso hoje, amanhã você me entrega, a gente sobe… isso eu quero genérico, padrão… para todos os lugares onde a pessoa vai gerar alguma coisa, a mesma UX. O UI e o X, a gente vai padronizar para tudo. Não vai ficar só nos filmes."

## Por quê (14 dias medidos)
- 263 receberam o vídeo · 167 (59%) saíram da aba na espera · 101 (38%) baixaram · 4 (1,5%) fizeram o filme seguinte.
- O produto entrega, mas a pessoa já foi embora; quase ninguém volta para o 2º.

## O que é (UM componente, todas as telas de geração)
`components/premiere/` — a mesma sala em Filme, Clipes, Imagens, Áudio, Ads, Animate, Avatar/UGC, Desenho, Espaços:
1. **Sala ao vivo** — cartões do que está sendo feito (cenas / imagens / variações). Cada um vira o resultado real assim que fica pronto. Linha "o que vem agora" (fala da próxima cena, ou o pedido da próxima imagem). Barra + tempo honesto ("pode fechar a aba").
2. **Me avise quando ficar pronto** — aviso do navegador (Notification API, com permissão) + título da aba "✓ Pronto — Kineo" + favicon. Sem servidor novo.
3. **Estreia** — resultado toca sozinho, botão grande de Download, Compartilhar, e **"Próximo" já sugerido** (episódio 2 no Filme; mesma foto com outro efeito no Clipe; variação no Ads; etc.). Um toque leva para a tela já preenchida — o crédito só sai quando a pessoa confirma.

## Regras
- Nada de motor, cobrança ou rota protegida (TRAVA 8.2) mexida: só tela. Os dados progressivos já chegam no polling de hoje.
- Cliente não vê números internos (créditos de custo, ids). Tempo mostrado é estimativa honesta.
- Eventos (para medir): `premiere_shown`, `premiere_item_revealed`, `premiere_notify_opted`, `premiere_ready_seen`, `premiere_next_clicked` (+ os que já existem: `render_wait_backgrounded`, `video_downloaded`).

## Ordem de entrega
1. Componente + Filme (/generate) — maior volume, dado por cena já existe.
2. Clipes + Imagens + Áudio.
3. Ads + Animate + Avatar/UGC + Desenho + Espaços.
4. Prints de cada tela (desktop e celular) para o fundador → publicação 01/11.

## Régua (antes × depois, 14 dias após publicar)
- Sair da aba: 59% → < 45% · Baixar: 38% → 50% · 2º filme: 4 → 20 pessoas.
