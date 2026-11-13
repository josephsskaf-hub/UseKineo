# Livro das falhas de cliente

**Pedido do dono (13/11, ~20:10, no /admin vendo "1 FAILED"):** "quero saber porque todo cliente que falha, quero saber porque e já ter uma solução".

**Como usar.** A consulta `docs/queries/FALHAS-DE-CLIENTE-POR-DIA.sql` lista, por dia, toda falha de cliente, agrupada pela mensagem. Ela também diz quantas pessoas falharam e quantas conseguiram um filme depois. Cada mensagem tem uma linha aqui. Mensagem que aparecer na consulta sem linha aqui é **falha sem dono**: quem a vir escreve a linha no mesmo dia.

**Estados:**
- **resolvido**: o defeito foi consertado e a mensagem parou de aparecer.
- **em conserto**: o conserto tem SHA e espera publicação.
- **resolve sozinho**: o aviso é honesto e o filme sai depois sem ninguém mexer.
- **regra**: não é defeito, é regra de produto.
- **sem dono**: ninguém está cuidando.

**Números:** 30 dias até 13/11. As contas da casa e os robôs ficam fora. "Com filme depois" conta um vídeo pronto ou clipe pronto criado depois da falha.

| Começo da mensagem que o cliente vê | 30 dias: pessoas (com filme depois) | O que é, em português simples | Causa | Solução | Estado |
|---|---|---|---|---|---|
| "The writer could not turn this idea into a script (the AI declined the topic)" | **23 (16)** — a maior de todas | O roteirista de IA recusou o texto da pessoa | Num filme de 15 s, quase sempre no Kling 4 grátis, o texto colado era um briefing de produção ou um plano de cenas. O gpt-4o responde "I'm sorry, I can't assist" mesmo sem nada proibido. A 2ª tentativa de hoje também era recusada. | 3ª tentativa "condensar" (`Condense this whole story…`), só com a moderação aprovando. No ensaio de 13/11, o caso de hoje é recusado 2 vezes e aceito na 3ª. Nenhum dos 6 briefings longos é recusado, e os 3 proibidos param na moderação. | **em conserto** — 2de57c2ec. Sobra: narração verbatim em língua rara (1 caso birmanês recusado nas 3 tentativas). |
| "We're experiencing high demand right now. Nothing started…" | 12 (1) | A fal (fornecedora dos motores) ficou sem saldo ou sem capacidade, e o pedido morria | 28/10: a fal ficou sem saldo por horas, sem fila para guardar o filme | O filme passou a ser **estacionado** e retomado sozinho (KINEO-FILA-QUEDA-FAL-2810) | **resolvido** — última vez em 28/10 |
| "This looks like a shot plan (camera…), not a story to narrate" | 10 + 1 + 1 (6 + 1 + 1) | A pessoa colou um plano de câmera e cenas com "Use my script as is", e a Kineo leria as instruções em voz alta | O texto é instrução para a IA, não fala | Aviso honesto com o botão certo ("Just this clip" ou "Let AI structure"). No 1º filme o conserto é automático (lib/cinematic/planoNoPrimeiroFilme). | **resolve sozinho** em 8 de 12 pessoas. Fora do 1º filme, a conversão automática está **sem dono**. |
| "This script reads for about N seconds — too long for a N-second film" | 10 (7) | O roteiro colado é maior que a duração escolhida | Fala colada acima do teto do motor | Aviso com o número de segundos e a troca de duração | **resolve sozinho** — última vez em 04/11 |
| "Our video engine is paused for a few minutes. Your film is saved and will start automatically" | 8 (5) | O motor parou porque a fal ficou sem saldo; o filme ficou guardado | Fal sem saldo (`balance_quota`); em 08/11, das ~12:00 às ~16:00 de Brasília | Filme estacionado e retomado a cada 5 min, sem cobrar. O saldo da fal é recarregado à mão, pelo cartão do fundador. | **resolve sozinho** quando a fal volta a ter saldo. O alarme de saldo é o que manda. |
| "Two AI attempts were just refunded. Please wait a few minutes…" | 6 (2) | Trava antiabuso: 2 estornos seguidos fecham os filmes por 15 min | Em 08/11 a trava disparou por estornos **de saldo da fal**, que não são culpa da pessoa. A retomada do filme estacionado batia nela. | Estorno por saldo não conta mais para a trava (KINEO-RESFRIAMENTO-SALDO-1111) | **resolvido** — última vez em 08/11 |
| `no_detail:narration_too_short` (a tela não teve frase) | 6 (5) | A narração ficou curta demais e a tela não recebeu explicação | Corte da guarda de narração curta | Passou a ser "completando roteiro" (KINEO-ROTEIRO-CURTO-SEM-FALHA-2026-10-22) | **resolvido** — última vez em 22/10 |
| "Your request asks for N seconds, but the selected duration is N seconds" | 4 (2) | O texto pede uma duração e o seletor está em outra | Duração escrita no pedido ≠ duração escolhida | Aviso que pede para alinhar as duas | **resolve sozinho** — última vez em 28/10 |
| "generation id belongs to a different cinematic request" | 3 (3) | A tela reconectou ao mesmo envio e o servidor achou que era outro pedido | O servidor reescreve o roteiro da ideia solta a cada chamada, e a impressão digital do pedido usava esse roteiro | A impressão digital passa a usar o pedido da pessoa; a reconexão espera o 1º envio | **em conserto** — e23a09f54 |
| "Your free film is one N-second Seedance N.N film per account" | 3 (1) | A pessoa tentou o 2º filme grátis | Regra do teste grátis | Aviso com o plano | **regra** |
| "Something went wrong. Please try again." | 2 (1) | Erro genérico, sem causa | Resposta sem motivo de alguma rota | Achar a rota e dar frase própria | **sem dono** — última vez em 26/10 |
| "Your script is about N seconds of narration, but you asked for…" | 1 (1) | Mesmo caso de "too long" (frase antiga) | Fala colada acima do teto | Aviso | **resolve sozinho** — última vez em 20/10 |
| "This generation stopped responding and we ended it here…" | 1 (0) | O envio ficou sem resposta e a tela encerrou com estorno | Tempo de envio esgotado | Estorno automático + aviso | **sem dono** — 1 caso, 16/10 |
| "Hindi (Devanagari script) narration is available on…" | 1 (0) | Língua não disponível no motor escolhido | Voz do motor não fala a língua | Aviso com os motores que falam | **regra** |
| `no_detail:scene_description_requires_review` | 1 (1) | Descrição de imagem que pedia revisão, sem frase na tela | Guarda de descrição de cena | Frase própria na tela | **sem dono** — 1 caso, 26/10 |
| "Premium engines (Kling, Veo, Hollywood) are available on every paid plan" | 1 (1) | Motor pago pedido numa conta grátis | Regra de plano | Aviso com o plano | **regra** |
| "The AI engine was part of your trial. Reactivate it…" | 1 (0) | O teste grátis acabou | Regra de plano | Aviso com o plano | **regra** |

## Os 7 dias pedidos pelo dono (até 13/11)

As quatro mensagens de `generate_failed` mais a recusa do escritor, que só aparece em `generation_stage_error`:

| Mensagem | Pedidos · pessoas | O filme da pessoa saiu depois? | O que falta |
|---|---|---|---|
| "Our video engine is paused…" | 5 · 2 | **Sim, as 2.** 07e7dd7f teve filme às 17:52 do mesmo dia (08/11); dee9228f, no dia seguinte, às 07:29. | Nada no código. A fal ficou sem saldo por ~4 h em 08/11. O que falta é o saldo não acabar (recarga), não conserto. |
| "Two AI attempts were just refunded…" | 3 · 1 | **Sim** (dee9228f, 09/11 07:29) | Nada: a trava parou de contar estorno de saldo desde 11/11 |
| "generation id belongs to a different cinematic request" | 1 · 1 | **Sim**, 12 min depois (o 1º envio terminou bem; a tela só mostrou falha) | Publicar e23a09f54 |
| "This looks like a shot plan (camera)…" | 1 · 1 | **Sim**, no dia seguinte (6a4db540, roteiro de anúncio em espanhol) | Fora do 1º filme o plano de câmera não vira história sozinho (sem dono) |
| Recusa do escritor (`generation_stage_error`, scripting) | 3 · 2 | **1 de 2.** A conta da França teve filme, porque o servidor condensou 2 min depois. A outra (c0914e43, 12/11) **não teve**: sem texto salvo, não dá para saber o pedido. | Publicar 2de57c2ec. Falta também: a recusa gravar o começo do texto pedido (hoje grava só a resposta do modelo), para o próximo caso ter causa. |

## Proposta: a causa ao lado do "FAILED" no /admin (não construída)

O painel ao vivo já carrega a mensagem de cada falha. A rota `/api/admin/live` lê `metadata` de todo evento recente (`app/api/admin/live/route.ts:201`) e conta os `failed` na linha `:676`. O selo "N failed" é desenhado em `components/LiveNowPanel.tsx:212-216`.

1. **`lib/admin/causaDaFalha.ts` (puro):** a tabela deste livro em código, uma linha por mensagem: o padrão da frase vira causa em uma frase + estado. Mensagem sem linha devolve "sem dono — ver o livro".
2. **`route.ts:676`:** junto do `failed`, devolver `failedCause` com a causa da falha **mais recente** daquela pessoa e um `filmeDepois` (se houve `video_generation_completed` depois).
3. **`LiveNowPanel.tsx:212`:** o selo passa de "1 failed" para "1 failed · fal sem saldo · resolve sozinho", com a cor do estado: verde para resolvido, âmbar para em conserto ou resolve sozinho, vermelho para sem dono.

**Custo:** nenhuma consulta nova e nenhuma tabela nova. São cerca de 60 linhas de código e um guardião que confere que toda mensagem da consulta de 30 dias tem linha na tabela. **Risco:** o livro e a tabela em código divergirem. O guardião resolve isso, porque a fonte única passa a ser `causaDaFalha.ts` e este documento cita o arquivo.
