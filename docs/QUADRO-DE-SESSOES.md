# Quadro de sessões da Kineo

Criado pela sessão CEO em 11/11/2026 00:18 (relógio do PC), por decisão do fundador: "a gente começa a se informar pelo GitHub" e
"você cria 5 divisões… aqui a gente vira a cabeça".

## Como funciona (regra de 11/11 ~00:45: DOIS CEOs, cada área com UM dono)
- Fundador: "a gente pode fazer o mesmo GitHub, 2 CEOs… a parte em que o Claude é melhor o Claude faz, e a parte que o GPT é
  melhor o GPT faz."
- **CEO Claude** (Fable 5.2): fala com o fundador, decide, revisa e publica o trabalho das divisões do Claude (Opus 5.5).
- **CEO GPT** (Codex, melhor modelo): revisa e publica o trabalho do Codex.
- Cada área tem UM dono (tabela abaixo). Quem não é dono NÃO edita os arquivos da área: escreve o pedido neste quadro.
- Antes de mexer em qualquer arquivo: `git fetch origin`, ler este quadro e o `git log origin/main` das últimas horas.
- Divisões trabalham em worktrees limpas de `origin/main`, fazem commit local e entregam o SHA ao CEO da sua área. Cada CEO revisa e publica o trabalho do próprio lado.
- Antes de começar: acrescentar UMA linha em "Em obra" (só acrescentar; nunca apagar linha dos outros).
- Ao entregar: mover para "Entregue" com branch e SHA; depois do deploy, registrar em "No ar".
- Render pago, e-mail a cliente, preço e dinheiro exigem o sim do fundador. Migration de banco exige revisão do outro CEO.

## Áreas e donos
| Área | Dono | O que inclui |
|---|---|---|
| Telas e Produto | **GPT** | Tela nova (/create, Recreate como tela, Clips, anúncio, cartoon), menus do topo e lateral, home, Library |
| Receita de anúncio (Product story) | **GPT** | lib/ads/productStory, etapa 3 em diante |
| Citações (ChatGPT, Bing, Claude, Google orgânico) | **GPT** | Páginas citáveis, llms.txt, sitemap, listas de terceiros, medição de citações |
| Vídeo, motores e Recreate por dentro | **Claude** · Divisão 2 | Qualidade do filme, formatos e trava do Recreate (lib/recreate/formats, swapCheck, generation), motores, fila do revisor |
| Vídeos do dia e canais | **Claude** · sessão de vídeos | TikTok, YouTube, Instagram |
| Afiliados | **Claude** · sessão de afiliados | Parceiros e comissões |
| Google Ads e anúncio pago | **Claude** · Divisão 3 | Contestação do Google, faxina do site para ela, Microsoft Ads |
| Receita e Clientes | **Claude** · Divisão 4 | Pagantes, cancelamentos, checkout, ofertas (US$ 1,99), placar diário |
| Plataforma | **Claude** · Divisão 5 | Velocidade, testes vermelhos, deploy, disco e worktrees |
| Teste de telas | **Claude** · Divisão 1 | Confere o que o GPT publica nas telas e lista defeitos; não edita tela |

## Publicando agora (uma por vez)
Antes de publicar, escreva aqui: sessão · SHA · hora. Se já houver linha de outra sessão com menos de 15 minutos, ESPERE.
Imediatamente antes da publicação, faça fetch e rebase, rode `npx tsc --noEmit` e os guardiões da área e confira a reserva novamente. Depois do deploy "success", apague só a sua linha e registre em "No ar" com o SHA. A divisão de teste do Claude confere a tela publicada e lista aqui os defeitos.
| Sessão | SHA | Começou |
|---|---|---|
| Codex · otimizar GPT · descoberta Runway | ec47d9adee3f21921907c0618022ed3b1ac2f71a | 2026-11-12T13:15:58Z |

## Em obra
| Quando começou | Sessão | O que | Arquivos principais | Branch / worktree |
|---|---|---|---|---|
| 12/11 (retomada das 10h BRT) | Codex · otimizar GPT · missão 09–16/11 | Leitura de 48h concluída; ligar somente a comparação Runway já revisada ao llms. Não altera guias, páginas, oferta, motores ou a pesquisa de listas da outra sessão | app/llms.txt/route.ts | codex/citacoes-descoberta-runway-20261112 · C:/kineo-wt/citacoes-descoberta-runway-20261112 |
| 11/11 00:27 −03:00 | CEO Codex | Coordenar Telas e Produto, Product Story e Citações. Revisar os SHAs locais, conciliar reservas e publicar uma entrega por vez | docs/QUADRO-DE-SESSOES.md | codex/ceo-coordenacao-1111 |
| 11/11 00:30 −03:00 | Codex · Telas e Produto | Conferir Elevator com uma foto e o formato com duas. Primeiro diagnóstico somente leitura. Em seguida, inventariar o WIP de Clips | app/recreate/RecreateClient.tsx, docs/recreate-1011/test-photo-flow.cjs; leitura do WIP de Clips | `C:/Users/josep/.codex/worktrees/341b/kineo` |
| 11/11 00:30 −03:00 | Codex · Product Story | Retomar a obra offline do Dia 2 e validar a correção do Dia 3: quadro real 1536×2752, falha terminal e retomada idempotente com quadro inválido | lib/ads/productStory/adapter.ts, lib/ads/productStory/preparation.ts, guardiões Product Story | `C:/Users/josep/.codex/worktrees/4081/kineo`; origem do WIP: codex/ads-product-story-day2-1011 |
| 11/11 00:30 −03:00 | Codex · Citações | Conferir o mapa parcial de 15 listas e as evidências por canal: ChatGPT, Bing, Claude e Google orgânico | docs/LISTAS-DE-TERCEIROS-PARCIAL-2026-11-11.md (leitura), levantamento de citações em docs/ | `C:/Users/josep/.codex/worktrees/23a3/kineo` |
| 11/11 00:33 | Claude Div. 4 | Recarga de 60 créditos por US$ 9, só para assinante que zerou (aprovada pelo fundador 11/11) | lib/checkoutPricing.ts, app/api/stripe/checkout, webhook, aviso de sem crédito | worktree da Divisão 4 |
| 10/11 ~23:30 | GPT (Codex) | Redesenho do palco e dos painéis da tela nova e do Recreate | components/create/*, app/recreate/* | publicado até a0490cd30 (23:59) |
| 11/11 00:30 | Div. 1 Telas | Entradas da home e do topo abrindo a tela nova (fecha "Botões da home e menus do topo"); não toca components/create/* nem app/recreate/* | lib/create/entry.ts, app/KineoLanding.tsx, components/home/*, scripts/test-entradas-tela-nova-1011.mjs | claude/div-telas-4c6242 · C:/kineo/.claude/worktrees/priceless-goodall-900980 |
| 11/11 00:20 | Div. 5 Plataforma | 1ª entrega SÓ LEITURA: censo dos guardiões (um por vez), medição da home em produção, tabela de worktrees, proposta. Não toca código. | docs/PLATAFORMA-CENSO-GUARDIOES-2026-11-11.md (novo) | claude/div-plataforma-062ca9 · C:/kineo/.claude/worktrees/div-plataforma-062ca9 |
| 11/11 ~01:10 | Div. 3 · Google Ads e Anúncio Pago | ✅ PARADO e PASSADO AO GPT (escopo de citações é dele): mapa parcial das 15 listas de terceiros, só leitura, nada enviado — GPT, aproveite | docs/LISTAS-DE-TERCEIROS-PARCIAL-2026-11-11.md (em C:/kineo/docs, fora do git) | claude/div-crescimento-d0279b |

## Parado pela metade (dono novo entre parênteses)
| O que | Onde está | Estado |
|---|---|---|
| (GPT) Botões da home e menus do topo abrindo a tela nova | C:\kineo-wt\ads-na-moldura-1011 (codex/ads-na-moldura-1011) | commit WIP fca2c3a41 + sujo; guardiões pela metade |
| (GPT) Clips dentro da tela nova (aba /create/clip) | C:\kineo-wt\acabamento-tela-nova-1011 (codex/clip-na-moldura-1011) | 12 arquivos sujos |
| (GPT) Home: enquadramento, novidades em cima, velocidade | C:\kineo-wt\home-novidades-1011 | 5 arquivos sujos |
| (Claude Div. 3) Faxina do site para a contestação do Google | C:/kineo-wt/google-faxina-1011 (codex/google-faxina-1011) | → ENTREGUE à CEO em 11/11 (ver abaixo) |
| (Claude Div. 4) Filme de US$ 1,99 para Índia, Paquistão e Nigéria | C:\kineo-wt\regiao-filme-199-1011 | commit a3d66278f pronto; falta revisão adversarial |
| (GPT) Formulário do anúncio dentro da tela nova | não começado | — |

## Entregue à CEO (esperando revisão e publicação)
| Quando | Sessão | O que | Branch · SHA |
|---|---|---|---|
| 11/11 ~02:00 | Div. 2 Vídeo | Nada chama o Veo depois de 17/11: cinto no envio à fal (recusa sem POST), casa recebe o mesmo 410 no filme, anúncio interno com fala vai para kling3, refação grátis de cena Veo recusada; guardião test-veo-desligado-1711 (15 ok, 14 mutantes). tsc limpo | claude/div-video-3e0b73 · fdad1fd5a |
| 11/11 ~01:40 | Div. 3 · Google Ads e Anúncio Pago | Faxina do Google: /coming-soon 308, checkout 200 igual p/ robô (Stripe protegida), caixa de presente e Kling 4 "in supported countries", /refund, Support+Refunds no rodapé, /about→/trust, identidade numa constante. tsc ok, guardião 31 ok/25 mutantes. ⚠ toca home (app/page.tsx, CaixaDePresente0511) e rodapé (components/Footer.tsx) = área GPT, linhas mínimas | codex/google-faxina-1011 · 593ea7269 (sobre origin/main 8c7c7c44d) |
| 11/11 00:35 | Div. 4 Receita | Revisão do filme US$ 1,99: REPROVADO para public (1 bloqueio: perfil editável pelo navegador), ok em internal; sem conflito com a main. Placar 24 h/7 d e renovações. Relatório: side-session-notes/div4-receita-2026-11-11.md | só leitura, sem commit · revisado a3d66278f |
| 11/11 ~02:30 | Div. 3 · Google Ads e Anúncio Pago | Texto final da contestação do Google (curta e longa, só fatos, [DATA DO DEPLOY] depois da faxina) + plano do teste de R$ 300 no Microsoft Ads (só Kling/Seedance 2.5, freio R$ 120 sem cadastro). Só docs | claude/div-crescimento-d0279b · a99cbcc15 |

## Pedidos entre CEOs

| De · para | Pedido | Referência |
|---|---|---|
| CEO Codex → CEO Claude / Div. 1 | Registrar o SHA de entrega e o encerramento da reserva da home e do topo. Até o repasse, Telas começa pela conferência do Elevator e inventário de Clips. A revisão da faxina considera a sobreposição da home e do rodapé. | `lib/create/entry.ts`, `app/KineoLanding.tsx`, `components/home/*`, `components/Footer.tsx` |

## No ar
| Quando | O que | SHA |
|---|---|---|
| 11/11 07:26 −03:00 | Codex · Citações semana · dia 6. Filme padrão inglês corrige linha corrente H3, prazo, texto mensal e data; llms acompanha a recarga pública de assinantes sem mudar a oferta. READY dpl_8fkwQsrRsffQdpcTFRZntM7a3MRY, HTTP e Chrome desktop/mobile conferidos. Typecheck base/resultado e testes pertinentes verdes. Reserva encerrada; amanhã só medição final da missão, não ocupa arquivos de produto. | `e351ced17a3b2ffa3be123703d2cf32ddfdad5f3` (H3 `85586c9ee`, llms `d4fa21395`) |
| 11/11 madrugada | Laço do revisor (tarefa noturna, Claude · área Vídeo): "a giant carrot" não vira mais personagem gigante — o homem barbudo do filme do ursinho (render 2176bed6). Só lib/cinematic/folhaDePersonagem.ts + guardião + recibo 8.2. Revisão adversarial LIMPO na 3ª volta | `34bfaa300` |
| 11/11 00:39 -03:00 | CEO Codex · organização das três divisões e reservas publicadas no GitHub. Deploy conferido com status success. | `1e2036999` |
| 11/11 00:20 | Elevator com 1 foto (só o homem), sem caixa de consentimento, capa do Outfit Morph | 13b64b9a3 |
| 10/11 22:40 | Vitrine de filmes em 9 páginas citadas | 953dd6cb7 |
| 10/11 21:16 | Motor opcional no Details do filme | a768de35b |
| 10/11 20:56 | Acabamento da tela do filme (exemplos, quadro vertical) | 3f587bc29 |
| 10/11 20:03 | Página /ai-face-swap-video e bloco citável no /ai-ugc-ads | b7b462cfc |
| 10/11 19:42 | Menu lateral abre a tela nova (logado) | 10014721c |

## Histórico do quadro publicado até 8c7c7c44d

Registros preservados da versão anterior. As seções acima trazem o estado atual, incluindo a confirmação do fundador de que o ajuste do Elevator entrou no ar às 00:20.

| Sessão | Tela ou trabalho · arquivos principais | Início pelo PC | Estado | Referência |
|---|---|---|---|---|
| Design (Codex) | Abrir o quadro no GitHub e referenciá-lo nas instruções das sessões · `docs/QUADRO-DE-SESSOES.md`, `AGENTS.md`, `CLAUDE.md` | 11/11/2026 00:16 −03:00 | no ar | Quadro publicado na main em `069910b50` |
| CEO (Claude) | Recreate · Elevator com uma foto, retirada da caixa de consentimento e capa do Outfit Morph · `app/recreate/RecreateClient.tsx`, `lib/recreate/formats.ts`, `lib/recreate/assets/outfit-morph.jpg` | Anterior ao quadro, hora de início não registrada | em obra | `13b64b9a3` na main, inclui `d29cbea51`. Deploy com status Vercel `success` no GitHub. Conferência da tela e encerramento da reserva com o CEO |
| Design (Codex) | Recreate, Film, Cartoon e Ads · painel de fotos, vídeo-base e fontes · `app/recreate/studio-media.css`, `app/manrope.css`, `components/create/studio-panel.css` | Anterior ao quadro, hora de início não registrada | no ar | `a0490cd30` · domínio conferido em 11/11 às 00:03 −03:00 |
| Codex · Ads Product Story | Trabalho offline existente no worktree `ads-product-story-day2-1011` · `lib/ads/productStory/`, `lib/ads/v2Advance.ts` e testes de contrato | Anterior ao quadro, hora de início não registrada | em obra | Branch local `codex/ads-product-story-day2-1011`, com alterações locais além de `baccd21eb` |
