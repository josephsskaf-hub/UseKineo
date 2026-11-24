# Oferta para empresa · telas e prova local

24/11/2026 · branch `codex/oferta-empresa-2411` · base `c81ca048e40babe9128ffc8833f1d9482aad36b9`

**IMPLEMENTADO.** `/company-video-service` usa o contrato editorial `7e1f3e3a` da Product Story. O cenário é de quatro anúncios mensais de produto, com fotos autorizadas, um SKU, uma revisão consolidada e prazo condicionado à vaga de produção. Os dois exemplos são `relogio` e `caneca`, já aprovados e servidos pelo catálogo `lib/ads/adsExemplos.ts`. O titular de preço aprovado em `lib/growth/companyOffer.ts` nasce vazio. Na folha, o cenário de preço da Parte 1 vem de um parâmetro exclusivo da montagem offline e usa `formatCheckoutMoney` de `lib/checkoutPricing.ts`.

**FATO CONFIRMADO.** A chave é `off` em `lib/growth/companyOfferRelease.ts`. A página e o endpoint consultam a mesma autorização no servidor. `off` retorna 404 antes de autenticar ou ler o corpo, e `internal` exige sessão confirmada na lista exata da casa. A página fica fora do sitemap e é noindex no ensaio interno. As fotos mostram o rascunho renderizado localmente, com o estado 404 ao lado.

**FATO CONFIRMADO.** O formulário pede somente e-mail de trabalho. O briefing completo fica para a conversa. A rota dedicada `POST /api/lead-capture/company-offer` grava o pedido em `leads`, com origem e data de solicitação atribuídas no servidor. Respostas aos retries preservam uma entrada ativa por endereço e a data original de captura. A entrada recebe o rótulo `Company video service · proposal request` na caixa **Business brief inbox** do painel `/admin/funnel`. Esse é o caminho de aviso à CEO, consultável no painel. Não há envio proativo por e-mail, webhook, cobrança ou chamada ao render. A rota legada rejeita a intenção da oferta e não permite forjar ou sobrescrever sua classificação. O contrato de inserção usa a API existente do cliente Supabase. [Referência consultada](https://supabase.com/docs/reference/javascript/insert).

**TESTADO LOCALMENTE.** O guardião `scripts/test-oferta-empresa-2411.mjs` montou a rota, o formulário, o endpoint e a leitura da caixa da CEO. Cobriu acesso `off/internal/public`, origem, volume de requisições, validação, ausência de efeitos externos, contatos anteriores, duplicação e sucesso/erro do armazenamento. Reprovou dez mutantes de comportamento. O navegador manteve a estrutura nos temas, sem transbordamento horizontal, e o CTA trouxe o campo de e-mail à vista a 390 e 1920. O TypeScript e a bateria comparativa têm recibos abaixo.

**QUESTÕES PENDENTES.** Parecer do kineo 3d, aprovação visual do dono, preço, escopo e capacidade de entrega. A oferta local ainda não teve exposição, pedido comercial real ou pagamento. Nenhum cliente real consta destes arquivos, e a JK está fora do teste.

- [Folha com 16 fotos e quatro combinações antes × depois](<C:/kineo/docs/decisoes-2511/oferta-empresa/TELAS-ANTES-DEPOIS.html>).
- [Medições do navegador](<C:/Users/josep/.codex/visualizations/2026/11/11/01a1c8aa-274e-7ae1-9449-35016a88218b/marca-kineo-ai-2411/oferta-empresa-2411/NAVEGADOR-RECIBO.json>).
- [Origem do CSS](<C:/Users/josep/.codex/visualizations/2026/11/11/01a1c8aa-274e-7ae1-9449-35016a88218b/marca-kineo-ai-2411/oferta-empresa-2411/CSS-RECIBO.json>).
- [Guardião e dez mutantes](<C:/Users/josep/.codex/visualizations/2026/11/11/01a1c8aa-274e-7ae1-9449-35016a88218b/marca-kineo-ai-2411/oferta-empresa-2411/guardiao.log>).
- [TypeScript](<C:/Users/josep/.codex/visualizations/2026/11/11/01a1c8aa-274e-7ae1-9449-35016a88218b/marca-kineo-ai-2411/oferta-empresa-2411/tsc.txt>).
- [Novos vermelhos](<C:/Users/josep/.codex/visualizations/2026/11/11/01a1c8aa-274e-7ae1-9449-35016a88218b/marca-kineo-ai-2411/oferta-empresa-2411/gate.log>).
