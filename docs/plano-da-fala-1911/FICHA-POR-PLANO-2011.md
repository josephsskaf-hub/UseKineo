# Ficha antes da imagem, com o corte por plano (20/11)

Decisão da CEO em 20/11: opção A da medição do `descricao_nao_cabe` (PROPOSTAS-FILME-3.md §10). Código: `KINEO-FICHA-POR-PLANO-2011`.

## O furo
- O juiz que roda antes das imagens (`juiz_plano_ficha_antes`) aponta o plano em que a ficha contradiz o pedido.
- Só a ordem "The only person in this shot…" era refeita. Se a ficha estava na cláusula travada ("The same main character appears… consistent design:") ou no elenco nomeado ("Named character in this shot: …"), o plano ficava `nada`.
- No Kling 4 essas duas formas viram `Identity:` e `Visible:`.
- **Em 30 dias:** 18 de 188 filmes julgados tiveram plano marcado e não refeito, num total de 26 planos.
- **O exemplo é o Natal 8e83778f:** nos planos 2 e 3, "Identity: Daniel … an American woman", e o Daniel só aparece nas fotos.
- **O efeito:** a ficha errada ia à imagem-chave e ao motor, e comia de 134 a 165 dos 430 caracteres do plano.

## O conserto (atrás de `FICHA_POR_PLANO_2011`)
- O plano apontado, com a acusação verificada pelo juiz, perde a sua ficha inteira **antes das imagens-chave**: a ordem, a cláusula travada, `Identity:`/`Visible:`, o elenco nomeado e a ficha repetida no fim.
- Ficam a ação, a época, as feições da origem, a moldura e a proteção do fim.
- A pessoa da ideia (ação `ideia`, as palavras do cliente) não é cortada, porque é a ficha certa.
- Acusação não verificada pelo juiz, ou juiz que julgou outro número de planos: nada muda.
- Para cortar, reusa a máscara e o corte de `fichaReprovada1911.ts` (`semFichaDoPlano`). Diferente de `semFicha`, mantém as feições.
- O relato vai no evento `juiz_plano_ficha_antes`, já só do servidor: `refeitos[].acao = 'sem_ficha_do_plano'`, `ficha_cortada` e `ficha_por_plano: true`. Desligado, o relato é o de sempre.

## O que a prova mostra (`scripts/test-ficha-por-plano-2011.mjs`, 11 mutantes)
- **Desligado:** é byte a byte a 7977337f9, nos prompts e no relato.
- **Natal:** os planos 1 a 3 perdem cerca de 200 caracteres de ficha (424 → 222, 457 → 255, 456 → 254), e a ação da Emily fica inteira.
- **3 dos 18 filmes, com os prompts de cena reais:** a ação que cabe no plano do Kling 4 sobe.

| Filme | Ação que cabe no plano (caracteres) |
|---|---|
| f7656858 | 140 → 249 |
| c92b352b | 118 → 300 |
| 62fc7ab6 | 134 → 315, 136 → 317, 123 → 312 |

## Interruptor
- `'internal'` no commit: só a conta exata do ensaio (`isDryRunAccount`).
- `'public'` só com revisor independente, prova e o sim.
- Desligar: `'off'`.

## Limites
- **O furo do sem ficha:** com o corte ligado para cliente, um filme cuja ficha saiu de todas as cenas deixa de ter ficha e entra no A1/A2 (`'sem_ficha'`). Isso pede o revisor antes do `'public'`.
- **A (i) não foi feita.** Cortar o descritor gpt-4o nos filmes com personagem fixo não tem sinal cedo:
  - `personagem.ativo` da rota é `!tagFaceless && !estrela`, quase todo filme;
  - o `personagem` do claim, que previu a ficha em 56 de 56, só nasce no bloco da folha, depois das cenas;
  - pôr o descritor em série depois das cenas soma de 3 a 6 s ao filme, para poupar cerca de US$ 0,18 por semana.

## v2 [revisor 20/11, rv21: volta pequena]
1. **A trava do elenco e a folha não devolvem o corte.** A rota guarda, antes de trocar os prompts, os planos cortados e os trechos que saíram (`guardarFichaCortada`). No bloco da folha:
   - a trava (`garantirFichasNoPrompt`) não toca no plano cortado;
   - quem teve a ficha cortada sai do elenco da folha (`elencoSemFichaCortada`, pelo nome em palavra inteira num trecho cortado). Ele fica sem folha e sem still com folha, e a cena segue com o still de texto do plano cortado;
   - o ensaio de $0 (`prompt_do_motor`) faz o mesmo.

   O cenário do revisor: o plano "A man opens the door of a vintage shop…", com a fala "Daniel opens the shop door.", continua cortado depois da trava.
2. **O elenco recorrente da cena** ("Recurring characters, identical face, hair and costume in every scene where they appear: …") também sai. São os casos reais 224c4659 (planos 1 a 3) e c06af33d (plano 2).

## Proposta, não construída: cortar só quem contradiz
**O problema (replay do revisor):** dos 106 planos cortados, 13 tinham 2 ou mais pessoas no elenco e todas saíram. Em 8, o nome cortado está na própria fala da cena.

**O que dá para inferir:** o juiz não devolve o nome, mas cada acusação cita a ficha ("plano N · ficha contradiz "<o que a história diz>": "<a ficha no texto>"").
- No banco, em 30 dias, 80 das 91 acusações citam a ficha.
- Em 69 delas, o nome vem antes da 1ª vírgula ("…consistent design: Texas, a wolf…", "Named character in this shot: Houston, a person…").

**Opções:**
- **A (recomendada):**
  - tirar o nome da citação e cortar só o trecho daquela pessoa: a cláusula dela, o item dela na lista "Named characters: A; B" ou "the A is …; the B is …", ou a ordem, se for ela;
  - se a pessoa cortada está na fala da cena, em vez do corte inteiro, usar `semAncorasDaFolha`: saem as âncoras lidas da folha e a origem, que nós acrescentamos, e ficam as palavras do autor. O juiz relê dentro do prazo do A2;
  - citação sem nome, ou com nome que não casa com o elenco: o corte de todos, como na v2.
- **B:** só o corte por pessoa, sem o caso da fala.
- **C:** manter a v2 (todos saem), que é segura, mas apaga a pessoa certa nos filmes com 2 ou mais pessoas.

**O risco da A:** a citação é cortada em cerca de 100 caracteres, e um nome composto ou com artigo ("the boy") pede casar pelo núcleo do elenco. A prova seria um replay das 91 acusações antes de construir.

## v3 [revisor 20/11, rv22: volta pequena]
- **Só o dono da ficha cortada sai do elenco da folha:** é o nome que abre a ficha depois do rótulo ("consistent design: Sarah, …", "Identity: …", a ordem, "Named character in this shot: Aaron, …", "the boy is …"). O nome mais longo vem primeiro, sem caixa e em palavra inteira (`donoDaFicha`).
- **Antes, qualquer nome dentro do trecho saía:** a "Ana" caía junto com a "Ana Maria"; o Daniel caía com "Sarah, Daniel's wife"; o Ben caía com "Aaron, a soldier; Ben, a medic".
- **O plano cortado não ganha still com folha:** a folha de quem ficou no elenco (o Ben do b6) não vai ao plano cuja ficha foi cortada. Esse plano segue com o still de texto.

**Limite (dito, não escondido):** o personagem cortado em um plano perde a folha no filme inteiro. Os outros planos dele seguem com a ficha de texto, a mesma que foi reprovada, no caso c: o Daniel cortado no plano 1 continua com a ficha dele, só em texto, no plano 2. É isso que justifica a proposta A acima (corte por pessoa, com o nome tirado da citação do juiz). O replay das 91 acusações fica para quando a CEO chamar.
