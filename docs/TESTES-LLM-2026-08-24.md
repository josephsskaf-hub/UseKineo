# 10 Testes de tráfego LLM/orgânico — 24/08/2026 (missão das 2h)

Ordem do fundador: "10 testes sem gastar dinheiro, que nos deem mais nas LLMs
(ChatGPT) e tráfego orgânico. Criativo, nada de óbvio."

Tese Bezos aplicada: o cliente de 2026 pergunta ao ChatGPT antes de comprar.
O ChatGPT busca via **Bing** e lê páginas que respondem direto. Logo: ser a
melhor resposta possível para as perguntas pré-compra, e chegar ao índice do
Bing em horas (IndexNow), não semanas.

## BASELINE (medido hoje — comparar em 31/08 e 07/09)

- Canal `chatgpt` (primeiro toque em `profiles`): **149 chegadas em agosto**
  (maior canal externo desde 09/08, à frente do taaft).
- TAAFT: 6 saves na última semana; akajitin converteu em 30min vindo de lá.
- Sitemap: 180 URLs, todas 200. Video-sitemap: 6 exemplos (desligado DE
  PROPÓSITO em 12/08 — crawl budget; NÃO religar sem ler o comentário em
  app/video-sitemap.xml/route.ts).
- GSC (e-mail 23/08): 404s reportados são de páginas legadas já removidas;
  as vivas estão sãs (auditadas 180/180 hoje).

## OS 10 TESTES

| # | Teste | Estado | Como medir (7 dias) |
|---|-------|--------|---------------------|
| 1 | Auditoria do balde furado: 180 URLs do sitemap testadas contra produção | ✅ achado: tudo 200; 12 lentas (lambda fria); video-sitemap desligado é decisão, não bug | GSC → Páginas: "404" deve cair a zero |
| 2 | **/reviews** — responde "is Kineo legit?" com a review real do Rick (autorizada por escrito) + schema Review sem nota inflada | ✅ no ar após push | GSC impressões da URL; perguntar ao ChatGPT "Kineo reviews" e ver se cita |
| 3 | llms.txt: seção "What real users say" — a LLM que lê o arquivo passa a ter a citação do Rick para responder | ✅ | diff visível em usekineo.com/llms.txt |
| 4 | llms.txt: "Quick verdicts" — 5 respostas prontas para a LLM citar verbatim (inclui 2 vereditos ANTI-Kineo, que é o que dá credibilidade ao resto) | ✅ | eventos com utm/chatgpt; teste manual no ChatGPT |
| 5 | robots: `/studio/create` fora do índice (casa de máquinas nova do #301 não pode comer crawl budget) | ✅ | GSC → páginas rastreadas não-indexáveis |
| 6 | /reviews no sitemap com prioridade 0.8 | ✅ | indexação da URL no GSC |
| 7 | IndexNow: 180 URLs re-submetidas ao Bing HOJE (o índice por trás do ChatGPT digere as mudanças #294/#296/reviews em horas) | ✅ disparado 24/08 | Bing Webmaster → URLs submetidas; chegadas `chatgpt` na semana |
| 8 | Schema Organization/WebSite na raiz | ✅ já existia (`<StructuredData/>`) — auditado, não duplicado | — |
| 9 | Vitrine de fatos: /api/facts + llms.txt já expõem diferencial com data (#294) — teste = re-submissão IndexNow de hoje empurra a versão nova | ✅ | citações do diferencial em respostas de LLM |
| 10 | Este documento: baseline numerada + data de releitura. Sem medição, teste é esperança | ✅ | reler em 31/08 e 07/09 e preencher a coluna |

## O QUE NÃO FIZ, E POR QUÊ (honestidade de escopo)

- Postar em Reddit/Quora com a conta do fundador: risco de ban + voz dele.
  Preparado zero; se ele quiser, os "Quick verdicts" do llms.txt são o rascunho.
- Religar o video-sitemap: decisão medida de 12/08 contra (0 impressões em 28d,
  comia o crawl das /alternatives). Manter desligado.
- Mudar títulos das 73 páginas /vs em massa: risco de perder posições que já
  existem por um ganho não medido. Um teste por vez.

## PRÓXIMA RODADA (se estes moverem número)

- Página "Sora alternative" (checar fatos na fonte antes — FACT DISCIPLINE).
- FAQ schema nos 5 engine pages com as perguntas do "People also ask".
- Atualização mensal datada do /state-of-ai-shorts-2026 com dados ORIGINAIS
  do produto (mix de motores, p95 de render) — dado original = citação de LLM.
