# Ensaio no corpus: KINEO-QUEM-ESTA-NA-CENA-1411 · Divisão 2 · 14/11/2026

Pedido da CEO depois da Earhart refeita com o 1b v2 no ar (job 72f3b718, nota 6). Três defeitos da mesma família:
1. **Ilha:** um homem de chapéu e terno.
2. **Cena dos navios:** uma mulher de óculos de voo com outro rosto.
3. **Cena 2:** a Amelia sem ficha.

**PASS ao vivo pendente:** a CEO refaz a Earhart depois de publicado (~US$ 2) e olha os quadros.

## As causas, no código real (reproduzidas offline com os planos e as falas do claim)

**1. Ilha.** O plano dizia "Wide shot of Howland Island… with no other objects or people".
- O detector de gente (`visualMostraAlguem`, lib/cinematic/personagemAjuste.ts) lia a palavra "people" como alguém no quadro.
- A negação antiga só conhecia "no people" colado. Por isso a cena não foi marcada (`cenas_sem_gente = []`).
- Sem a marca, a cena levou a roupa da época do 1b v2, a frase "The main person, if one is shown…" e "characters act naturally…".

**2. Navios.** Não existe regra de "cena final leva protagonista". É a regra da fala (`cenasDoElenco`): quando o plano mostra alguém sem nome, ela põe na cena quem a narração cita ("Where did Amelia Earhart go").
- **Hoje (72f3b718):** o "alguém" era a palavra negada "no other objects or people".
- **No render anterior (9a8cc918):** era "their silhouettes visible against the waves… as they comb the waters", as silhuetas e o "they" dos navios.
- **O rosto diferente:** o still com a folha foi reprovado pelo crítico, e o juiz da ficha (`julgarSemFolha`, KINEO-JUIZ-FICHA-2710) escolheu o still de texto puro (`texto_ficha`).

**3. Cena 2.** "Amelia climbs into her plane…" não casava a ficha "Amelia Earhart". O casador por cena (`citaNaCena`, lib/cinematic/folhaDePersonagem.ts) só aceitava o nome inteiro ou o núcleo. Com isso, os mecânicos viraram o "main character" da cena.

## A regra (interruptor `QUEM_ESTA_NA_CENA_1411` em lib/cinematic/folhaDePersonagem.ts; 'off' = o de antes)

**(i) Gente negada não é gente no plano.** Antes de procurar gente, saem do texto do plano:
- **a gente negada:** "no other objects or people", "no people seen from behind as distant silhouettes", "without any people", "no signs of life", "nobody", "uninhabited";
- **a gente que já foi:** "where the crew once stood";
- **a silhueta que é de coisa:** "their silhouettes", "silhouettes of ships".

Como cada caso é tratado:
- Um item de lista só conta como negado com vírgula, "or" ou "and" depois. "No cars but many people walking" continua gente.
- Só a negação tira gente. "Two soldiers walk through the deserted street" deixa de virar plano vazio por causa de "deserted".
- O prompt que o código já marcou ("No people, no human figures and no faces anywhere in this shot.") é sempre "ninguém", em toda passada seguinte (a trava de elenco, a ficha garantida, a regra da fala).

**(ii) A regra da fala só põe a pessoa da narração quando o plano mostra alguém.** Gente negada e silhueta de coisa não contam. "They/their/them" do plano também não contam, porque costumam ser os navios ou os aviões.
- A cena marcada não ganha a pessoa da fala.
- A cena marcada já não leva nenhuma frase de gente. Conferido nas 62 cenas marcadas do corpus: nenhuma tem a frase de origem, nem "characters act naturally", nem a roupa; "every person…" vira a trava curta.

**(iii) O primeiro nome e o sobrenome casam a ficha** ("Amelia climbs" casa Amelia Earhart; "Roland Oznard" casa Roland Pernicus Oznard). Valem três condições:
- o nome da ficha tem 2 ou mais palavras com maiúscula;
- a parte não é título ("Captain", "Dr", "King"…) e nenhum outro do elenco a tem (dois Johns não casam);
- a parte não está colada a outro nome com maiúscula ("Amelia Johnson" é outra pessoa).

## Corpus de 30 dias

**Gente negada sem a marca: 64 cenas de 1.777.**
- **3 em filmes com elenco** (onde a marca roda): as duas da Earhart 72f3b718 e a de Hiroshima em 784d1f57.
- **As outras 61 são de filmes sem elenco.** Lá a marca não roda: é o item da fila "marca sem gente em filme sem elenco", que este lote não muda.

**Antes × depois** em 94 filmes com elenco e 337 cenas, com o mesmo código e o interruptor desligado e ligado. Cada mudança foi lida contra o claim de produção:
- **Marcadas sem gente que não eram (5), todas certas:**
  - Earhart 72f3b718: a ilha e os navios;
  - Flight 19 (2f34daf3) c5: chamas vistas do convés, com silhuetas de seis aviões;
  - baleias (0e5b27e5) c1 e c9: o oceano com a silhueta das ilhas e a da baleia.
- **Marcadas que perdem a marca: 0 em produção.** As 4 que a simulação mostra (a mão no botão do elevador, o rosto do soldado, a jaqueta da Mara, os personagens Among e Lucifer) não eram marcadas em produção. Aparecem só porque o ensaio não tem o núcleo real das fichas, e com o lote continuam sem marca.
- **Ficha nova em cena: 3, todas certas.** A Amelia na cena 2 das duas Earhart (72f3b718 e 9a8cc918) e o Roland Oznard em 215e1fc0 c1. As outras 28 que a simulação mostra já tinham a ficha em produção.
- **Ficha que sai: 2, as duas certas.** A Amelia nas cenas dos navios de 72f3b718 e 9a8cc918.

## A frase negativa "No people, no human figures and no faces anywhere in this shot." puxa gente?
O corpus não responde.
- O crítico de imagem só olhou 5 das cenas marcadas.
- As 2 em que ele apontou "pessoa" (365ef281 c1 e c6) tinham a ficha da protagonista no mesmo prompt, um prompt contraditório. Não testam a frase sozinha.
- As outras 3 não apontaram gente.

**Pedido de teste pago pequeno (CEO):** dois stills do mesmo plano da ilha, (a) com a marca negativa e (b) com uma frase positiva. Exemplo de (b): "The shot shows only the place itself: sand, sea and sky." Custo de 2 stills.

## O que não muda neste lote (próximo, com números)
O juiz da ficha troca o still COM folha pelo de texto puro quando o crítico reprova o da folha.
- **Últimos 30 dias:** 57 vezes (33 filmes) ficou o de texto puro, contra 27 em que ficou a folha.
- **Em toda a trava:** 77 cenas com elenco foram em `texto_ficha`; 5 delas eram cenas marcadas sem gente.
- **Efeito:** é a causa de "outro rosto" quando a pessoa ESTÁ no plano.
- **Mudança proposta, em lote próprio:** quando a cena é do protagonista nomeado, o juiz refaz com a folha em vez de largar a referência.

## Guardião
`scripts/test-quem-esta-na-cena-1411.mjs`: 14 ok, 12 mutantes vermelhos.
- Earhart 72f3b718 e 9a8cc918.
- Quem o plano mostra continua.
- O primeiro nome (com "Amelia Johnson", dois Johns e título).
- Os casos do corpus.
- O interruptor 'off'.

`scripts/test-cena-sem-gente-1411.mjs`: o mutante C foi reancorado, e isso está avisado à CEO. A âncora antiga ("deserted vence") não existe com a regra ligada. O mutante agora tira a nova proteção (a gente que já foi volta a contar) e fica vermelho.

## v2 (14/11) · bloqueio do revisor e da CEO: gente presente sumia
O e1a6af441 foi bloqueado por três pontos. A negação, que passou inteira e melhorou vários casos, ficou como estava.

**1. A silhueta saía por exclusão (lista curta de gente).** Sumiam:
- "silhouettes of dancers / fishermen / riders / monks / workers / kids";
- "The silhouettes of two lovers";
- "Their silhouettes dance on the wall".

Agora a silhueta só sai com PROVA de coisa:
- **"silhouette(s) of":** só quando o que vem depois é artigo, número, adjetivo de tamanho ou cor, ou nome próprio, seguido de uma coisa da lista (navio, avião, montanha, ilha, baleia…).
- **"their silhouettes":** só quando o último PLURAL antes, na mesma frase, é coisa da lista ("navy ships and planes…, their silhouettes"). "Two lovers walk on the bridge, their silhouettes" fica gente, porque o plural é "lovers"; "bridge" é singular e não conta.
- **"its silhouette":** ficou como na main.
- **O que a lista faz:** a lista de coisas só TIRA gente. O que está fora dela é gente, como na main.
- **Se o render 9a8cc918 precisa disso** (pergunta da CEO): sim. A regra da fala ignora "they/their", mas a palavra "silhouettes" sozinha ainda contava como gente e punha a Amelia.

**2. A camada de época tirava a marca.** Pela rota, a cena dos navios era marcada pelo ajuste. Mas `aplicarElencoEEpoca` tirava a marca (de propósito, desde KINEO-ELENCO-EPOCA-2710) e punha "Named character in this shot: Amelia Earhart" porque a fala a cita; depois a linha de época vestia a cena.
- Agora (interruptor `MARCA_MANDA_NA_EPOCA_1411`), a cena marcada não recebe ninguém pela fala nem pela posição.
- O protagonista que não está em prompt nenhum entra na 1ª cena NÃO marcada.
- O guardião roda o caso real pela rota (ajuste + camada de época, os 4 planos e as falas do 72f3b718): as cenas 3 e 4 saem só com a marca, sem ficha e sem roupa.

**3. O primeiro nome casava palavra comum.** Casavam "Rose petals", "Will the storm", "June 2, 1937", "In June the rains", "May 1937", "Grace fills", "Hope fades", "A Bill of sale". Agora a parte do nome só casa:
- **Em papel de pessoa logo depois dela:**
  - verbo de gente, com advérbio e "is/was" opcionais;
  - aposto (", the inventor");
  - posse de corpo ("Mara's hands").
- **Nunca quando é palavra comum:** mês, flor, virtude, cor, lugar.
- **Nunca seguida de número.**

As listas só restringem o casamento novo; fora delas vale a main. "Earhart's silver plane" (a coisa dela) e "the Earhart search" não casam. "Amelia climbs", "Earhart checks the radio", "Roland Oznard, a gruff old man" casam.

**4. Menores.**
- "not a single / not one / not another / not any" + gente agora é negação.
- **"The house where she once lived":** a decisão é tirar a Sarah. O plano mostra a casa, e "once lived" diz que ela já não está ali. Se a cena a mostra ("now she stands at the door"), o "she stands" a mantém.
- **A regra de exceção ("Nobody but the captain") foi tirada.** A negação só apaga a frase negada, e quem vem depois do "but/except" já fica no texto. O mutante da exceção sobrevivia, então era regra sem efeito.

**Corpus (os mesmos 94 filmes com elenco e 337 cenas):** igual à v1 contra a produção.
- 5 cenas passam a ser marcadas, todas certas.
- 0 perdem a marca em produção.
- 3 fichas novas certas.
- 2 fichas tiradas certas.

**Guardião** `scripts/test-quem-esta-na-cena-1411.mjs`: 20 ok, 18 mutantes vermelhos. A seção (G) tem as 9 silhuetas de gente; a (H) tem 12 falsos e 4 certos do primeiro nome; a (I) tem a Earhart pela rota.
