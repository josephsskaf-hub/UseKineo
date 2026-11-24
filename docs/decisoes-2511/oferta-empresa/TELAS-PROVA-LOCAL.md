# Oferta para empresa · telas e prova local

24/11/2026 · branch `codex/oferta-empresa-2411` · base `c81ca048e40babe9128ffc8833f1d9482aad36b9`

**IMPLEMENTADO.** `/company-video-service` usa o contrato editorial `7e1f3e3a` da Product Story. O cenário é de quatro anúncios mensais de produto, com fotos autorizadas, um SKU, uma revisão consolidada e prazo condicionado à vaga de produção. Usa dois exemplos próprios aprovados, `relogio` e `caneca`. O campo de preço aprovado em `lib/growth/companyOffer.ts` nasce vazio. Na folha, a hipótese da Parte 1 é um parâmetro exclusivo da montagem offline, formatado por `lib/checkoutPricing.ts`.

**FATO CONFIRMADO.** `lib/growth/companyOfferRelease.ts` define `off`. Página e POST usam a mesma autorização no servidor, antes de autenticar ou ler o corpo. Em `internal`, só entra sessão confirmada de conta da casa. A página fica fora do sitemap e usa noindex. A comparação mostra a rota desligada (404) e a proposta montada localmente.

**FATO CONFIRMADO.** O POST dedicado em `app/api/lead-capture/company-offer/route.ts` reaproveita o identificador de um contato anterior sem modificar sua linha. Grava o pedido em `events` com identificador estável por contato, nome reservado e somente o identificador interno do lead nos metadados. Um replay só é aceito se o pedido correspondente já estiver gravado. A credencial de escrita autentica o acesso ao banco, enquanto a identidade do pedido depende do UUID do contato. `app/api/events/route.ts` reserva o nome do evento antes de acessar auth ou dados. A rota legada recusa a intenção da oferta.

**EVIDÊNCIA DE PRODUÇÃO · 24/11/2026.** O revisor conferiu exclusivamente metadados do schema. `leads.id` é UUID com default, e `events.id` é chave UUID. `events` tem RLS ativo e falta permissão de INSERT para `anon` e `authenticated`. Nenhum contato precisou ser consultado. A candidata usa as tabelas existentes e preserva as políticas.

**FATO CONFIRMADO.** A caixa **Business brief inbox** de `/admin/funnel` exibe o novo pedido com o rótulo `Company video service · proposal request` junto ao briefing B2B que já existia. A contagem é por endereço normalizado e as duas intenções continuam visíveis. A caixa é o canal consultável da CEO. O formulário grava apenas o contato de trabalho, e o briefing fica para a conversa. O fluxo dispensa e-mail automático, webhook, cobrança e chamada ao render.

**TESTADO LOCALMENTE.** O guardião monta página, formulário, POST, ingestão pública e leitura da caixa. Exercita o briefing anterior intacto, falha parcial recuperável, reenvio com credencial rotacionada, uma única solicitação gravada e bloqueio do evento na ingestão pública. Também reexecuta as provas de acesso `off/internal/public`, origem, limite de requisições, validação, sucesso e falha da interface. Reprovou 13 mutantes de comportamento.

**TESTADO LOCALMENTE.** O CSS global acionava rolagem no documento e no body quando usados juntos no móvel. `app/company-video-service/company-offer.css` restringe o ajuste à rota da oferta até 640 px. Em 390 CSS px, a bancada verificou rolagem única no documento, sem lacunas dos 0 aos 3070 CSS px nos temas claro e escuro. Cinco capturas por tema cobrem a proposta até o botão de envio. As oito fotos de desktop mantêm os bytes da prova anterior. A folha reúne o 404 e a proposta nas quatro combinações. A montagem usa o CSS de produto da bancada autorizada, com envio interceptado.

**QUESTÕES PENDENTES.** Parecer independente do kineo 3d, aprovação visual do dono e decisões de preço, escopo e capacidade. A proposta está em bancada local. Os testes usam dados fictícios e não houve exposição, pedido comercial real ou pagamento. JK fica fora do piloto.

- [Folha com 22 fotos em 390/1920, claro e escuro](<C:/kineo/docs/decisoes-2511/oferta-empresa/TELAS-ANTES-DEPOIS.html>).
- [Recibo do navegador nas quatro vistas](<C:/Users/josep/.codex/visualizations/2026/11/11/01a1c8aa-274e-7ae1-9449-35016a88218b/marca-kineo-ai-2411/oferta-empresa-2411/NAVEGADOR-RECIBO.json>).
- [Recibo da rolagem móvel corrigida](<C:/Users/josep/.codex/visualizations/2026/11/11/01a1c8aa-274e-7ae1-9449-35016a88218b/marca-kineo-ai-2411/oferta-empresa-2411/MOBILE-SCROLL-RECIBO.json>).
- [Origem do CSS](<C:/Users/josep/.codex/visualizations/2026/11/11/01a1c8aa-274e-7ae1-9449-35016a88218b/marca-kineo-ai-2411/oferta-empresa-2411/CSS-RECIBO.json>).
- [Guardião e treze mutantes](<C:/Users/josep/.codex/visualizations/2026/11/11/01a1c8aa-274e-7ae1-9449-35016a88218b/marca-kineo-ai-2411/oferta-empresa-2411/guardiao-volta1.log>).
- [TypeScript](<C:/Users/josep/.codex/visualizations/2026/11/11/01a1c8aa-274e-7ae1-9449-35016a88218b/marca-kineo-ai-2411/oferta-empresa-2411/tsc-volta1.txt>).
- [Novos vermelhos](<C:/Users/josep/.codex/visualizations/2026/11/11/01a1c8aa-274e-7ae1-9449-35016a88218b/marca-kineo-ai-2411/oferta-empresa-2411/gate-volta1.log>).
