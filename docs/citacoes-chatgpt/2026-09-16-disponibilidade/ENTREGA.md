# Citações — disponibilidade antes da decisão de compra

**DECISÃO EXPRESSA DO FUNDADOR, transmitida pelo Board em 16/09/2026:** retomar aquisição com credibilidade e tráfego que possa virar assinatura, sem repetir entregas. Esta execução não renova W4 nem cria prazo ou automação. Conversão fica com Kineo · MMR. Oferta, cobrança e motores não serão alterados.

## Seleção e contrato

| Candidata | Novidade | Decisão |
| --- | --- | --- |
| Trial no llms distingue plano, pausa operacional e saldo | PARCIAL: contradição nova após pausa dos motores em 15/09, diferente do reparo de moeda de 13/09 | EXECUTAR após coordenação e gates |
| Página de motor pausado ainda apresenta CTA genérico | PARCIAL: aviso já existe; caminho completo não reproduzido nesta rodada | NÃO EXECUTAR nesta entrega |
| Nova comparação com concorrentes | BLOQUEADA: sem vantagem nova comprovada nem distribuição adicional qualificada | NÃO EXECUTAR |

**HIPÓTESE / CONTRATO:** pessoa comparando motores e trial antes de assinar → fonte oferece saldo como aparente obstáculo para motor em manutenção → distinguir elegibilidade, disponibilidade e orçamento na resposta existente → `/llms.txt`, sem campanha nova → manter links e eventos existentes de páginas de entrada, cadastro, checkout e pagamento → primeira assinatura externa reconciliada pelo servidor, separada de avulso/renovação → baseline factual GET direto 16/09 05:09:38 UTC; tamanho da audiência atual desconhecido → parar por conflito de arquivo, alteração de oferta ou teste vermelho → Citações responde pela fonte, MMR pela conversão.

**EVIDÊNCIA DE PRODUÇÃO:** GET direto `/llms.txt`, HTTP 200 no corte acima, ainda anuncia “every engine listed below is unlocked”; H3/Omni aparecem na insuficiência de saldo e no catálogo como pausados. Corpo bruto preservado privadamente em `retomada-20260916-llms-before.txt`. A leitura do mecanismo de busca estava rastreada dois dias antes e não foi usada como prova atual.

**FATO CONFIRMADO:** `lib/engineLaunch.ts:23-37` contém a fonte de pausas; `app/llms.txt/route.ts:140` condiciona sua ressalva ao ramo falso de elegibilidade. `lib/entryPolicy.ts:36-39` mantém entrada gratuita e saldo canônico; `lib/checkoutPricing.ts:103-107` e `:349` mantêm preços e trial de cartão desligado. Nenhum desses módulos será alterado.

**COORDENAÇÃO:** Board reservou a rota; MMR declarou sua árvore limpa, sem reserva em llms/guias/custos. O protocolo de motores preserva escritor único do pipeline, fora desta entrega. PEDIDO registrado antes da edição. Ausência de edição local não equivale a ACK do Claude. Conferir remoto e árvores novamente antes do transporte; não sobrescrever ou incorporar trabalho não revisado.

## Validação e alcance

**PLANEJADO:** GET real offline com módulos canônicos, flags relevantes, motores pausados não anunciados como utilizáveis, motores ativos preservados, saldo insuficiente separado de manutenção, URLs/planos/créditos intactos. Typecheck e Guardião antes da fila; conferir resposta pública e SHA do deploy depois. Texto simples, sem alteração de design/UX visual.

**QUESTÃO PENDENTE / DESCONHECIDO:** última bateria real de ChatGPT continua 12/09; a coleta posterior foi bloqueada antes de qualquer pergunta. Nenhuma busca comum será rotulada como teste independente do ChatGPT. Próxima medição real deverá conter pergunta exata, hora, ferramenta/modelo disponível, resposta e fontes observadas.

**MÉTRICAS SEPARADAS:** citações observadas; visitas atribuídas (anônimos não são pessoas); cadastros externos; compradores canônicos; primeiras assinaturas; receita por moeda líquida de estornos quando conhecida; MRR incremental. Os cortes financeiros de outras pistas não são amostra desta mudança. Origem desconhecida permanece desconhecida; nada será marcado falsamente como ChatGPT.

**ESTADO INICIAL:** PREPARADO (contrato/reprodução); produto NÃO EDITADO, NÃO PUBLICADO, exposição e pagamento atribuídos DESCONHECIDOS. Publicar a coordenação não equivale a corrigir a resposta nem a receber ACK. Oito guias e duas variantes anteriores preservados.
