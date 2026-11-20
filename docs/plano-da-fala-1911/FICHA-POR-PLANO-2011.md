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
