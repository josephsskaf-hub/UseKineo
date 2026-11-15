# Clip + Recreate numa tela só · 15/11/2026

Pedido do dono (15/11): juntar a aba Clips com a aba Recreate ("no fundo é a mesma coisa"); ao clicar em Recreate o Clip sumia do menu de cima. Manter o fluxo na lateral, os vídeos que dá para recriar embaixo e o modelo escolhido tocando à direita.

## O que foi feito (atrás de `CLIP_RECREATE_JUNTOS_RELEASE = 'internal'`, só a conta da casa)
- Uma aba, "Clip" (barra: Film · Clip · Cartoon · Ads, em toda tela de criar da conta no interruptor).
- Esquerda: a caixa do Clips de hoje. Ao escolher um modelo, o painel vira o do Recreate (vídeo-base + Change, Your photo, Generate com o custo dele) e ganha "← Clip from your idea".
- Direita: o modelo escolhido tocando; sem escolha, o primeiro modelo público da grade (o mais novo).
- Embaixo: a grade dos modelos que a conta pode ver (filtrada no servidor), depois Trending, os efeitos do Clips e My clips. Tocar só escolhe.
- /create/clip, /clips, /recreate e /recreate/<id> abrem a tela única para quem está no interruptor; os outros veem as telas de hoje.
- Por que o Clip sumia: a barra do Recreate (`app/recreate/RecreateClient.tsx`) montava `<CreateTabs active="recreate" />` sem `showClip`.

## Código
`components/create/ClipRecreateJuntos.tsx` só reposiciona as peças do `ClipsClient` (inalterado) e do `RecreateClient` (nova prop `moldura`, sem ela o HTML é o de antes). Pedidos ao /api/clips e ao /api/recreate iguais (guardião `scripts/test-clip-recreate-juntos-1511.mjs`).

## Fotos
Fora do repo, em C:/kineo/docs/clip-recreate-juntos-1511/ (1920 e 390 px; claro e escuro). Prévia só de desenvolvimento em /dev/clip-recreate-juntos (404 em produção).

## Em aberto para o dono
- Efeitos repetidos: vários efeitos aparecem duas vezes na mesma tela (como modelo do Recreate, `effect-*`, e como efeito do Clips). Hoje cada um gera pelo seu caminho. Escolher qual fica é uma decisão separada.
- O rótulo da aba ficou "Clip". A palavra "Recreate" continua no título da grade e nos botões dos cartões.
