# B na caixa de ideia do Studio

**TESTADO LOCALMENTE · 18/11/2026.** A comparação abre offline e reúne oito fotos do Studio e a gravação da digitação. As fotos usam o mesmo texto antes e depois. O vídeo mostra as letras se reorganizando até revelar a baía. [Abrir fotos e vídeo](APROVACAO.html) · [MP4 de 10 segundos](studio-b-10s.mp4)

| Pedido da CEO | Entrega e verificação |
|---|---|
| 1. B junto à ideia | **IMPLEMENTADO.** O primeiro texto digitado na caixa Film de `/studio` inicia a projeção abaixo de Settings e Generate. Há um único campo editável. As partículas acompanham até 27 caracteres junto ao cursor. Generate recebe a ideia completa. Ver `components/studio/StudioSimples.tsx:170`, `components/studio/StudioSimples.tsx:236` e `public/screening-room/studio-idea.js:5`. |
| 2. Dono e chave desligada | **IMPLEMENTADO.** A compilação só habilita a experiência se `NEXT_PUBLIC_KINEO_STUDIO_FILM_3D` for exatamente `true`. O servidor valida a sessão e o endereço confirmado antes de marcar a caixa elegível. Nos ensaios com visitante, outra conta interna e chave desligada, a digitação gerou zero pedidos de 3D. Ver `app/(dashboard)/studio/page.tsx:51` e `lib/auth/signedInFounder.ts:5`. |
| 3. Peso e queda | **TESTADO LOCALMENTE.** O Studio abriu com zero requisições da projeção em todas as combinações. Ao desabilitar as duas APIs gráficas ou pedir movimento reduzido, o PNG da área Film inteira coincidiu byte por byte com o da versão original, tanto a 390 quanto a 1920. Ativar movimento reduzido durante a animação também restaurou o editor. |
| 4. Escrita antes do login, Settings e Generate | **TESTADO LOCALMENTE.** Visitante e dono puderam escrever, escolher 35 s em Settings e acionar Generate. O navegador enviou para `/studio/create` os mesmos parâmetros completos da versão original, inclusive a ideia com espaços e `&`. A escolha de uma ideia de exemplo também atualizou o campo. O ensaio termina no pedido de navegação, sem gerar filme nem consumir créditos. O diff preserva a implementação do débito, do login, da Sidebar e da MobileNav. |
| 5. Temas e tamanhos | **TESTADO LOCALMENTE.** A geometria da caixa, área de texto e controles coincidiu com a original. A posição e o tamanho da projeção coincidiram entre claro e escuro em cada largura. O centro de Generate recebeu o clique nas quatro combinações. A galeria traz fotos de 1920 × 1080 e 390 × 844. |
| 6. Identidade do fundador | **FATO CONFIRMADO.** A lista interna do repositório inclui outras pessoas e contas de teste. O critério exclusivo da conta primária confirmada agora fica junto àquela lista. A sala de prévias e o Studio usam o mesmo ajudante de sessão. Ver `lib/internalAccounts.ts:17`, `lib/internalAccounts.ts:23` e `app/dev/_screening/room.ts:46`. |
| 7. Filmes e selos | **FATO CONFIRMADO.** O Studio usa uma única textura, o corte da casa de *Lituya Bay*, identificado como MiniMax H3 na seleção. A legenda exibe o título e a Kineo. Na prévia, os demais selos conferem com o catálogo por ID de filme. Vulcão corresponde a Veo 3.1, castelo a Seedance e o globo de Tunguska a Omni. Fontes em `lib/ui/examplesSelectionSep24.ts:22`, `:32`, `:38`, `lib/publicExamples.ts:222` e `lib/home/watchMedia.ts:5`. |
| 8. Desempenho e escopo | **TESTADO LOCALMENTE.** O contador usa quadros desenhados enquanto o painel está visível. Uma janela de pelo menos 3 s abaixo do alvo em FPS inteiros remove a projeção e libera GPU e vídeo. Nos dois perfis forçados abaixo da meta, a geometria voltou ao original, o rascunho permaneceu e Generate recebeu o clique. A e C continuam nas rotas de prévia. Ver `public/screening-room/studio-idea.js:87`. |

## Peso da primeira tela

**TESTADO LOCALMENTE · 18/11/2026.** Três compilações de produção da rota, base `f9181213d`, com os layouts reais do aplicativo e do dashboard. O navegador abriu um contexto novo em cada medição. JS e HTML correspondem ao corpo codificado. O total transferido inclui navegação, recursos locais e cabeçalhos reportados por Resource Timing. Valores em bytes. [Medições brutas](medicoes.json)

| Dono, antes de digitar | JS inicial | Arquivos JS | HTML comprimido | Total transferido | Pedidos de 3D |
|---|---:|---:|---:|---:|---:|
| Original | 708.652 | 16 | 20.343 | 1.003.263 | 0 |
| Chave desligada | 708.652 | 16 | 20.345 | 1.003.265 | 0 |
| Chave ligada no ensaio | 708.842 | 16 | 20.652 | 1.003.762 | 0 |

**TESTADO LOCALMENTE.** Com a chave desligada, o HTML original e o final têm 78.834 bytes descomprimidos e coincidem após normalizar os hashes dos nomes de arquivos. A compressão desses nomes produziu 2 bytes de diferença. Com a chave ligada, o tratamento da primeira digitação acrescentou 190 bytes de JS inicial. Após a primeira digitação do dono, o navegador recebeu 2.506 bytes do controlador, 227.763 do motor, 8.908 do pôster e 468.633 do vídeo. [Comparação de HTML e pixels](verificacao.json)

## Desempenho

**TESTADO LOCALMENTE · 18/11/2026.** Chrome 157 em Windows com NVIDIA GeForce RTX 3090. Na emulação móvel, a densidade foi 2,75, com CPU desacelerada em 4× e rede limitada a 10 Mbps com 75 ms de latência. No notebook, CPU em 2× e rede local. FPS usa quadros efetivamente desenhados divididos pela duração da amostra. O MP4 de aprovação é uma gravação separada a 30 quadros/s. [Amostras e GPU](medicoes.json)

| Perfil | Renderizador | Quadros na janela | FPS | Maior conteúdo visível na primeira tela, com chave ligada |
|---|---|---:|---:|---:|
| Notebook 1366 × 768 | WebGPU | 600 em 10.002 ms | 59,99 | 0,256 s |
| Celular 390 × 844 | WebGPU | 600 em 10.003 ms | 59,98 | 0,608 s |
| Celular 390 × 844 | WebGL2 | 601 em 10.013 ms | 60,02 | — |

**QUESTÃO PENDENTE.** Os perfis compartilham a GPU do computador. O desempenho de um celular físico intermediário e de um notebook com GPU integrada continua sem medição. A autenticação foi simulada localmente no servidor. O navegador bloqueou serviços externos, por isso a barra lateral das capturas exibe o visitante de teste. O TypeScript do repositório passou com `--noEmit --incremental false`.

**SUGESTÃO.** A CEO pode revisar a galeria offline com o dono. Uma futura mudança da chave exige recompilar o aplicativo. A branch local `codex/studio-3d-b-1811` fica com a chave desligada por padrão.
