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
