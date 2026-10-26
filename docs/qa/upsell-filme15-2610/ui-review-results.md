# Revisão React e fixtures da interface — 26/10/2026

**TESTADO LOCALMENTE:** base da revisão = commit `07ff7a5997cc7c70700d3c5de3e5076aff1b55b1`. `git diff --check` passou. Não foi executado outro typecheck em paralelo ao gate integrado do agente principal.

**TESTADO LOCALMENTE:** o efeito real de `GenerateClient.tsx` foi extraído do arquivo e transpilado com TypeScript. Mocks de perfil, geração atual, Web Locks, armazenamento e `trackClosedEvent` provaram: perfil ainda indefinido emite zero; a hidratação posterior preserva a amostra real e emite uma vez; remontagem do efeito não duplica; outra geração e limiar inferior a cinco segundos não emitem. Resultado da execução: `UI watch fixture: hydration, once per source, generation binding, five-second threshold PASS`.

**TESTADO LOCALMENTE:** o efeito real de `app/film-complete/page.tsx` foi extraído e transpilado, com fetch e temporizadores simulados. O GET de status continuou com um POST de início pendente; a consulta seguinte não abriu outro POST; a limpeza abortou a requisição pendente; HTTP 404 apresentou indisponibilidade e encerrou o polling. Resultado: `UI status fixture: independent GET, one POST in flight, cleanup abort, terminal404 PASS`.

**FATO CONFIRMADO:** a evidência de reprodução nasce do sampler existente, após cinco segundos reais; a hidratação apenas permite atribuí-la ao filme da mesma tentativa. O novo evento usa a hora normal de recebimento no servidor; o código não fabrica um horário anterior para a reprodução (`app/(dashboard)/generate/GenerateClient.tsx:5995`, `app/(dashboard)/generate/GenerateClient.tsx:6091`).

**FATO CONFIRMADO:** o recorte da oferta lê a qualidade e a duração do arquivo entregue, e a coorte recebe um botão principal para a versão completa; o download permanece acessível em estilo neutro. O cartão antigo de export limpo e seu botão gêmeo ficam fora desse recorte (`app/(dashboard)/generate/GenerateClient.tsx:5805`).

**FATO CONFIRMADO:** a copy do CTA contempla as línguas da interface e a duração vem da constante compartilhada. A página de resultado usa inglês quando não possui tradução própria; esse fallback tem direção LTR, enquanto a frase de cobrança mantém sua própria direção quando traduzida (`lib/growth/filmCompleteCopy.ts:8`, `app/film-complete/page.tsx:38`).

**FATO CONFIRMADO:** no preview, os blocos da nova oferta de e-mail são o HTML gerado pelo helper real. Copy e preço vêm dos módulos reais. Os contornos das telas, seus quadros de filme em CSS e a disposição geral são reconstruções estáticas dos trechos alterados; não são capturas do produto em execução (`docs/qa/upsell-filme15-2610/create-preview.cjs:23`, `docs/qa/upsell-filme15-2610/create-preview.cjs:31`). A barra de progresso ilustrativa foi retirada porque não existe na página implementada.

**QUESTÃO PENDENTE / DESCONHECIDO:** esta revisão não produziu screenshot em navegador e não valida produção, render ou pagamento. As fixtures acima são locais, sem rede, sem `.env` e sem render pago. O agente guardião recebeu o código integral das duas execuções para consolidar a cobertura no teste principal da tarefa.
