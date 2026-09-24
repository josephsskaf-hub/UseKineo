# Examples — revisão visual, 24/09/2026

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
