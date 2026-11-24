# Medida da caixa · fases independentes

**PREPARADO / TESTADO EM SELECT · 24/11/2026.** [ANTES-DEPOIS.sql](ANTES-DEPOIS.sql) compara conversões dentro de cada fase. Não compara coortes de chegada com acompanhamento ilimitado. A escolha é explícita: cada janela tem 14 dias; âncora, vínculo de identidade, criação do perfil, registro de filme entregue e pagamento terminam no corte daquela janela.

**EVIDÊNCIA DE PRODUÇÃO.** Baseline provisória [2026-11-10T16:01:33.742416+00:00, 2026-11-24T16:01:33.742416+00:00), com live_from=NULL. [Recibo](BASELINE-14D.json).

| Página | Origem | Sessões | Contas | Conta/sessão | 1º filme no histórico | Pagou |
|---|---|---:|---:|---:|---:|---:|
| /how-much-do-youtube-shorts-pay | bing_explicito | 188 | 2 | 1.06% | 1 | 0 |
| /how-much-do-youtube-shorts-pay | outra_origem_gravada | 42 | 1 | 2.38% | 0 | 0 |
| /how-much-do-youtube-shorts-pay | duckduckgo | 82 | 0 | 0.00% | 0 | 0 |
| /how-much-do-instagram-reels-pay | chatgpt_explicito | 53 | 0 | 0.00% | 0 | 0 |
| /how-much-do-youtube-shorts-pay | origem_nao_gravada | 23 | 0 | 0.00% | 0 | 0 |
| /how-much-do-instagram-reels-pay | origem_nao_gravada | 17 | 0 | 0.00% | 0 | 0 |
| /how-much-do-instagram-reels-pay | bing_explicito | 1 | 0 | 0.00% | 0 | 0 |
| /how-much-do-instagram-reels-pay | google | 1 | 0 | 0.00% | 0 | 0 |
| /how-much-do-instagram-reels-pay | outra_origem_gravada | 1 | 0 | 0.00% | 0 | 0 |
| /how-much-do-youtube-shorts-pay | google | 1 | 0 | 0.00% | 0 | 0 |

**DESCONHECIDO / NÃO EXPOSTO.** after_not_observed=true e after_complete=false. Não existe depois observado nem taxa depois de zero. Essa baseline não substitui o antes de uma ativação futura.

**CRITÉRIO DA FRONTEIRA.** Antes é [live_from−14d, live_from). Depois é [live_from, live_from+14d), limitado à leitura real. A conta é nova naquela fase e aparece uma vez, na primeira sessão elegível em qualquer página/origem da fase, antes do filtro das duas páginas. Os intervalos de criação de perfil não se sobrepõem, portanto uma conta não pode ser novo cadastro nas duas fases. Uma sessão 23:59 antes da ativação, com vínculo, cadastro e compra no dia seguinte, não aumenta o antes. Sem uma âncora elegível depois, esse cadastro fica em accounts_without_eligible_session; não é atribuído artificialmente. O primeiro registro de filme no histórico é a inserção completed do escritor atual, com modos de filme explícitos; clipe e anúncio não contam.

**TESTADO NO POSTGRESQL COM VALUES SINTÉTICOS.** [PROVA-FRONTEIRA.sql](PROVA-FRONTEIRA.sql) inclui sessão 23:59, vínculo tardio, perfil tardio, filme e pagamento no dia seguinte, clipe e conta que volta. Dois cortes posteriores deixaram rows, coverage e windows do antes idênticos. No depois, a compra passou de não observada para observada no corte correto. Cinco mutantes foram rejeitados: corte global no vínculo, cadastro, filme ou pagamento; clipe como filme. [Recibo](PROVA-FRONTEIRA.json). As seis provas anteriores de deduplicação, bot, interno, âncora, pagamento do navegador e origem continuam arquivadas separadamente em [PROVA-SQL-SINTETICA.json](PROVA-SQL-SINTETICA.json).

**CONTRATO DO EXPERIMENTO.** A CEO registra live_from UTC exato, SHA, chave e exposição nas duas páginas. No instante de ativação, salvar o antes em arquivo imutável com SHA-256. Depois de 14 dias, comparar cada mesma página e origem conhecida, com cobertura e sessões ambíguas. Não recalcular e sobrescrever o recibo do antes: divergência por correção de dado ou ingestão tardia é uma reconciliação explícita. O SQL limita o antes ao seu corte mesmo em execuções posteriores. Origem ausente/residual é descritiva; não vira ChatGPT. Bing e ChatGPT não são combinados numa taxa.

**DECISÃO DA CEO NO QUADRO.** O limiar operacional de 4% só é avaliado com 14 dias completos de exposição, por página/origem comparável e com denominadores. Amostra pequena não comprova causalidade. Não alteramos a posição, ativamos, publicamos ou criamos rollback automático. [Preparador offline](COMO-RODAR.md).
