# Home com um pouco de 3D · revisão de 18/11/2026

**IMPLEMENTADO.** A e B exibem a home do repositório na rota privada. A projeta a película atrás de “Choose what to make”. B projeta no cartão “AI Faceless Videos”. Digitar na caixa da prévia transforma a frase em partículas e depois no filme. C mostra a home atual. [Comparar as doze fotos e o vídeo offline](APROVACAO.html) · [Gravação A e B em 10 s](home-3d-10s.mp4)

**TESTADO LOCALMENTE.** As rotas estão disponíveis na máquina da sessão. [A · título](http://127.0.0.1:3288/dev/home-3d) · [B · cartão](http://127.0.0.1:3288/dev/home-3d?v=b) · [C · atual](http://127.0.0.1:3288/). Para reabrir o servidor se estiver encerrado, executar na worktree `node node_modules/next/dist/bin/next dev -H 127.0.0.1 -p 3288`. A comparação offline abre diretamente pelo arquivo HTML.

**SUGESTÃO.** Escolher B se o objetivo for acrescentar movimento ao produto e manter os quatro cartões próximos ao menu. A dá mais destaque à película e usa uma faixa de 170 px na captura de 1920. C preserva a apresentação atual. A decisão pendente é a posição do 3D.

## Carregamento e movimento

**TESTADO LOCALMENTE.** O controle C usa uma compilação de produção separada da home na base `7514f4996`. A e B usam uma segunda compilação com a rota privada. Os ensaios usam os componentes, os layouts e a mídia reais, uma sessão local de teste e serviços externos bloqueados. Cada combinação abriu seis vezes em contextos frios, alternando todas as ordens de A/B/C. LCP é o maior conteúdo visível. A faixa contém o menor e o maior resultado. [Amostras brutas](medicoes.json)

| Perfil | Página | LCP mediano | Faixa de LCP | FPS 3D | FPS de vídeo da home¹ | FPS de animação do navegador |
|---|---|---:|---:|---:|---:|---:|
| PC | C | 0,778 s | 0,708–0,856 s | — | 13,39 | 30,27 |
| PC | A | 0,636 s | 0,504–0,760 s | 29,99 | 23,99 | 29,99 |
| PC | B | 0,616 s | 0,588–0,688 s | 29,99 | 23,89 | 29,99 |
| Celular | C | 1,108 s | 1,096–1,264 s | — | 13,78 | 30,06 |
| Celular | A | 0,646 s | 0,584–1,096 s | — | 12,78 | 30,05 |
| Celular | B | 1,062 s | 0,552–1,144 s | — | 12,49 | 29,98 |

**TESTADO LOCALMENTE.** ¹ Em uma janela de dez segundos, o contador 3D leu os quadros da cena desenhados pelo renderizador. O contador de vídeo acompanhou os quadros apresentados pelo primeiro vídeo da home em reprodução na área visível, inclusive nas trocas de clipe. A última coluna conta os callbacks de animação do navegador. Os filmes do catálogo têm cadência própria. No celular, a tela conserva o vídeo ou o pôster original e faz zero requisições à projeção.

| Largura | Página | Transferência de recursos iniciados até load, mediana² | Conteúdo da projeção, após load³ |
|---:|---|---:|---:|
| 1366 | C | 3.524.810 B | 0 B |
| 1366 | A | 3.447.342 B | 706.686 B |
| 1366 | B | 3.528.501 B | 706.686 B |
| 390 | C | 5.731.578 B | 0 B |
| 390 | A | 5.735.383 B | 0 B |
| 390 | B | 5.735.656 B | 0 B |

**TESTADO LOCALMENTE.** ² A soma considera a navegação e os recursos locais concluídos durante a amostra que começaram até o evento load. Inclui as requisições de mídia da home e seus cabeçalhos, conforme Resource Timing. ³ Soma dos corpos codificados do controlador, motor, pôster e MP4 na primeira amostra. O navegador iniciou a projeção depois de load em todas as amostras desktop.

**TESTADO LOCALMENTE.** Na primeira rodada de PC, B acrescentou 114 ms à mediana de LCP. O navegador identificou o pôster da raposa no mosaico como último candidato. A prévia B passou a priorizar os três pôsteres da primeira fileira já presente em tela e a posicionar a entrada de texto sem deslocar o botão do cartão. A tabela acima usa as medições posteriores ao ajuste.

**QUESTÃO PENDENTE.** Os perfis compartilham a NVIDIA GeForce RTX 3090. PC em 1366 × 768 com CPU desacelerada em 2×. Celular emulado em 390 × 844, densidade 2, CPU em 4× e rede em 10 Mbps com 75 ms de latência. As fotos de aprovação usam 1920 × 1080 e 390 × 844. A confirmação de velocidade em aparelhos físicos e tráfego público depende de uma etapa posterior.

## Portão, mídia e continuidade

**FATO CONFIRMADO.** A prévia importa a home existente. A comparação conserva a ordem, o texto e o destino dos quatro cartões, os cabeçalhos e os destinos de navegação. O parâmetro de atribuição do link para a calculadora no rodapé acompanha naturalmente o caminho visitado. A página pública, o sitemap, o menu e o Studio não fazem parte do diff. Ver `app/dev/home-3d/page.tsx`, `components/CostCalculatorLink.tsx:17` e [verificação visual e de cliques](verificacao.json).

**FATO CONFIRMADO.** A película usa a textura de *Lituya Bay*, ID do catálogo iniciado por `19e317fe`, com selo MiniMax H3. O shader e o vídeo vêm da sala de prévias. Ver `lib/ui/examplesSelectionSep24.ts:32`, `app/dev/_screening/engine/frames.js` e `public/screening-room/home-projection.js`.

**TESTADO LOCALMENTE.** Visitante, outra conta interna e chave inválida receberam 404. A sessão simulada do fundador recebeu 200. O acesso por chave válida limpa a URL antes de renderizar a home e emite um cookie HTTP-only restrito a esta rota. A resposta declara noindex e no-referrer. O portão compartilha a regra da sala de prévias. O guardião offline cobre autorização, adulteração, expiração e rotação da chave.

**TESTADO LOCALMENTE.** A tela móvel e a preferência de movimento reduzido conservam a mídia original. Sem suporte gráfico ou com menos de 24 fps sustentados por quatro segundos visíveis, B volta ao vídeo/pôster do cartão. A mantém o pôster original da home atrás do título. O CTA continuou clicável nas quedas testadas. O antigo piso de 60 fps do Studio não se aplica à home.

**TESTADO LOCALMENTE.** O Chrome abriu os links A e B da worktree com WebGPU. WebGL2 também montou a película no ensaio de compatibilidade. A rotação para largura móvel e a economia de dados conservaram a mídia original. A sessão simulada de fundador abriu B sem chave, com Dashboard e o destino autenticado de criação. O HTML offline exibiu as doze fotos e o vídeo de dez segundos. [Verificações complementares](formatos.json)

**TESTADO LOCALMENTE.** TypeScript passou. O comparador de regressões rodou nove guardiões de cartões, topo, mosaico e 3D. Quatro passaram no ramo e os cinco restantes já falhavam na main. Zero vermelhos novos. A entrega permanece na branch local `codex/home-3d-1811`.
