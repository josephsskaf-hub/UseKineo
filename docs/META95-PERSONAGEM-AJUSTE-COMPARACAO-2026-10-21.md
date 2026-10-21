# Folha de personagem — ajuste: comparação A × B (21/10/2026)

**Marca:** `KINEO-META95-PERSONAGEM-AJUSTE-2010` · **Trava:** `[TRAVA 8.2 — vai do fundador 19/10 "Vai pra meta do 95"]`

Duas implementações independentes dos 6 consertos da folha de personagem (só conta interna, `formatFlags: ["personagem"]`, `PERSONAGEM_PUBLIC=false`):

- **A (Claude web):** `origin/codex/meta95-personagem-ajuste-2010` @ `1a8f1efa` (base `fbe47c46`).
- **B (Codex):** `origin/codex/meta95-personagem-ajuste-2010-codex` @ `d62bd124` (base `9d4d0ffc`).

**Vencedora: A**, com 2 ideias pequenas de B enxertadas (marcadas no código como "integração 21/10").

## Placar por defeito

| # | Defeito | A | B | Fica |
|---|---|---|---|---|
| 1 | Still fora de 9:16 / colagem de 2 painéis | Formato por extenso + proibição de painel; dimensões pelo `width/height` da fal **ou** pelo cabeçalho do arquivo (64 KB, 5 s). Fora do formato ou sem conferência → still FLUX. | Formato + proibição de painel; troca "lower third clear for captions" por cenário até a borda. Confere **só** `width/height` da fal: se a fal não mandar dimensão, **todo** still vira `format_invalid` (a folha morreria calada). | **A**, mais a troca do "lower third" de B (o pedido de terço inferior vazio contradizia o "edge to edge" e é candidato à faixa lisa). |
| 2 | Moderação barrou desenho inocente como sexual/minors | Modera o **prompt real** primeiro. Só depois de um bloqueio confere de novo, com a **mesma imagem**, e só se TUDO for verdade: elenco 100% criatura/animal; motivo **só** `sexual/minors` (nunca `sexual` nem `minor_term`); nota sexual < 0,01; sinal de menor < 0,5; nenhum termo sexual nem palavra de gente no texto; todo termo de idade colado na criatura; o texto neutro não cita menor pela régua real (`mentionsMinor`). A 2ª conferência tem de passar inteira (mesmos limiares). O 1º bloqueio continua gravado. | **Troca o texto moderado antes** de qualquer veredito, para TODO still com folha (inclusive gente): a moderação passa a ler visual + fala + fichas, não o prompt que vai à fal. Em elenco de criatura reescreve "child dinosaur" → "young dinosaur", e nas fichas "the size of a child" → "small" e **"no clothes" → "natural body covering"**. Sem teto numérico de nota sexual. | **A.** B foi **rejeitada neste item**: modera um texto diferente do que é gerado, e reescreve termo de nudez antes da régua. A abre a exceção só depois do veredito real, com teto numérico e sem tocar gente. |
| 3 | Ravan virou homem ruivo de moletom | Tabela de 9 figuras (Ravana, Kumbhakarna, Hanuman, Ganesha, Zeus, Poseidon, Medusa, Anubis, Thor) com iconografia; nome desconhecido em contexto mítico não ganha cabelo/roupa inventados; casting instruído e resposta com roupa moderna recusada. | Só Ravan no código + papel declarado pelo autor; casting travado; **crítico avisado de que as 10 cabeças não são defeito de anatomia**. | **A**, mais a frase do crítico de B (sem ela o crítico podia reprovar o Ravan certo por "anatomia" e refazer). |
| 4 | Elenco casado pelo visual do GPT, não pela fala | O visual diz **se** há alguém no quadro; a fala diz **quem** (nome, papel, pronome com antecedente); gênero contraditório não casa; a ficha entra no prompt da cena (FLUX, still, clipe). | A fala vira a **única** fonte quando existe: cena de paisagem cuja fala cita o menino recebe o menino; reescreve "a young man" → "the boy" no visual. Mais agressivo. | **A.** |
| 5 | Refação do still reprovado não saía (`regeracao_ok=false`) | Causa: janela de 9 s do FLUX contra 15–40 s do edit. Janelas por filme passadas explicitamente só pela folha (55 s cena / 40 s refação / 20 s mínimo / 60 s prazo); motivo no evento. Sem as opções, crítico byte a byte o de antes. | Mesma causa. Janelas ligadas pela presença de `referencia` (70 s / 45 s, reserva 8 s de moderação, prazo 70 s); motivo no evento. | **A** (+25 s no pior caso contra +35 s de B, ambos dentro do `maxDuration` 300 s). |
| 6 | Cena sem personagem ganhou adulto inventado | Cena sem personagem e sem ninguém no visual perde "characters act naturally" e ganha "No people, no human figures and no faces". Multidão própria do visual fica intocada. | Cena sem personagem na fala tem o **visual do GPT trocado pela própria narração** ("Nobody knew…" vira prompt de imagem), em toda cena sem citação. Perde a direção visual. | **A.** |

## Risco ao caminho padrão (folha desligada)

- **A:** rota guardada por `personagem.ativo`/`personagemCenas`; crítico sem as opções = byte a byte (provado executando a lib da base); `estrelaServer` intocado. Guardião executa o bloco real desligado (O1–O5).
- **B:** mexe em funções compartilhadas (`promptDoStillComFolha`, `cenasComPersonagem`, `buildClassicVisualPrompt` com campo novo, `gerarStillDaEstrela` da Estrela). Tudo com padrão que preserva o comportamento, mas a superfície é maior.

## Custo e latência

- A: +1 leitura de 64 KB só quando a fal não manda dimensão; a reconferência é a moderação gratuita; pior caso +25 s no prazo do crítico.
- B: nenhuma leitura extra, mas pior caso +35 s.

## Testes

- A: guardião de 446 linhas, os 3 roteiros reais à mão, bloco real da rota antes/depois, 19 mutantes de comportamento.
- B: guardião de 212 linhas, 15 mutantes; traz 6.872 linhas de log em `docs/qa` (não integrado).

## O que entrou na integração (21/10)

- Merge de A sobre origin/main `f5373312`, desfaz da entrega no topo da cadeia (`semHomeCardsClaros2010` chama o desfaz do ajuste primeiro), tabela do desfaz refeita contra a base nova.
- De B: a frase de anatomia mítica no critério IDENTITY do crítico e a troca do "lower third clear for captions" no prompt do still com folha.
