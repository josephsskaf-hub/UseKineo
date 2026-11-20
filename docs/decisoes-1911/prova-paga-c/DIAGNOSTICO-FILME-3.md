# Prova C · filme 3 (1c770cb7, geração 76c4c5c4) · diagnóstico · Div. 2 · 20/11 03:3x

Só leitura (banco, código da main 6f75a2028 e os arquivos da fal). Nada construído, nada gasto.

## Resumo
- **Causa da reserva:** o Kling 4 foi aceito às 02:46:18 e não terminou em 12 min. A regra (8 min + 4 min se a fal diz "rodando") comprou a reserva H3 às 02:59:09, por tempo. **Não é o tempo antes do envio** (89 s) nem algo publicado hoje.
- **Causa do "piorou":** o ensaio grátis não tem a folha do personagem. O pago tem, e as âncoras da folha alongam a ficha. A descrição do A2 não coube, e o filme caiu no caminho de hoje. Nesse caminho o passo da ficha reprovada **não roda**.
- **Vídeo deitado:** é do **H3 só de texto** (a reserva sem imagem). Ele gera em 768×1344, mas com a cena deitada dentro do quadro. **Atinge cliente:** o eec8a2d3 (17/11, cliente) foi entregue com 2 dos 4 clipes deitados. **Sobe para o topo.**

## (a) Por que o pago divergiu do ensaio
- O dry_run devolve na rota em `route.ts:7633`, antes da folha do personagem. As âncoras lidas da folha só entram em `route.ts:8078`.
- Ficha no ensaio: `Daniel, exactly as the author wrote: "photos show Daniel"; origin: an American woman`.
- Ficha no pago (`cinematic_dispatch_result`, planos 3 e 4): `…; appearance anchors: 20-30, medium length, wavy dark brown, clean-shaven, light skin, wearing white top, black cropped blazer; origin: an American woman. Cast: a man and a woman, both adults.`.
- Com a ficha mais longa, `secoesQueNaoCabem` reprovou a descrição duas vezes. O resultado foi `kling4_plano_da_fala_hoje = descricao_nao_cabe_depois_de_pedir_de_novo` (02:46:15).
- O descritor variar entre as chamadas também pode pesar, mas o comprimento da ficha basta para explicar.
- **O ensaio não é o envio nos filmes COM folha.** Nos filmes sem personagem é o mesmo texto (filmes 1 e 2 bateram).

## (b) Por que caiu na reserva
- Claim: `submitted_at 05:46:16Z`, `fallback_reason: timeout`. `kling4_trial_fallback_runs` foi finalizado às 05:59:10Z, com os 3 H3 aceitos às 05:59:09Z.
- O varredor `finish-stranded-renders` roda a cada minuto e chama `advanceKling4TrialStatus` (`lib/kling4TrialAsyncStatus.ts`). Aos 8 min consulta a fal. "Rodando" dá mais 4 min (`decisaoNoPrazoDoKling4`, `K4_ESPERA_EXTRA_MS`). A reserva saiu aos 12,9 min.
- Ou seja: a fal dizia que o Kling 4 seguia rodando depois de 8 min e não entregou até os 12. O normal é p50 4,6 min e máx. 7,8 min.
- A confirmação final é o status do request `01a1f77d-c375-73d1-8e4c-ecdc94835a74` no painel da fal. Não consultei, porque precisa da chave.
- **Nada publicado hoje mexe nesse caminho:** o diff cbc82fadc..6f75a2028 não toca `kling4Trial*`, nem a reserva, nem o varredor.
- O tempo antes do envio foi de 89 s: folha de 51 s, críticos regerando 2 stills, juiz e A2. O relógio do Kling só começa no `submitted_at`.
- **Dinheiro:** pagamos o Kling 4 (aceito) e mais os 3 H3. Isso explica a fal ter descontado US$ 9,83 contra US$ 8,01 no banco.

## (c) Por que a ficha reprovada não agiu
- O passo (`route.ts:8368`) mora **dentro** do bloco do A2 (`route.ts:8354`), que só roda com descrição em todas as seções. No caminho de hoje o bloco não roda, e a ficha errada vai ao motor.
- O `juiz_plano_verdict` das 02:46:23 é o juiz final em 'observe' (`route.ts:8446`), depois do envio: não decide nada.
- O juiz que conta já tinha reprovado às 02:45:08 (`juiz_plano_ficha_antes`: JUDGED, `a_ficha`, nota 75), antes das imagens. Esse veredito não é usado pela ficha reprovada.

## (d) Vídeo deitado
- Os 3 clipes H3 do filme 3 (`minimax/h3-max-turbo/text-to-video`, `aspect_ratio: '9:16'`, que o schema da fal aceita) têm 768×1344 e nenhuma marca de rotação. Mesmo assim, os planos 1 e 3 vieram com a cena deitada dentro do quadro e o 2 veio certo. A montagem não gira nada (`fit: cover`, sem rotação).
- **Cliente, o filme pedido** (o único seedance15_fallback nas 12 h antes do deploy): **8cc34237** (19/11 18:41). Foi pelo H3 **com imagem** (image-to-video) e os 3 clipes estão em pé. **Não saiu deitado.**
- **Mas o defeito existe em cliente.** Nos 30 dias houve 2 reservas de cliente pelo H3 só de texto:
  - **eec8a2d3** (17/11 18:04, motivo provider_failed): **2 dos 4 clipes deitados, os dois no filme entregue**;
  - 5910c0e8 (13/11): 3 em pé.
- Medido assim: H3 só de texto = 4 de 10 clipes deitados; H3 com imagem = 0 de 3 (amostra pequena).
- O H3 só de texto entra quando falta imagem aprovada em alguma cena (`modeloDaReservaDoTeste`). Foi o caso do filme 3: 2 stills reprovados pelo crítico.

## (e) "Parado" 14 min
- Esperado com a regra de hoje: 12 min esperando o Kling, ~1 min de H3, depois a montagem.
- O varredor é quem anda quando não há tela; com a tela aberta, o poll faz o mesmo.
- Os filmes 1 e 2 também foram montados pelo varredor (7,5 e 10 min), porque o POST pelo console não deixa tela.

## (f) Cliente comum
- Tudo o que é novo está atrás de `isDryRunAccount`:
  - A1, A2 e portão: 'internal';
  - ficha reprovada: 'internal';
  - leitor seguro: 'internal', com `contaDaCasa`;
  - segunda leitura e idade: 'off';
  - 'sem_ficha' existe mas não está ligado.
- Para o cliente, `rastro1911` é null, o claim não muda, o evento do elenco é o da main e o leitor é o de antes.
- O banco confirma: desde 02:22 só houve os 3 filmes do fundador.

## Consertos propostos (nada construído; cada um com interruptor, guardião e revisor)
1. **[TOPO, cliente] Reserva sempre com imagem.** Quando faltar imagem aprovada numa cena, desenhar a imagem-chave 9:16 dela (~US$ 0,03 por cena) e usar o H3 image-to-video em todas as cenas; o H3 só de texto sai da reserva. Alternativa mais barata: um leitor de 1 quadro (gpt-4o-mini, ~US$ 0,001) que detecta a cena deitada e pede o clipe de novo uma vez. Recomendo o 1º: o 2º reduz, não elimina.
2. **A ficha reprovada também no caminho de hoje.** O passo sai de dentro do bloco do A2 e passa a rodar para todo filme Kling 4 grátis com ficha ligada. O veredito usado é o do `juiz_plano_ficha_antes` (já existe, antes das imagens). Com ele, o filme 3 iria sem a identidade errada mesmo caindo no caminho de hoje.
3. **A ficha antes da imagem** (a proposta A do doc da imagem). Com o `juiz_plano_ficha_antes` reprovando, tirar âncoras e origem nas cenas longas ANTES de desenhar as imagens e de medir se a descrição cabe. A ficha volta ao tamanho do ensaio e o A2 não cai por espaço.
4. **O ensaio só vale como prova para filme sem folha.** No doc da prova C: filme COM personagem exige conferir o caminho no pago, nunca só no ensaio.
5. **Fora deste caso, mas visto aqui:** a montagem usa a URL da fal dos clipes (`v3b.fal.media`), que expira. A regra "toda mídia gerada fica no nosso bucket" não vale nesse caminho do varredor. Fica anotado, sem conferir mais.
