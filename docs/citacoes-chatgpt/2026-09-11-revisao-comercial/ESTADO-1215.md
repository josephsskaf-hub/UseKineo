# [Citações] Cadastros atuais e revisão comercial de 11/09, 12h15 BRT

**EVIDÊNCIA DE PRODUÇÃO:** leitura agregada pelo conector Supabase existente, autorizada pelo mandato comercial atualizado. Projeto conferido no JavaScript público de `/pricing` às 12h14m14s BRT e compatível com a conexão. Uma consulta de schema e três consultas agregadas em transações READ ONLY; sem escrita, segredo, contato, render ou dado nominal retornado. [Resultados](MEDICAO-1215.json).

**EVIDÊNCIA DE PRODUÇÃO — consulta às 12h14m24s BRT:** pessoas externas distintas em `profiles`, fonte exatamente `utm_source='chatgpt'`, agrupadas por data de criação em America/Sao_Paulo. Emails ausentes separados; contas internas excluídas conforme `lib/internalAccounts.ts:15` e `:29`.

| Dia BRT | Cadastros atribuídos ao ChatGPT | Janela |
|---|---:|---|
| 04/09 | 13 | Dia fechado |
| 05/09 | 16 | Dia fechado |
| 06/09 | 24 | Dia fechado |
| 07/09 | 12 | Dia fechado |
| 08/09 | 3 | Dia fechado |
| 09/09 | 5 | Dia fechado |
| 10/09 | 8 | Dia fechado |
| 11/09 | 7 | Parcial até 12h14m24s |

**FATO CONFIRMADO / LIMITE:** a origem pode ser preenchida posteriormente quando vazia (`app/api/track-signup-source/route.ts:144`); a migração define perfil dependente de `auth.users` com exclusão em cascata (`supabase/migrations/001_initial.sql:8`). A consulta mede os perfis existentes e sua atribuição atual. Não reconstitui o snapshot original informado pelo fundador nem comprova o estado atual da constraint só pela migração. O recorte BRT e o horário da leitura são explícitos; diferenças frente ao relato original não são automaticamente erro. Hoje parcial não deve ser extrapolado ou comparado como dia completo. Na seleção ChatGPT, nenhum interno ou email ausente foi contado; o alias `chatgpt.com` teve zero perfis externos nessa consulta.

**EVIDÊNCIA DE PRODUÇÃO — campanhas às 12h15m02s BRT:** zero linhas de eventos com `metadata.source` ou `metadata.intent_campaign` igual à campanha nas três janelas encerradas: V1 00h14m22s–06h14m22s, V1 06h14m22s–12h14m22s e V2 01h27m54s–07h27m54s. Limites exatos constam no JSON; intervalos incluem início e excluem fim. PostgreSQL resolve o limite V2 em microssegundos, `.879187`; o timestamp original `.8791873` permanece preservado no checkpoint.

**EVIDÊNCIA DE PRODUÇÃO / CONTROLE:** a terceira consulta encontrou eventos dos nomes `organic_cta_clicked`, `pricing_view` e `checkout_started` na janela geral, demonstrando alguma ingestão desses nomes. As contagens brutas de controle incluem possíveis internos/testes e não são pessoas nem resultados das variantes. Não houve correspondência de campanha para aprofundar uma transação individual.

**FATO CONFIRMADO / LIMITE FINANCEIRO:** `user_id` dos eventos do navegador vem da autenticação do servidor (`app/api/events/route.ts:179`). Pagamento canônico é `payment_success` com `source=stripe_webhook`, deduplicado por sessão Stripe (`app/api/stripe/webhook/route.ts:661` e `:708`); o writer não guarda `livemode`. Portanto não inferir receita líquida, modalidade ou pagamento real sem a verificação correspondente. Zero eventos atribuídos não prova zero visitas ou receita. O resultado comercial das duas variantes permanece **INCONCLUSIVO / SEM AMOSTRA ATRIBUÍDA**, não rejeitado.

**EVIDÊNCIA DE PRODUÇÃO / CITAÇÕES:** a última bateria de respostas reais continua a de 10/09 às 20h, com 3/20; esta consulta de cadastros não é nova medição de citação. O crescimento 3 → 5 → 8 nos dias fechados é sinal recente de melhora nos cadastros atribuídos, sem recuperação sustentada nem causalidade demonstrada para as páginas. Os quatro links novos só foram observados publicamente às 11h57 de hoje.

**DECISÃO OPERACIONAL:** preservar as duas variantes e as oito páginas. Próxima janela V2 encerra às 13h27m54s BRT; V1, às 18h14m22s. Repetir a bateria comparável ChatGPT às 20h. Nova entrega de descoberta já publicada; não abrir nona página ou criar terceira variante por falta de amostra. Board informado uma vez com resultados, limites e fila do fundador vazia.
