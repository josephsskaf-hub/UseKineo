# Medição · Clipes · 06/10/2026

**DECISÃO APROVADA:** relatórios de 24h em 07, 08 e 09/10, 00h America/Sao_Paulo. Execução finita do sprint; não estender o mandato nem criar outro agendamento.

**FATO CONFIRMADO — lib/clips/clipMeasurement.ts:3:** coorte nova `clip_measurement_version=clips_journey_20261006_v1`. O marco do depois é esse campo, nunca a hora presumida do deploy. `CLIP_MEASUREMENT_ENABLED=false` desliga a instrumentação nova sem bloquear o produto.

| Medida | Régua |
|---|---|
| Impressão de catálogo / página | `clip_surface_impression`; catálogo carregado ou página visível. `surface=clips/effect_page`, `effect` canônico na página. |
| Primeiro gesto | `clip_surface_first_gesture`; gesto confiável em controle da superfície. Não é geração aceita. |
| Efeito escolhido | `clip_effect_chosen`; pedido novo aceito. Replay, erro de saldo, seleção de cartão e visitante sem login não contam. |
| Efeito pronto | `clip_effect_ready`; somente quem moveu a linha para done. Relatório exige mesmo clip_id, user_id e effect do chosen, além da linha de clipe pronta. |
| Pessoas | user_id autenticado distinto; excluir contas internas pela função canônica e bots pelo carimbo do servidor. Nunca somar pessoas de efeitos/origens diferentes como total. |
| Anônimos | navegadores com identificador persistente, separados de pessoas; sem ID persistente ficam em coluna de eventos sem identidade. Não somar anônimos e identificados. |
| Origem | home, effect_page, clips ou unknown; classificação de entrada na superfície, não origem de marketing/pagamento. |

**FATO CONFIRMADO — app/api/clips/route.ts:120, lib/clips/clipEffects.ts:290 e lib/clips/clipFlow.ts:268:** os eventos de geração são do servidor. O navegador envia somente rótulos limitados de origem; bot vem do user-agent reduzido pelo helper canônico, sem armazenar o cabeçalho. A entrega concluída herda origem pelo vínculo com o pedido no SELECT, inclusive se concluída pelo sweep. Não houve coluna/migration nem alteração em débito, idempotência, fornecedor ou payload de geração.

**FATO CONFIRMADO — lib/clips/ClipTelemetry.tsx:34 e lib/clips/clipMeasurement.ts:72:** dedupe local por identidade disponível, versão, superfície e efeito (páginas). Só fecha após confirmação de gravação. Remontagens/recargas não repetem o evento confirmado; armazenamento bloqueado tem fallback de memória. Pessoas em dispositivos distintos continuam deduplicadas por user_id no relatório. Isso não promete exatamente uma linha global por pessoa.

**FATO CONFIRMADO — lib/clips/clipMeasurement.ts:34:** uma URL com preset isolado não comprova home. Usa marcador de URL, histórico imediato de navegação no mesmo site ou referrer do mesmo site, com o tipo de evidência separado. Um salto por cadastro só é atravessado quando o redirect corresponde ao mesmo efeito. Um referrer antigo não vence uma navegação mais recente conhecida. Links existentes da home não foram alterados. Se OAuth/navegador perder evidência, fica unknown. Um marcador compartilhado é uma origem informada, não prova causal.

**QUESTÃO PENDENTE / DESCONHECIDO:** publicação da coorte, cobertura real das origens, visitas externas, novos pagantes e MRR. Cadastro isolado não é pagamento; somente recorrência real com vínculo verificável pode virar receita atribuída. Este sprint não muda checkout nem fluxo de cadastro.

## Como emitir cada relatório

**SUGESTÃO operacional (somente leitura):**
1. Ler Git real, este documento e docs/SHOWCASE-CLIPES-20261006.md. Conferir candidato ancestral de origin/main e HTTP público de /api/clips, páginas e sitemap. Não executar PUBLICAR, enfileirar de novo nem publicar.
2. Separar LOCAL, ENFILEIRADO, PUBLICADO, EXPOSTO e PAGO. Sem comprovar publicação/dados, escrever DESCONHECIDO.
3. Usar `clipMeasurementReportQuery(from, until)`, lib/clips/clipMeasurementReport.ts:5, com limites UTC explícitos. Ela gera somente SELECT, filtro canônico de internos e agregados. Executar por acesso de leitura já autorizado ao projeto de produção identificado no PROJECT_STATE. Nunca abrir .env.local. Guardar apenas agregados; não salvar SQL expandido com a lista interna.
4. Janela 1: 06/10 00h → 07/10 00h BRT; janela 2: 07 → 08; janela 3: 08 → 09. Também apresentar o acumulado da mesma coorte desde 06/10 00h BRT, até o mesmo corte. UTC: 03h. Não somar contagens de pessoas entre janelas; recalcular DISTINCT na janela acumulada.
5. Comparar antes → depois apenas se mesma régua, denominador e maturação da entrega. O snapshot de 05/10 tem outra janela e não permite chamar uma mudança futura de aumento de conversão. /effects antes era 404: visitas eram DESCONHECIDAS, não zero.
6. Verificar [fal Kling 4](https://fal.ai/kling-4) e documentação oficial do modelo/custo se surgirem. Relatar estado e fonte/data; manter desligado, não preencher preço ou endpoint por inferência.
7. Entregar resumo em linguagem de dono: pessoas por efeito/origem; visitas identificadas e navegadores anônimos às páginas; lacunas; manter/desligar; até três decisões adicionais concretas para o fundador. Sem dado, não preencher com estimativa.

**FATO CONFIRMADO — lib/clips/clipMeasurementReport.ts:5:** o relatório não retorna user_id, e-mail, fotos ou prompts. Total de pessoas é DISTINCT global. As contagens por efeito/origem podem se sobrepor. Eventos sem classificação de bot, prontidão sem pedido da coorte e origem unknown aparecem como lacunas separadas. Navegadores ligados a uma conta interna na janela são excluídos também das linhas anônimas.

## Antes, teste da consulta e limites

**EVIDÊNCIA DE PRODUÇÃO — 05/10/2026, SELECT em events/profiles:** [snapshot agregado](measurement-baseline.json), janela [03:00Z, 23:44Z). Cinco chosen e cinco ready, uma conta interna. Zero contas externas registradas após filtro. Não prova ausência de visitas, cadastros ou pagamentos.

**TESTADO LOCALMENTE / consulta sintética somente leitura — 06/10 UTC (05/10 BRT):** [prova de agregação](item-4/report-fixture.json). A mesma consulta foi executada com CTEs VALUES em memória, sem consultar linhas reais nem escrever banco. Duas contas externas, três pedidos aceitos únicos, dois prontos válidos; duplicatas, conta interna, bot e ready de pessoa/efeito errados não inflaram o funil. Um navegador anônimo persistente permanece separado de uma conta identificada e de um evento sem ID durável. Isso é prova de regra, não dado comercial.

**TESTADO LOCALMENTE — 05/10 23:57:54Z:** [navegador](item-4/browser.json): entrada direta, home, home→cadastro simulado, página de efeito→cadastro simulado e preset sem evidência; impressão/primeiro gesto deduplicados; clique em efeito relacionado mantém a página de origem no denominador. APIs de eventos/geração interceptadas, zero gravação em produção e zero render.

**SUGESTÃO:** manter as páginas e a medição; manter Kling 4 desligado. Se não houver pessoas externas expostas, o próximo problema a resolver será distribuição, não aumentar o catálogo por quantidade. Só decidir investimento em novos efeitos após observar escolha e entrega por pessoa; prévias pagas dependem do fundador.
