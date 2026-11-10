# [Recreate] Bloco para o Codex — deixar tudo pronto para o merge da manhã (10/11/2026)

Escrito pelo Claude Code (CEO) em 10/11/2026 às 04:20 BRT (relógio do PC). Fundador, antes de dormir: "Sim, podemos fazer amanhã
como primeira coisa. Fala com o GPT, fala para ele deixar tudo pronto para amanhã que a gente dá merge. Daí a gente vai vendo o
que foi feito, o que não foi feito. Quais ajustes a gente vai fazer."
Destino: a sessão do Codex que está no Recreate (branch codex/recreate-internal-0911), projeto kineo, pasta C:\kineo.
Estado lido na hora: origin/main = 10407b89a · fila = 10407b89a · candidato do Recreate = 76b9fd71f (de 01:57, sem commit novo).

```
[Recreate] PRAZO: TUDO PRONTO PARA MERGE ATÉ 10h BRT DE HOJE (10/11/2026) — o fundador dormiu e quer dar merge de manhã

O fundador foi dormir às 04:20 e disse: "fala para ele deixar tudo pronto para amanhã que a gente dá merge. Daí a gente vai vendo o que foi feito, o que não foi feito, quais ajustes a gente vai fazer." Não pare para perguntar: ninguém vai responder antes das 10h. Dúvida vira decisão sua, anotada no relatório.

O QUE "PRONTO PARA MERGE" QUER DIZER
- Cada peça na SUA branch, com UM SHA final, rebaseada sobre a origin/main de agora (10407b89a ou mais nova), typecheck verde e guardiões verdes. Guardião que já está vermelho na main: liste como "já vinha vermelho", sem mexer.
- Árvore limpa, nada por commitar, nada só na sua cabeça.
- NÃO publique, NÃO enfileire, NÃO mova entrega-atual, NÃO aplique migration, NÃO faça render pago. A sessão CEO revisa, aplica a migration, roda o canário e publica de manhã, com o fundador acordado.
- Atenção no rebase: hoje entraram na main mudanças em components/home/HomeMosaic.tsx, lib/clipesNos2Lugares.ts e lib/vitrineEnquadramento.ts (10 vídeos novos, pílula "Recreate" só onde recria, 6 anúncios com "Make your ad", teto de mídia 14 MB). Preserve as três coisas.

PEÇA 1 — RECREATE (a que vale mais; se o tempo apertar, é a única obrigatória)
- Os 3 gates que faltavam, verdes.
- O acabamento do painel da esquerda (pedido 1 do bloco da tela padrão) dentro do candidato.
- Interruptor: SÓ contas internas. O seu relatório dizia "prepara acesso a todas as contas autenticadas"; a decisão do fundador é interno primeiro. O caminho para abrir ao público fica pronto, DESLIGADO, e vira com uma linha.
- Preço em vigor: 10 s = 40 créditos, 15 s = 60 créditos, sem Recreate grátis na v1. Preço só no botão Generate.
- A migration escrita, NÃO aplicada. No relatório: o nome do arquivo, o que cria, o que muda em tabela existente e como desfazer.
- Roteiro do canário para a sessão CEO seguir: passo a passo com a conta interna, o que tem de aparecer no banco (débito único, estorno em falha, nenhuma cobrança dupla) e como reverter.

PEÇA 2 — TELA PADRÃO E PALETAS (só para ver; não entra em merge)
- A proposta em docs/ e a tela parada da aba Film + Recreate nas 5 paletas.
- Um print de cada paleta salvo em C:\kineo\docs\referencias\tela-padrao-1011\, no computador e a 375 px, e uma linha dizendo qual você recomenda e por quê.

PEÇA 3 — BOTÃO DE SÉRIE (só se já estiver em pé)
- Branch própria, interruptor interno próprio. Se não começou, não comece agora: diga "não feito".

PEÇA 4 — RECEITA DE ANÚNCIO DENTRO DO PRODUTO (primeira obra de amanhã; hoje só o MAPA, sem código)
O fundador aprovou seis anúncios de Natal feitos à mão e quer essa receita dentro do produto de anúncio. Leia C:\kineo\docs\ADS-NATAL-PLANO-2026-11-10.md (seções 4 a 8). A receita: 1 foto inicial 9:16 com o produto, depois vídeo a partir da foto em 3 planos com fala (15 s) ou sem fala (12 s), fecho dentro da cena, sem cartela. Custo medido: cerca de US$ 0,16 por segundo de vídeo mais cerca de US$ 0,15 da foto.
Entregue um documento curto em docs/ (sem construir): onde isso entra no Ads v2 (nível novo ou troca de um existente); o que o servidor já tem e o que falta para foto + 3 planos + fala; como a foto do produto do cliente vira a foto inicial; preço em créditos com a margem nos 3 planos; o que pode dar errado (produto duplicado ao mudar de mão, marca real aparecendo, rosto mudando entre planos) e como o roteiro evita; ordem de obra em passos de um dia.

RELATÓRIO DA MANHÃ
Grave em C:\kineo\docs\CODEX-PRONTO-PARA-MERGE-2026-11-10.md e repita na conversa:
UMA tabela — peça · estado (pronto / parcial / não feito) · branch e SHA · como ver · testado · NÃO testado · o que falta.
Depois "✅ O QUE VOCÊ PRECISA FAZER" (numerado, só o que depende do fundador) e "📋 O QUE ACONTECEU".
Diga com todas as letras o que não foi feito. Peça parcial declarada vale mais que peça "pronta" que quebra no merge.
```
