# Item F — candidato isolado, não publicar

FATO CONFIRMADO — pedido local do quadro em 13/11/2026 04:12: retirar a aba/menu Clip; /clips e /create/clip devem responder 308 para /recreate; cartões da vitrine devem abrir Recreate; My clips fica em My videos.

IMPLEMENTADO LOCALMENTE — `F-clip-retirado-1311.patch` contém só esta rodada F (19 arquivos). Exclui `lib/create/tabs.ts`, a taxonomia produto de CLIPES_NOVOS e as correções B/R entregues antes. Não copiar arquivos inteiros sobre a raiz: há trabalho simultâneo em Footer, Sidebar, Recreate e next.config.

- CreateTabs ignora o antigo showClip e não desenha a aba; desktop/mobile mantêm uma porta Recreate.
- Redirects exatos em next.config: /clips e /create/clip, permanent=true. Nenhum wildcard, rota de detalhe ou API de clipe foi removido.
- Fallbacks da vitrine abrem a grade Recreate; links públicos para modelos já aprovados continuam próprios. Ads e filme continuam com os destinos anteriores.
- Os dois My videos do Recreate passam a /library?tab=clips. Library recebe esse filtro validado pelo servidor; o My videos geral continua /library.
- Nenhum motor, preço, crédito, oferta, geração, banco ou formats.ts foi alterado.

TESTADO LOCALMENTE — `test-clip-retirado-1311.mjs` passou offline: redirects exatos, abas renderizadas mesmo com showClip=true, navegação compartilhada desktop/mobile, fallback da vitrine, preservação de detalhes e filtro da Library. `git diff --check` passou. Revisão React sem novo efeito, pedido de rede ou estado de geração. Não executado: tsc, build, guardião completo da vitrine e prova em navegador.

## Bloqueios de publicação

1. FATO CONFIRMADO — `lib/clips/freeClipNotice.ts:70` ainda oferece /clips?free_clip=1. O redirect levaria à grade Recreate, que não resgata esse direito. Não esconder a oferta aprovada. Precisa de cartão de resgate no Recreate e contrato com a CEO antes de publicar a retirada.
2. FATO CONFIRMADO — LibraryClient filtra só `done` com video_url; ClipsClient exibe também andamento, falha e devolução (`ClipsClient.tsx:1226`). O filtro My videos implementado aqui não porta esse histórico/polling. Preservar acompanhamento e falhas antes de retirar a entrada antiga.
3. QUESTÃO PENDENTE — o guardião antigo da vitrine tem regra R baseada no prompt do link. A ida à grade Recreate remove o preenchimento do clipe; o selo e seus mutantes precisam acompanhar o contrato definitivo do cartão/resgate. O patch reancora somente a regra de destino B e seus dois mutantes; não afirma guardião completo verde.

SUGESTÃO — manter este patch separado da entrega atual. Primeiro fechar resgate e acompanhamento; depois aplicar F em checkout próprio, revalidar o guardião completo, typecheck e navegador, e apresentar o print antes de publicar.

Sem commit nesta rodada; arquivos e patch disponíveis no diretório isolado examples-missao2. A operação de commit na área git externa já havia sido recusada anteriormente; não foi repetida.
