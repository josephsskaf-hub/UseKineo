# C4 · Sonda interna de 30 e 60 segundos em blocos · 26/11

**IMPLEMENTADO.** A rota administrativa existente aceita `POST /api/admin/engine-test?probe=blocks`. O lado do servidor confere a conta da casa antes do corpo. `GEMINI_BLOCOS_2611 = 'off'` permite só a prévia dos pedidos para a conta autorizada. A escolha de motor, o débito, a oferta e a fila do filme do cliente conservam o caminho de hoje.

**EVIDÊNCIA DA CASA · 25/11.** Em `docs/filme-nota-9/teste-motores-2511/RESULTADO.md`, seção 6, a CEO inspecionou um segundo clipe de 15 s com as duas folhas do primeiro. A identidade se manteve nos quatro planos. A emenda de áudio e o resultado de 60 s ficaram por provar. O artefato desta branch produz **2 ou 4 clipes separados, na ordem**. Ele não monta nem entrega um MP4 único ao cliente.

## Contrato do ensaio

**FATO CONFIRMADO.** Campos esperados: `dry_run` booleano explícito, `duration` 30 ou 60, `cast` com 1 ou 2 entradas distintas `{name,image_url}`, e `blocks` com 2 ou 4 listas de planos. Cada plano tem `{prompt,duration}`. Cada lista soma 15 segundos inteiros e contém até 6 planos. Referências no texto usam `@Image1` e `@Image2`; a lista de folhas é declarada uma vez no filme. O código usa o conversor Gemini de 15 s da casa para reiniciar o relógio de cada clipe e preservar índices e enquadramento. Escolhas de luz, local e câmera continuam pertencendo aos planos escritos pelo diretor.

**TESTADO LOCALMENTE.** `node scripts/test-gemini-blocos-2611.mjs` executa o POST real com conta, razão de eventos e fila fictícios. O caso sintético `body(60)` no arquivo mostra o manifesto completo em quatro blocos. `node scripts/test-gemini-blocos-2611.mjs --mutants` exercita sete mutantes. A prévia devolve `plan_id`, entradas exatas do fornecedor e estimativa de vídeo. Não consulta o razão nem gera vídeo.

| Resultado do POST controlado | Conduta |
|---|---|
| 200 | Recibos por índice na ordem da história. O GET anterior da sonda (`engine=probe&endpoint=…&request_id=…`) consulta cada clipe. |
| 202 | O tempo seguro para iniciar o próximo POST se esgotou. Repetir o mesmo manifesto. Os recibos anteriores são reutilizados. |
| 409 budget_busy | Outra execução detém a trava persistente. Reconsultar depois de concluída. |
| 409 reconcile_block | Há reserva sem recibo confiável. A rotina interrompe o restante, conserva o valor estimado reservado e recusa o reenvio desse bloco. A CEO reconcilia com o fornecedor. |
| 429 daily_cap / 503 spend_unreadable | O preço estimado do restante não cabe, ou o gasto não pôde ser determinado. Nenhum novo POST à fila nessa chamada após a recusa. |

**FATO CONFIRMADO.** O teto é o mesmo das sondas (`PROBE_DAILY_CAP_USD` no código da rota). Na base de 26/11 vale US$ 8,30 sobre as últimas 24 horas. Vídeo 720p a US$ 0,0819/s: 30 s = US$ 2,457 e 60 s = US$ 4,914, antes dos tokens. Esses números são a régua estimada da sonda, não comprovante de valor final. Depois de uma eventual habilitação interna, a trava de evento serializa esta sonda e as sondas anteriores do mesmo orçamento. A reserva do bloco precede o POST ao fornecedor; o SHA do conteúdo determina a identidade do plano. Uma queda após a reserva, write perdido ou resposta ambígua nunca libera reenvio automático. Trava deixada por processo interrompido exige reconciliação humana; não expira sozinha. Nenhuma tabela ou migration nova.

**QUESTÃO PENDENTE.** A aprovação de um ensaio futuro e do orçamento segue com Joseph e a CEO. Antes de ativar para a casa, fechar sondas da versão anterior que ainda estejam em andamento. Na prova autorizada, comparar identidade, vestuário, continuidade de local/luz e direção de câmera entre blocos, sobreposição da narração, duração após montagem e fatura de token. Nenhum render foi feito nesta entrega.

**VOLTA do revisor.** Na ponta anterior, @Image3 sobrevivia como texto literal. A validação local do manifesto aceita @Image1 e, com duas folhas, @Image2. A rota recusa índice inválido, ambíguo e tag nativa do fornecedor antes de consultar o razão ou chamar a fila. O conversor do filme público não foi alterado.
