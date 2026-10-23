# KINEO-ADS-CENA-TEXTO-2310 — BUG 4

**FATO CONFIRMADO:** base `591399abb34fc93c25300d82d644b6c94444ded6`, conferida em `origin/main` em 23/10/2026. Trabalho restrito ao texto do AJUSTE e às provas offline.

**EVIDÊNCIA DE PRODUÇÃO — relato recebido do fundador em 23/10/2026:** o Cowork relatou, na sexta rodada de creme UGC PT, erro de orçamento de palavras, a frase “Creme hidratante facial tem com brilho natural em poucos dias”, benefício vazio e CTA truncado (“Visite nosso site e gar…”). A data exata dessa rodada e o body completo não foram fornecidos; não houve consulta ao banco ou a logs remotos nesta tarefa. As fixtures usam os trechos fornecidos e inputs sintéticos explícitos.

**FATO CONFIRMADO — estado da base:** a camada anterior já tornou o orçamento de palavras e os erros de JSON recuperáveis, com régua de 30 palavras em PT e 35 em EN (`lib/ads/cena/ajusteRespaldo.ts:151`). A falha gramatical do molde de benefício e o CTA gerado incompleto ainda exigem correção. As provas finais e os exemplos completos serão registrados após integrar e verificar a mudança.

**QUESTÃO PENDENTE / DESCONHECIDO:** naturalidade da voz e resultado audiovisual exigem render real. Esta tarefa não autoriza chamada paga, banco real, leitura de `.env`, build, PR ou deploy; preço, créditos, cobrança e estorno permanecem fora do escopo.
