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

## Aberto ao público (15/11, dono: "pode liberar tudo para as pessoas, inclusive via desktop")
- `CLIP_RECREATE_JUNTOS_RELEASE` e `CAIXA_NOVA_RELEASE` = 'public' (conta logada; visitante segue no fluxo de hoje). Volta: 'internal'.
- Revisão da CEO antes de abrir: a caixa do Clips herdava 900 px de altura mínima e 34 px de margem do .stu antigo (vão vazio e caixa mais estreita que o botão); o título da grade caía no meio da linha; no celular o título do modelo quebrava no meio da palavra ("Cozy sweate / r flip").
- Efeitos repetidos: decidido pela recomendada (cada efeito UMA vez). O efeito que já está na grade de modelos sai das fileiras do Clips embaixo (`semRepetir` no ClipsClient; sem a lista, nada some). Ficam só os 6 que a grade não tem (Golden dribbles, Pet dance, Fruit babies, Toy car, Night zoo, Friday Groove).
- Rótulo da aba: "Clip". "Recreate" segue no título da grade e nos botões dos cartões.
