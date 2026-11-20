# KINEO-LEITOR-SEGURO-1411 · Divisão 2 · 14/11/2026

**Pedido da CEO (aprovado com 4 acréscimos):** o leitor semântico do elenco faltou em 32 de 203 filmes em 30 dias (16%); em 7 dias, 25 de 168.
- **Tempo de resposta:** "falhou" leva 5,1 s em média (p90 6,0 s, o teto); "ok" leva 1,7 s (p90 3,2 s).
- **Sem o leitor:** o filme cai na reserva sem modelo. Foi o caso do Paris do Logan (d7817298), de Navy e Juneau (77c923a8) e de "Text" e "Rover" como gente.

## Causa (lib/cinematic/elencoSemantico.ts)
- 4 s por tentativa e 6 s para as duas juntas. Quando a 1ª passa de 4 s, a 2ª só tem ~2 s.
- Dos 32: 27 bateram o teto (6.001–6.003 ms) e 5 falharam rápido (rede ou HTTP), mesmo com a repetição.

## A regra (interruptor `LEITOR_SEGURO_1411`: 'off' | 'internal' | 'all'; o commit nasce 'off' = a main byte a byte · CEO 19/11; na integração da prova C, 20/11: 'internal')
- **'internal'** = só a conta exata do ensaio (isDryRunAccount), para a CEO provar antes do sim do dono. **'all'** pega TODO filme da rota, pago também. Cliente em 'internal' = a main byte a byte.
- **Pedido de segurança:** a 1ª chamada sai na hora. Se não respondeu em 3,5 s, sai uma 2ª IGUAL em paralelo, e fica a primeira VÁLIDA.
- **Tetos:** 7 s por chamada e 9 s no total. O total vem do fato de cada chamada só receber o tempo que resta, inclusive as repetições.
- **Falha rápida** (rede, HTTP): repete na hora, até 2 vezes, com 250 ms de respiro.
- **429 (limite de taxa):** UMA repetição, depois de 1 s. Duas em 0,5 s batiam no mesmo limite, e nenhuma deixaria o filme sem elenco num pico curto (a main de hoje repete uma vez). O 2º 429 encerra.
- **Nunca mais de 4 chamadas** por leitura. Sem o limite, o pior filme tinha 5 (1ª lenta e inválida aos 5 s, 2ª e 3ª 503, 4ª inválida com a 1ª no ar, e o B disparava a 5ª).
- **O relógio de 9 s** fecha a leitura mesmo com um fetch, ou o corpo da resposta, que ignora o abort; cada chamada solta no seu prazo de 7 s pela mesma razão.
- **A perdedora:** é ignorada em silêncio. Resposta atrasada, erro ou JSON ruim não troca o elenco escolhido; ao terminar, as chamadas no ar são abortadas e nada lança.
- **A 1ª com JSON inválido:** espera a 2ª, se ela estiver no ar. Sem outra no ar, UMA tentativa a mais, se sobra 1 s do orçamento (opção B, CEO 19/11). Limite: a chamada é a temperature 0, então a tentativa pode repetir a mesma resposta.
- **Filme rápido:** UMA chamada, o mesmo custo.
- **Evento `cinematic_cast_checked`:** com o leitor seguro ligado, grava também `tentativas`, `tentativas_paralelas`, `venceu` (1 a 4), `quem_venceu` (principal, seguranca, repeticao ou B: sem cruzar) e `motivos` ("1:prazo", "2:json", "1:rede"…). Com ele ligado, a `version` passa a `so_gente_na_ficha_0411_v1+leitor_seguro_1411_v2` (o antes × depois separa pela versão). Desligado, o evento é o da main, sem esses campos e com a versão de sempre.

## Números honestos (7 dias: 254 leituras; 221 ok, 25 falhou, 8 JSON inválido)
- **Custo por chamada:** cerca de US$ 0,0004 (gpt-4o-mini; ~1.930 tokens de entrada e ~150 de saída, estimados pelo tamanho do texto em 327 casos da calibração, sem usage medido).
- **Chamadas a mais:** o pedido de segurança sai nos filmes em que a 1ª passa de 3,5 s (os 25 que falharam por prazo e uns 5 a 9 dos ok, que vão até 4,0 s); o B soma até 8; a falha rápida, até 5. São ~45 chamadas a mais em 254 filmes, ~0,18 por filme.
- **Custo médio por filme:** + US$ 0,00007 (~US$ 0,02 por semana nesse volume). Pior filme: 4 chamadas (o limite), ~US$ 0,0016.
- **Atraso:** o p50 (1,5 s) e o p90 (3,0 s) não mudam, porque abaixo de 3,5 s sai uma chamada só. Muda a cauda. Hoje o filme que falha espera 6,0 s e fica sem elenco. Com a regra, ele tende a sair com elenco em ~5 s (3,5 s + a 2ª chamada). Se as duas penduram, espera 9 s, 3 s a mais que hoje, e segue como hoje (sem elenco, determinístico).
- **Ligar para cliente** = gasto e atraso em todo filme: pede o sim do dono.

## Medida de sucesso (a CEO confere 7 dias depois de publicado)
"falhou" cair de 16% para 2% ou menos.

## Guardiões
- **`scripts/test-leitor-seguro-1411.mjs`:** 39 ok, com fetch falso e a resposta REAL gravada do caso "prod-max". As provas ligam a cópia carregada em 'all'. Cobre:
  - tempos curtos: filme rápido com 1 chamada; a 1ª lenta com a de segurança vencendo e a perdedora ABORTADA; a 1ª inválida esperando a 2ª; rede e HTTP com 2 repetições; a segurança só com uma chamada no ar; as duas estourando no teto; a opção B (e sem 1 s de folga, nenhuma tentativa a mais); o "cinco" do revisor, que para em 4;
  - constantes reais: a 1ª de 5 s e a de segurança em ~3,7 s; as penduradas soltando aos 9 s; o prazo de 7 s com fetch que IGNORA o abort ("1:prazo", a de segurança vence aos 8 s); o relógio de 9 s com o corpo da resposta pendurado; o respiro de ~250 ms; o 429 repetindo uma vez depois de 1 s, e o 2º 429 encerrando; nunca mais de 2 no ar, caso a caso;
  - 'off' e 'internal' com cliente = a lib da origin/main em 6 casos (inclusive 429); 'internal' com a conta do ensaio = o leitor seguro; a linha do evento é a da main + o espalhamento e a versão condicionais;
  - 31 mutantes vermelhos, inclusive os 10 do revisor independente (rv11) e "nasce ligado", "internal para todos", "evento sem quem venceu", "versão nova sempre".
- **`test-protagonista-seedance-0111`:** igual ao da main (2 chamadas na rede), porque o commit é 'off'. A falha antiga do caso "Mila" já era vermelha na main e não muda.
