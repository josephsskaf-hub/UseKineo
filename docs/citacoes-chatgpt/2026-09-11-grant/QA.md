# [Citações] Integração do menor grant

**IMPLEMENTADO / TESTADO LOCALMENTE — 11/09/2026, 11h37–11h41 BRT:** fonte `72fe46fa`, integrada como `d746b7f1`; main avançou com voz/avatar para `6b3384af` e foi preservada por merge `349c9f94`. Só o catálogo difere funcionalmente dessa main, em dois valores. Handoff de voz foi lido; sua incorporação não é certificação audiovisual desta pista.

**TESTADO LOCALMENTE:** seis verificações do agente confirmam delta mínimo, menor grant pelas fontes reais e igualdade de todos os demais dados/consumidores. Typecheck bruto da integração (`--noEmit --incremental false`) terminou 0, com tipos Next gerados de motor dinâmico (3577 bytes) e hub (3544 bytes). Isso supera a limitação de tipos ausentes no typecheck inicial do agente. Não declarar suíte histórica inteira verde nem repetir testes sem relação com os dois rótulos.

**TESTADO LOCALMENTE:** [quatro GETs Next](LOCAL.json) confirmaram Kling/Starter e Veo/Creator nas fichas, ambas as linhas na tabela compartilhada, os dois cards do hub e preservação das FAQs corrigidas. Seedance foi o controle de outra página de motor. As sete rotas públicas de motores reutilizam esse comparativo; sitemap e JSON-LD não usam `tier`. V1/V2 e fontes financeiras permanecem iguais à main.

**TESTADO LOCALMENTE:** [elegibilidade](ELEGIBILIDADE.json) executa `decideEngineGate` real, em loader sem rede e com entradas sintéticas: Kling/Starter e Veo/Creator com data válida atual permitidos; Veo/free sem data permanece recusado. Não são contas reais nem consulta de produção. A relação saldo/custo não substitui o gate.

**TESTADO LOCALMENTE / VISUAL:** a raiz inspecionou antes/depois de Kling em desktop de 1100 px, comparativo e hub, e Veo em mobile de 390 px. Nota, ficha e rótulos corretos foram vistos; imagens estão nesta tarefa. [Preview autocontido](../../citacoes-grant-20260911/preview.html) reúne todos os contextos afetados e foi encaminhado ao painel. Console consultado sem avisos/erros naquele momento. O layout local chamou rotas locais de eventos/stats/checkout-resume; backend fictício, nenhum clique de aquisição, credencial, `.env.local`, render ou pagamento.

**LIMITE VISUAL HERDADO:** na ficha técnica mobile, a coluna de texto longo já sofre recorte pelo container; reproduzido antes e depois, sem mudança de CSS. Os valores Starter/Creator alterados permanecem visíveis. Registrar o problema para etapa própria; não atribuir seu conserto a esta correção de dados.

**EVIDÊNCIA OPERACIONAL:** Board confirmou não ter transporte ativo; main e fila observadas em `6b3384af`. A reserva concreta será feita somente com candidato fechado e preflight. Publicação ainda pendente nesta versão do registro. Nenhuma decisão nova do fundador é necessária para esse reparo já autorizado.

**VALIDADO EM PRODUÇÃO — 11/09:** candidato `679b789c` publicado por scripts revisados, enfileirar/BAT 0, sem retry. [Quatro GETs públicos](PRODUCAO.json) às 11:46:35–37 BRT confirmaram o menor grant nas fichas de Kling/Veo e as duas linhas compartilhadas também em Seedance; hub correto. Board confirmou às 11:47:57 BRT CI `34611836166` success e Vercel `dpl_8kYDpWxPm6NQMLJTQPt9u1rNAMd2` READY/produção/www no mesmo SHA. [Transporte](TRANSPORTE.json). Reserva liberada, servidor desta QA encerrado e viewport restaurado. Não há evidência de pessoas ou pagamentos atribuídos.
