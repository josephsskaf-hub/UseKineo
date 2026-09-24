# Examples — revisão visual, 24/09/2026

**CORREÇÃO DE QUALIDADE AUTORIZADA (24/09/2026):** após notar perda de nitidez, o fundador aprovou refazer os previews. Os nove filmes selecionados agora apontam para `examples-hd-sep24`: cortes reexportados diretamente dos renders de origem em 1080×1920, H.264 CRF16/preset slow, sem upscale das cópias reduzidas. Capas extraídas em resolução integral com qualidade WebP95. Mesmos filmes, trechos, ordem e enquadramento; castelo mantém o corte original 6,5–12,5s, identificado por comparação de frames. Paths novos evitam cache das versões 540p/480p. Nenhuma geração de IA ou cobrança de créditos.

**AUTORIZAÇÃO DO FUNDADOR (24/09/2026):** após ver os cortes de Tunguska e robô na prévia, Joseph respondeu “ja vi, pode subir ta otimo”. Publicação da página candidata autorizada. A rota de comparação `/examples/design` continua bloqueada em produção; a página pública é `/examples`.

**AJUSTE FINAL DO FUNDADOR:** durante a publicação, solicitou robôs no card horizontal principal e Tunguska à direita, mantendo Lituya Bay no terceiro destaque. Ordem final aplicada antes da integração.

## Seleção do fundador — atualização de 24/09

**REVISÃO DE TRECHOS / IMPLEMENTADO EM PRÉVIA:** a pedido do fundador, os dois Omni agora usam cortes dos renders originais: Tunguska `18,0–22,5s` (globo, onda de fogo, aproximação do continente) e robô `20,0–25,0s` (robô de pé e colisão). Capas extraídas aos `18,3s` e `22,0s`. Arquivos novos `tunguska-globe` e `robot-collision` em `public/previews/examples-sep24/` e `public/posters/examples-sep24/`. Os dois primeiros destaques reproduzem previews com os mesmos controles de pausa, visibilidade e economia de dados; Lituya permanece idêntico. Consulta de origens limitada aos dois IDs da conta do fundador, sem alteração em banco.

**REVISÃO SOLICITADA / IMPLEMENTADO EM PRÉVIA:** o fundador substituiu o hero: Tunguska Omni Flash no card principal, robô Omni Flash e Lituya Bay H3 nos laterais. Farol, trem e vulcão passaram para a coleção, ao lado de Tunguska H3, avião de 1942 e castelo. Mesmos nove vídeos, preservando motores e arquivos.

**DECISÃO DO USUÁRIO NESTA TAREFA / IMPLEMENTADO EM PRÉVIA:** nove filmes escolhidos por screenshot, em três destaques (farol, trem, vulcão) e seis cards (Tunguska Omni, robô Omni, Tunguska H3, avião de 1942, Lituya H3, castelo). A seleção substitui o catálogo na página candidata, sem repetição entre hero e coleção. As quatro alternativas continuam disponíveis na rota de revisão.

**EVIDÊNCIA DE PRODUÇÃO (Supabase, SELECT somente leitura, 24/09/2026):** os IDs novos `0ebba562-2599-40e2-ae46-b03e67dd3a28`, `48f1007c-d9be-4702-91c6-c9f1e0c3db38` e `19e317fe-6838-4edc-9fbf-d830d62be140` pertencem à conta do fundador; motores e durações conferem com os prints (H3/43s, Seedance/84s, H3/39s). As três escolhas de 16/09 também foram verificadas por ID e proprietário. Não houve escrita em banco nem alteração da política pública de vídeos de clientes.

**FATO CONFIRMADO:** `lib/ui/examplesSelectionSep24.ts` contém a lista explícita. Seis arquivos em `public/previews/examples-sep24/` são trechos reais dos primeiros dez segundos dos renders selecionados, H.264 540px sem áudio; capas são frames aos 0,3s. Omni e castelo reutilizam os previews públicos já aprovados. O player informa que são previews e preserva o enquadramento vertical; o hero usa recorte visual com foco ajustado no farol.

**TESTADO LOCALMENTE:** 505 verificações offline após a seleção, incluindo nove entradas únicas e seis cards abaixo do hero. Artefato `sua-selecao.html` e antes/depois regenerados. Esta atualização permanece na branch de prévia.

## Histórico das quatro propostas

**SUGESTÃO / IMPLEMENTADO EM BRANCH DE PRÉVIA:** quatro montagens com a estrutura de cards escolhida pelo fundador. Ele pediu nova escolha do acervo antes da publicação. Não integrar em main até essa escolha.

**FATO CONFIRMADO:** `app/examples/design/page.tsx` aceita quatro opções explícitas e devolve 404 fora de `VERCEL_ENV=preview`. Assets e motores vêm da curadoria existente em `lib/publicExamples.ts` e `lib/homeVideoCuration.ts`. Nenhuma consulta adicional a vídeos privados.

**IMPLEMENTADO:** página candidata com busca, filtro por motor, player modal, azul no ícone, sem preços nos cards e cinco adições públicas. Ofertas, créditos, autenticação e chamadas de geração preservadas.

**FATO CONFIRMADO:** capas em `public/posters/examples-sep24/` são quadros extraídos dos clipes locais abaixo, sem geração ou reconstrução de imagens:

| Capa | Clipe de origem em public/previews | Segundo |
|---|---|---|
| lighthouse.webp | curation-sep16/b5434412-62b9-48f5-9a10-c36e2e725c9f-h.mp4 | 4 |
| volcano.webp | curation-sep16/6b9b363c-3185-4db7-a877-46b77e334f06-h.mp4 | 4 |
| presenter.webp | 216cbed2-b95f-47e7-98bc-e4c3fc3010a9.mp4 | 1 |
| servers.webp | 98a5ac54-3c28-4a8f-8ba2-4071bc0388c4.mp4 | 1 |
| rome.webp | c4e4fbab-0978-4daa-9fcf-119096370210.mp4 | 1 |

**TESTADO LOCALMENTE:** TypeScript sem erros, 20 scripts críticos do Guardião aprovados, ponte comercial 73 verificações e galeria 649 verificações offline. O teste verifica quatro montagens distintas, existência de cada asset e bloqueio da rota de revisão em produção. Asserções de SSR não certificam interação no navegador.

**IMPLEMENTADO:** `scripts/test-examples-gallery.mjs --preview <diretório>` gera HTML autocontido antes/depois desktop/celular e as quatro montagens usando JSX real e capas locais. O player e filtros são estáticos nesse HTML; a versão Vercel é interativa.
