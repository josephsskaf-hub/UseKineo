# [Citações] QA dos quatro links contextuais

**IMPLEMENTADO / TESTADO LOCALMENTE — 11/09/2026, 11h50–11h53 BRT:** fonte `14ec7651`, integrada como `e8632940` sobre main `679b789c`. Só dois arquivos funcionais diferem: template de motores com parágrafo exclusivo de Seedance e frase adicional no parágrafo da calculadora. Catálogo, grants, FAQs, preços, formulários, checkout, V1/V2 e campanhas permanecem intactos. Reserva de edição confirmada pelo Board sem escritor conhecido; não é garantia global de exclusividade.

**TESTADO LOCALMENTE:** cinco checks do agente confirmaram destinos existentes, restrição ao Seedance em todos os sete slugs atuais, quatro links normais sem query/evento e preservação do parágrafo anterior. [Cinco GETs Next](LOCAL.json): duas origens com um link para cada guia; Kling como controle sem os links; ambos os destinos respondem 200 e conservam campanhas V1/V2.

**TESTADO LOCALMENTE:** typecheck bruto da integração `--noEmit --incremental false` terminou 0 após gerar tipos Next das duas origens e dos dois destinos, incluindo a calculadora que faltava no typecheck inicial do agente. Não declarar execução de toda a suíte histórica nesta etapa de links.

**TESTADO LOCALMENTE / NAVEGAÇÃO REAL:** em desktop de 1100 px, a raiz focou e abriu por teclado o novo link da calculadora para o guia de custo. Destino observado: `/ai-video-generator/complete-60-second-shorts-cost`, H1 correto e `Compare plans` com `intent_campaign=citacoes_cost_decision_v1`. Em mobile de 390 px, abriu o link de Seedance para `/vs/invideo-alternatives-faceless-shorts`; H1 correto e `Compare Kineo plans` com campanha V2. Não clicou CTA de cadastro/plano, preencheu formulário ou enviou dados. Foi navegação local, não aquisição.

**TESTADO LOCALMENTE / VISUAL:** comparação antes/depois da calculadora e parágrafo novo de Seedance inspecionados no Next real; links legíveis em 390 px, documento também 390 px. [Preview autocontido](../../citacoes-descoberta-20260911/preview.html) cobre as duas seções em desktop/mobile e foi encaminhado ao painel. Imagens emitidas nesta tarefa. Recorte herdado da ficha técnica mobile permanece acima do novo parágrafo e está registrado no reparo de grant; não foi ampliado nem corrigido aqui. Console consultado sem avisos/erros naquele momento.

**LIMITE / MEDIÇÃO:** visitas locais e GETs desta pista não são pessoas externas. Sem novos eventos nem campanhas para estes links; medir pelos destinos e pagamentos canônicos disponíveis, sem atribuição causal garantida ao elo de origem. Preservar janela anterior V1/V2 e anotar início da distribuição após contraprova pública. Nenhuma consulta de banco ou envio comercial nesta entrega; próxima bateria real do ChatGPT às 20h BRT.

**EVIDÊNCIA OPERACIONAL:** publicação pendente nesta versão; exige novo candidato/base, preflight e reserva de transporte. A entrega anterior de grant está publicada, verificada e com reserva encerrada.
