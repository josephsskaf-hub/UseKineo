# Meta 95 — o filtro anti-invenção não apaga mais o assunto (19/10/2026)

Entrega `KINEO-META95-ASSUNTO-1910` [TRAVA 8.2 — vai do fundador 19/10 "Vai pra meta do 95"]. Conserta a causa C2 do
`docs/DIAGNOSTICO-META-95-2026-10-19.md` (raspagem do cenário em 51% dos filmes abaixo de 95, contra 8% dos ≥95) e os buracos
na fala da causa C1.

## O defeito

O filtro determinístico `scrubInventedSetting` (lib/cinematic/visualPromptPolicy.ts) comparava o prompt da cena, escrito em
inglês pelo descritor, com as PALAVRAS do pedido e da fala, na língua da pessoa. Resultado:

- `4a2e21ee` (turco): "Ottoman" apagado porque o pedido dizia "Osmanlı" — trono vazio, sultão nunca aparece;
- `2f3692ff` (português, roteiro da IA no servidor): "Bermuda Triangle" apagado da cena e, na fala, "No Oceano, em, um
  submarino… Em, cientistas… O : uma área" — a legenda mostrou "NO OCEANO EM UM";
- `7ef91122`: "In the year, a mysterious disappearance…" (legenda "IN THE YEAR");
- `9de38488` (hindi): "साल पुरानी" com o número apagado;
- `a0b58200` (urdu): o nome inventado da moça saiu e sobrou "of confidently posing in front of the iconic at sunrise",
  "no , no added props".

## O conserto (código, sem render)

1. **Assunto traduzido** (`lib/cinematic/assuntoTraduzido.ts`): quando a língua do filme não é inglês ou o texto tem escrita
   não latina, UMA chamada gpt-4o-mini (temperatura 0, prazo 6 s, ~US$ 0,0002) devolve o pedido em inglês + os nomes
   próprios em grafia inglesa. O filtro lê o contexto de sempre + isso. Falhou → o filtro NÃO apaga naquele filme (na
   dúvida, o assunto fica) e o evento `cinematic_dispatch_result.subject_translation` registra `filtro_pulado`.
   Inglês puro: nenhuma chamada, a estrada de sempre byte a byte.
2. **Comparação normalizada** (visualPromptPolicy.ts): acento, i sem ponto (İ/ı), ß/æ/ø/ł, plural de um lado só, sufixo
   com apóstrofo ("Timur'un", "Devri'ne"). "Bermudas" casa com "Bermuda", "İstanbul" com "Istanbul", "Tomás" com "Tomas".
3. **Fala sem buraco** (`lib/cinematic/falaSemBuraco.ts`): a varredura da fala escrita pela IA roda FRASE A FRASE. Se a
   frase filtrada ficou com buraco (palavra de função pendurada, pontuação dobrada, unidade de tempo sem número), a oração
   curta do buraco sai inteira ("In the year 1923, a…" → "A…"; "Em 2004, cientistas…" → "Cientistas…"); quando nem isso
   fecha a frase, a frase original fica como está (o fato que a IA acrescentou é melhor que uma frase quebrada).
   A fala do roteiro colado (verbatim, contrato C1) nunca passa por aqui — a varredura final do hollywood agora tem a guarda
   explícita `|| verbatim`.
4. **Restos do apagão**: nome inteiro removido depois de "of/showing/…" e antes de verbo em -ing vira "a person" (o faceless
   troca por silhueta de costas); depois de "the iconic/famous/…" vira "landmark"; "the bustling [nome]" vira "the bustling
   place"; "no [nome]," some com o "no".

Fora deste conserto: o prefixo solto "wreck," na cena 2 do `56d96151` vem de outra camada (contrato de cena/sceneTruth).

## Prova

`scripts/test-meta95-assunto-1910.mjs`: os casos reais executados na lib de hoje (verde) e na lib da base em memória
(vermelho: os mesmos buracos e apagões), 5 mutantes (normalização fora, buraco de volta, restos fora, verbatim sem guarda,
tradução ignorada), a rota nos 4 pontos do filtro de imagem e nos 2 da fala, estrada de sempre byte a byte, desfaz exato e
encadeamento (filme-rápido e trilha-15s tiram esta camada primeiro).

## Estimativa (banco, 7 dias até 19/10)

115 filmes com nota; 77 abaixo de 95; 39 deles com raspagem (16 em outra língua, 23 em inglês), 6 com buraco na fala da
IA. Casos em que o conserto muda o que vai ao motor ou à voz: ~20 filmes (os 16 em outra língua/escrita, 3 "Mohenjo-daro"
com o pedido em urdu e língua 'en', 2 por acento/"I'm", mais os 6 com buraco, com sobreposição). Pela taxa do diagnóstico
(55–65% voltam ao visual 90), ~11–13 filmes por semana cruzariam para 95. Nos 23 em inglês a raspagem era CERTA (Marriott
Marquis, Jack the Ripper, Times Square inventados): ali o ganho é só o resto limpo.
