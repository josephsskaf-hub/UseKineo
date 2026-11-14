# Ensaio no corpus — KINEO-CENA-SEM-GENTE-1411 (lote 1: casos C e D) · Divisão 2 · 14/11/2026

Código: `lib/cinematic/personagemAjuste.ts` (v2, lista fechada), executado offline sobre o que o claim gravou. Script do ensaio: `scripts/test-cena-sem-gente-1411.mjs` (os casos) e a contagem abaixo.

## Universo
- `cinematic_submission_claim` dos últimos 30 dias: 1.773 planos em 516 filmes.
- Planos que saíram com "No people, no human figures and no faces anywhere in this shot.": **61, em 26 filmes**. Só estes podem mudar: a regra C só tira a cláusula de quem a tinha, e a D só troca a época de quem a tem.
- Desses, 12 levavam também a trava de época longa.

## Resultado
- **C (deixa de ser "sem gente"): 19 planos.** Os 19 descrevem gente. Nenhum plano sem gente perdeu a cláusula.
- **D (época curta no plano sem gente): 9 planos.** Os 9 são sem gente. Os outros 3 dos 12 com época viraram "com gente" pelo C e ficam com a época longa (certo).
- **Inalterados: 33.**

## Os 28 que mudam, lidos um a um

| filme | cena | regra | plano (ação) | leitura |
|---|---|---|---|---|
| 0e5b27e5 | 2 | C | Close-up of scientists on a boat, equipped with satellite tags… | certo: gente |
| 0e5b27e5 | 3 | C | Close-up of scientists on a boat, holding satellite tags… | certo |
| 15b67467 | 1 | C | Aerial shot revealing archaeologists carefully digging at an old cemetery… | certo |
| 15b67467 | 7 | C | Close-up of skeletal remains with a researcher examining them… | certo |
| 15b67467 | 8 | C | Medium shot of researchers discussing findings… | certo |
| 2dab659c | 5 | C | Close-up of astronauts filling out forms in microgravity… | certo |
| 2f34daf3 | 1 | C | A low-angle shot captures fourteen young airmen … boarding five Avenger torpedo bombers… (Flight 19) | certo: o caso |
| 2f34daf3 | 2 | C | (o mesmo, outro ângulo) | certo |
| 365ef281 | 1 | C | A busy professional in a dimly lit room, looking at a dirty Range Rover… | certo |
| 5068ac7d | 9 | C | A close-up of one candidate celebrating while the other looks determined, both on stage… | certo |
| 58f63487 | 2 | C | Wide shot of scientists on a boat… | certo |
| 58f63487 | 3 | C | Close-up of a scientist holding a satellite tag… | certo |
| 5a5d52b3 | 3 | C | … with startled neighbors peering through their windows. | certo |
| 5e9123e4 | 4 | C | A commanding officer stands with a serious expression… | certo |
| 9aee4f6d | 8 | C | … a group of veterans in military uniforms standing together… | certo |
| 9dbe1523 | 3 | C | … showcasing farmers planting seeds… | certo (e fica com a época longa) |
| 9dbe1523 | 4 | C | A dynamic sequence of farmers harvesting crops… | certo (idem) |
| 9dbe1523 | 6 | C | … a farmer's market bustling with activity, vendors shouting… | certo ("vendors"; "farmer's" é posse e não conta) |
| cbae855c | 7 | C | Close-up of the expert examining a fossil… | certo |
| 423b41dc | 3 | D | A wide shot of a small fishing boat navigating through turbulent waters, the lighthouse's beam… | certo: sem gente |
| 794a8d41 | 1 | D | A wide aerial shot of the Louvre's grand exterior at dawn… "iconic glass pyramid" | neutro: sem gente; a pirâmide (1989) num filme de 1911 é defeito do próprio plano, com ou sem a trava longa |
| 794a8d41 | 3 | D | Close-up of a white work smock on a hook, the Mona Lisa's frame… | certo |
| 794a8d41 | 6 | D | A macro shot of a dusty trunk in a shadowy room… | certo |
| 8067dfdf | 2 | D | The donkey, now faded and less vibrant, stands alone in a dimly lit room… (desenho) | certo |
| 9dbe1523 | 2 | D | A close-up of a historical building with a sign indicating it is Congress… | certo |
| a7def2bc | 2 | D | Aerial view of a gleaming silver twin-engine plane soaring over the Pacific… (Earhart) | certo |
| a7def2bc | 3 | D | Wide shot of Howland Island, a tiny sandy strip in the ocean… (Earhart) | certo: o caso |
| a7def2bc | 4 | D | A dramatic scene of American ships and planes searching the blue ocean… | certo |

Zero plano com gente perdeu a gente. Zero plano sem gente perdeu a cláusula.

## Os 33 inalterados que testam a regra
A ilha e o oceano; "deserted deck … where the crew once stood" (Mary Celeste: a negação vence); "a memorial honoring veterans" (referência); "a digital display showing one candidate" (referência); as ruínas "ancient Roman stone streets" (Pompeia); "a potato in a manager's suit" e "Potato manager in suit" (a batata: "manager" saiu da lista).

## v2 depois da revisão independente (14/11, item 5)
A v1 usava o sufixo aberto -man/-men e papéis largos (humans, adults, natives, presidents, emperors, pharaohs, elders, mechanics). Eles tiravam o "No people" de planos SEM gente fora do corpus: Sherman tank, dolmen, Cayman Islands, snowman, a human skull, an adult bald eagle, native flowers, Bremen, Pullman car, Mount Rushmore, "the General Sherman tree" (do corpus). A v2 usa uma lista fechada de compostos (airmen, firemen, policemen, fishermen, crewmen, seamen, horsemen, workmen…) e tira os papéis largos. A contagem do corpus é a mesma (19 + 9). Os falsos positivos do revisor são cenários do guardião.

## v3 depois da 2ª revisão independente (14/11)
- "mechanics" volta no plural: "Ten young mechanics in grey overalls push the silver twin-engine plane", do roteiro de validação, tem gente. "the mechanics of a watch" segue sem gente, porque papel + "of" + coisa é o funcionamento.
- Entram pilots, lumberjacks, cowboys, cowgirls, laborers/labourers, dockworkers, dockers, porters e clergymen.
- A lista NAO_E_GENTE saiu: com a lista fechada, ela era código morto.
- Corpus de 30 dias, depois da v3: a mesma contagem (19 por C, 9 por D). Nenhuma das palavras novas aparece nos 61 planos com a cláusula.
- Ainda perdem o "No people", anotados e sem conserto: "crew quarters empty", "photographs of miners", "statue of the explorers", "seats where the spectators once sat". O papel aparece como dono, retrato ou ausência, e a regra não lê isso.
