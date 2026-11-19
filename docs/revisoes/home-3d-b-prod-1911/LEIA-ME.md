# Película no primeiro cartão de filmes

**IMPLEMENTADO.** Branch `codex/home-3d-b-prod-1911`, base `86ad99de6`. A home monta o controlador público em `app/page.tsx`. O cadastro do filme Lituya Bay em `lib/ui/examplesSelectionSep24.ts:32` confirma o motor MiniMax H3. O botão existente continua levando ao fluxo de filmes.

**TESTADO LOCALMENTE.** Chrome local, 19/11/2026. Mediana de três navegações por versão e largura, com contexto novo e ordem alternada. Desktop 1920 × 1080 com CPU 2× mais lenta. Celular emulado 390 × 844 com CPU 4× mais lenta, latência de 75 ms e download de 10 Mb/s. O peso soma a transferência registrada pelo navegador para o HTML e os recursos locais iniciados até o fim do evento load. A película é medida separadamente. A navegação ficou aberta por mais 5,2 s para observar o LCP.

| Tela | LCP antes | LCP depois | Peso antes | Peso depois |
|---|---:|---:|---:|---:|
| 1920 px | 544 ms | 524 ms | 3.390.934 B | 3.391.515 B |
| 390 px | 1120 ms | 1120 ms | 5.733.712 B | 5.734.293 B |

**TESTADO LOCALMENTE.** Mediana de 708.890 B da película após load no desktop. Nenhum pedido de 3D a 390 px ou com movimento reduzido já ativo. Na RTX 3090, o Chrome sem interface registrou 30,1 fps em WebGPU e 29,3 fps em WebGL2. O cartão original reapareceu nos dois casos. A continuidade da película em um notebook físico a 60 fps segue pendente.

**TESTADO LOCALMENTE.** Acesso anônimo e com conta simulada. Ordem, destinos dos cartões e títulos iguais ao controle nos dois temas. O botão recebeu o hit-test com a película ativa e nas quedas por GPU, desempenho ou mudança de preferência. Foto feita enquanto o filme estava visível. O vídeo registra dez segundos consecutivos da home no desktop.

**QUESTÃO PENDENTE / DESCONHECIDO.** Builds locais de produção da rota / com o layout, os componentes e as mídias do repositório. Autenticação simulada, fontes locais, APIs simuladas e rede externa bloqueada. As medições descrevem este ambiente. Desempenho de clientes em produção ainda desconhecido.

[Comparação visual autocontida](comparacao.html) · [Gravação de 10 s](home-10s.mp4) · [Medições individuais](medicoes.json) · [Quadros](quadros.json) · [Verificações](verificacao.json)
