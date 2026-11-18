# Kineo em 3D · aprovação de 18/11/2026

**TESTADO LOCALMENTE.** [Abrir a comparação offline, com os três vídeos](APROVACAO.html). O arquivo reúne 24 fotos das rotas reais, com a entrada estática e o 3D ativo em 1920 × 1080 e 390 × 844, nos dois temas. Os vídeos também estão disponíveis individualmente. Fontes de 18/11/2026 nesta pasta.

| Conceito | Interação implementada | SUGESTÃO de posição | Gravação |
|---|---|---|---|
| A · Palco | Quatro filmes em órbita. Mouse altera a perspectiva. Roda, gesto horizontal e setas trocam o filme. | Entrada da home, junto à caixa de criação. | [10 s](a-10s.mp4) |
| B · Da palavra ao quadro | As letras da ideia viram partículas e se recompõem na textura do filme escolhido. O texto segue para o Studio. | Entrada do Studio, junto ao primeiro campo de ideia. | [10 s](b-10s.mp4) |
| C · Corredor | A câmera avança entre painéis. Clicar em um painel abre o filme correspondente com controles nativos. | Abertura da galeria Made with Kineo. | [10 s](c-10s.mp4) |

**FATO CONFIRMADO · IMPLEMENTADO.** A branch local é `codex/site-3d-1811`, sobre `3fec0faee5825262c63730b4250f09ea40f457e2`. O commit da implementação é 03eaf38a030502593eb1399b474bef0d0f80a9cd. As três entradas são `/dev/3d-a`, `/dev/3d-b` e `/dev/3d-c`. Cada uma usa o manipulador em `app/dev/_screening/room.ts:56`. A resposta HTML inclui a caixa nativa de criação, fontes locais e os pôsteres. O motor gráfico só é importado ao acionar a experiência ou começar a digitar em B. Cada formulário abre `/studio` com o campo `ideia`, recebido por `app/(dashboard)/studio/page.tsx:73`.

**FATO CONFIRMADO · IMPLEMENTADO.** Three.js compila os shaders TSL da moldura, perfurações, recorte e composição das partículas para o backend escolhido. O palco e o corredor usam câmera em perspectiva, geometria e seleção por raio. Os vídeos alimentam texturas nos painéis. Fontes em `app/dev/_screening/engine/frames.js:54`, `frames.js:83` e `scene.js:25`. [Documentação do renderizador](https://threejs.org/docs/pages/WebGPURenderer.html)

**FATO CONFIRMADO · ACERVO.** Os quatro cortes vêm dos exemplos selecionados pelo fundador. Os MP4s em `public/screening-room/` são derivações locais de `public/previews/leve-1111/`, silenciosas, a 360 × 640 e 20 quadros/s. O player abre o corte público original. Materiais usados: erupção, baía de Lituya, castelo e globo de Tunguska. Origem em `lib/ui/examplesSelectionSep24.ts:4` e `lib/home/watchMedia.ts:5`.

## Medições

**TESTADO LOCALMENTE · 18/11/2026.** Chrome 157.0.8103.51, Windows, Core i7-13700F, RTX 3090. Cada linha é uma navegação com cache do navegador desativado. Foi usado Next em modo de produção local com as três rotas e o middleware da branch num projeto de medição isolado. O teste de passagem para o Studio e as capturas usaram o checkout completo. Medições brutas em [medicoes.json](medicoes.json).

| Conceito | Janela CSS | FPS WebGPU | Interativa | Maior conteúdo visível (LCP) | Clique até 3D | Entrada transferida | Motor + texturas sob demanda |
|---|---|---:|---:|---:|---:|---:|---:|
| A | 1920 × 1080 | 59,98 | 0,051 s | 0,364 s | 0,287 s | 135,7 KiB | 1.617,9 KiB |
| B | 1920 × 1080 | 60,05 | 0,133 s | 0,220 s | 0,366 s | 134,5 KiB | 680,6 KiB |
| C | 1920 × 1080 | 59,97 | 0,102 s | 0,156 s | 0,270 s | 134,5 KiB | 1.617,9 KiB |
| A | 1366 × 768 | 59,99 | 0,048 s | 0,264 s | 0,384 s | 134,5 KiB | 1.617,9 KiB |
| B | 1366 × 768 | 59,99 | 0,193 s | 0,216 s | 0,396 s | 134,5 KiB | 680,6 KiB |
| C | 1366 × 768 | 59,98 | 0,201 s | 0,220 s | 0,422 s | 134,5 KiB | 1.617,9 KiB |
| A | 390 × 844 | 59,99 | 0,691 s | 0,764 s | 1,307 s | 134,5 KiB | 1.617,9 KiB |
| B | 390 × 844 | 60,09 | 0,609 s | 0,624 s | 1,149 s | 134,5 KiB | 680,6 KiB |
| C | 390 × 844 | 60,05 | 0,643 s | 0,660 s | 1,204 s | 134,5 KiB | 1.617,9 KiB |

**TESTADO LOCALMENTE · método.** 1920 px usou CPU e rede local sem limitação. O perfil de notebook, a 1366 px, usou CPU limitada em 2×. O perfil de celular, a 390 px, usou DPR 2,75, CPU limitada em 4×, download de 10 Mbit/s e latência configurada de 75 ms. Todos usaram a GPU do computador. O FPS conta chamadas concluídas de renderização em uma janela contínua de dez segundos, após aquecimento de quatro segundos. Cada linha tem uma amostra. A coluna interativa mede a instalação dos controles. A coluna LCP mede a pintura de maior conteúdo antes da interação.

**TESTADO LOCALMENTE · peso.** A coluna de entrada soma a navegação e os recursos iniciais por Resource Timing. O navegador fez zero pedidos ao motor 3D e aos MP4s na entrada. A última coluna soma o motor e os MP4s da primeira ativação, com o volume transferido informado pelo navegador. O módulo empacotado tem 828.925 bytes em disco e 227.669 bytes de conteúdo comprimido no servidor local. B abre só a textura escolhida. O peso da captura de aprovação e dos vídeos de tela fica em docs e não entra no site.

**TESTADO LOCALMENTE · WebGL2.** Com WebGPU indisponível e viewport de 390 px, DPR 2,75 e CPU limitada em 4×, o botão de medição da rota exibiu A 60,0 fps, B 60,1 fps, C 60,1 fps. O teste também abriu o player, conferiu a progressão do vídeo, reiniciou a cena e ativou a preferência de movimento reduzido com a cena em execução.

**TESTADO LOCALMENTE · experiência.** A indisponibilidade simultânea de WebGPU e WebGL2 leva aos pôsteres. Movimento reduzido preserva a entrada estática e impede o carregamento automático do motor. O CTA passou no teste de clique no palco e no player. A ideia com espaço e “&” chegou ao campo editável do Studio. As posições e dimensões de título, palco, lista de filmes, controles, caixa de texto e CTA coincidiram entre os temas nas duas larguras. Fontes de 18/11/2026 em [verificacao.json](verificacao.json) e [medicoes.json](medicoes.json).

**QUESTÃO PENDENTE.** A taxa de apresentação em notebook comum e em celular médio físicos ainda precisa de medição. Abrir cada rota no aparelho, tocar em **Explore in 3D** e em **Measure FPS**, manter a aba visível por dez segundos e anotar o backend e o resultado. A meta do pedido é 60 e 30 fps, respectivamente.

## Acesso para a CEO

**FATO CONFIRMADO · IMPLEMENTADO.** Em desenvolvimento local, as três rotas abrem diretamente. Em produção, o servidor exige a conta confirmada do fundador ou uma chave válida em `?k=`, comparada à variável privada `KINEO_3D_PREVIEW_KEY`. A resposta utiliza `private, no-store`, `no-referrer` e `noindex, nofollow, noarchive`. Fontes em `app/dev/_screening/room.ts:30` e `room.ts:38`.

**TESTADO LOCALMENTE.** No build isolado em modo de produção, a chave efêmera correta abriu as três rotas. Visitante sem chave, chave errada, vazia e repetida receberam 404. A conta do fundador foi verificada com respostas simuladas de autenticação. Publicação e validação com conta real ficam a cargo da CEO.

**FATO CONFIRMADO · REPRODUÇÃO.** No Windows, [INICIAR-PREVIAS.cmd](INICIAR-PREVIAS.cmd) abre o servidor no próprio computador, na porta 3168. As três URLs aparecem na janela. No worktree, com as dependências instaladas, `npm run dev` serve as rotas. O módulo 3D já está empacotado. Para reconstruí-lo depois de editar o shader, executar `npm ci` e `npm run build` dentro de `app/dev/_screening/engine`. A checagem `npx tsc --noEmit --incremental false` passou no checkout completo em 18/11/2026.

**SUGESTÃO.** Começar a aprovação por B. É o conceito que demonstra o efeito de escrever uma ideia e já entrega esse texto à criação. Usar o aparelho do dono para confrontar a fluidez com a régua antes de escolher uma colocação no site.
