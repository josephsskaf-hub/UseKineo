# Pauta de segunda · origem × página × conta × filme × pagamento

**EVIDÊNCIA DE PRODUÇÃO / SELECT agregado em 24/11/2026.** Primeira tabela preparada retroativamente para segunda 23/11: [2026-11-16T03:00:00+00:00, 2026-11-23T03:00:00+00:00), 16/11 00h a 23/11 00h America/Sao_Paulo. [CSV completo](SEMANAL-2026-11-23.csv): 492 grupos, 133 contas novas, 42 com filme entregue no histórico e 3 com pagamento confirmado. Cada conta tem uma atribuição; são etapas, não receita nem efeito desta entrega.

**FATO CONFIRMADO.** [SEMANAL.sql](SEMANAL.sql) usa a última segunda como fim e sete dias antes como início no fuso IANA. Próxima pauta: **30/11/2026, 09h BRT (12h UTC)**, janela [23/11 00h, 30/11 00h) BRT. Salvar read_on real. O filme conta o primeiro registro de entrega no histórico dos modos de filme, criado até o corte; clipe e anúncio são excluídos. Arquivar o recibo com hash e tratar divergência posterior como reconciliação, sem sobrescrever a semana.

**ROTINA EXISTENTE / PRESERVADA.** Inventário local consultado em 24/11: kineo-busca-checkpoint-semanal-60-dias ativo aos sábados 20h BRT, término em 05/12, na conversa de Busca; trata a meta histórica, sem renovação por esta entrega. Coordenação Citações e Afiliados antiga está pausada. Não foi localizada agenda ativa de segunda para esta tabela. Nenhuma agenda foi substituída ou duplicada.

**REPRODUZÍVEL MANUALMENTE / PAUTA, NÃO AUTOMÁTICO OPERACIONAL.** A consulta será ligada por linha no quadro à pauta de Citações de segunda 30/11 e aos checkpoints dentro do encerramento vigente. A CEO/rotina executa o SELECT e anexa o CSV. Nenhum job de segunda foi criado nem próximo disparo automático comprovado. Não prometemos execução autônoma.

**MÉTODO.** Primeira âncora por sessão; conta nova uma vez, na primeira sessão elegível em qualquer página/origem. Internos canônicos e bots marcados excluídos. Conta sem sessão não recebe página inventada. Primeiro filme no histórico e pagamento têm os limites do README. Fontes financeiras novas, pagamentos sem prova do servidor e reembolsos exigem reconciliação.

**PRÓXIMO PASSO RECOMENDADO.** Kineo 3d confere a consulta e o recibo; a CEO usa o link na pauta de segunda. Não renovar a rotina histórica nem iniciar agenda permanente por esta entrega.
