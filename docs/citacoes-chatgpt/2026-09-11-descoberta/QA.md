# [Citações] QA dos quatro links contextuais

**IMPLEMENTADO / TESTADO LOCALMENTE — 11/09/2026, 11h50–11h53 BRT:** fonte `14ec7651`, integrada como `e8632940` sobre main `679b789c`. Só dois arquivos funcionais diferem: template de motores com parágrafo exclusivo de Seedance e frase adicional no parágrafo da calculadora. Catálogo, grants, FAQs, preços, formulários, checkout, V1/V2 e campanhas permanecem intactos. Reserva de edição confirmada pelo Board sem escritor conhecido; não é garantia global de exclusividade.

**TESTADO LOCALMENTE:** cinco checks do agente confirmaram destinos existentes, restrição ao Seedance em todos os sete slugs atuais, quatro links normais sem query/evento e preservação do parágrafo anterior. [Cinco GETs Next](LOCAL.json): duas origens com um link para cada guia; Kling como controle sem os links; ambos os destinos respondem 200 e conservam campanhas V1/V2.

**TESTADO LOCALMENTE:** typecheck bruto da integração `--noEmit --incremental false` terminou 0 após gerar tipos Next das duas origens e dos dois destinos, incluindo a calculadora que faltava no typecheck inicial do agente. Não declarar execução de toda a suíte histórica nesta etapa de links.

**TESTADO LOCALMENTE / NAVEGAÇÃO REAL:** em desktop de 1100 px, a raiz focou e abriu por teclado o novo link da calculadora para o guia de custo. Destino observado: `/ai-video-generator/complete-60-second-shorts-cost`, H1 correto e `Compare plans` com `intent_campaign=citacoes_cost_decision_v1`. Em mobile de 390 px, abriu o link de Seedance para `/vs/invideo-alternatives-faceless-shorts`; H1 correto e `Compare Kineo plans` com campanha V2. Não clicou CTA de cadastro/plano, preencheu formulário ou enviou dados. Foi navegação local, não aquisição.

**TESTADO LOCALMENTE / VISUAL:** comparação antes/depois da calculadora e parágrafo novo de Seedance inspecionados no Next real; links legíveis em 390 px, documento também 390 px. [Preview autocontido](../../citacoes-descoberta-20260911/preview.html) cobre as duas seções em desktop/mobile e foi encaminhado ao painel. Imagens emitidas nesta tarefa. Recorte herdado da ficha técnica mobile permanece acima do novo parágrafo e está registrado no reparo de grant; não foi ampliado nem corrigido aqui. Console consultado sem avisos/erros naquele momento.

**LIMITE / MEDIÇÃO:** visitas locais e GETs desta pista não são pessoas externas. Sem novos eventos nem campanhas para estes links; medir pelos destinos e pagamentos canônicos disponíveis, sem atribuição causal garantida ao elo de origem. Preservar janela anterior V1/V2 e anotar início da distribuição após contraprova pública. Nenhuma consulta de banco ou envio comercial nesta entrega; próxima bateria real do ChatGPT às 20h BRT.

**VALIDADO EM PRODUÇÃO — 11/09/2026:** publicação `ad3cb3fc94308711119287476701e33924b2dd08` sobre `679b789c3381c914392a8c56ed150226a6af341e`, pela worktree exclusiva de publicação, enfileirar e BAT revisados com exit 0. Main remoto conferido no mesmo SHA. [Transporte e preflight](TRANSPORTE.json).

**EVIDÊNCIA DE PRODUÇÃO — 11h57m47s–11h57m49s BRT:** os [cinco GETs públicos](PRODUCAO.json) passaram. Seedance e calculadora possuem um link para cada guia; Kling controle possui zero; os dois destinos respondem 200 e conservam suas campanhas. O primeiro GET positivo delimita a observação da nova distribuição, não o instante exato do rollout. Não reinicia as janelas V1/V2.

**EVIDÊNCIA DE PRODUÇÃO — contraprova independente do Board, recebida nesta tarefa em 11/09:** [Guardião 34613074308](https://github.com/josephsskaf-hub/UseKineo/actions/runs/34613074308) completed/success no SHA exato. Vercel `dpl_FuCMbDUADpydGKJ5RKQDaJ7i6VN2` READY, production, alias `www.usekineo.com`, `aliasError=null`, mesmo SHA; leitura Vercel às 11h58m23s BRT. Reserva de transporte liberada ao Board após reunir as duas contraprovas. Não reenfileirar. Fechamento documental permanece local até próxima entrega substantiva.

**QUESTÃO PENDENTE / DESCONHECIDO:** efeito sobre rastreamento, citações, pessoas externas, pagamento e receita. HTTP positivo e deploy não comprovam nenhum desses resultados. Próxima bateria real continua às 20h BRT.

**LIMITE DA CONTRAPROVA:** revisão somente leitura do agente HTTP não encontrou bloqueador nos cinco registros. O JSON compacto guarda status, contagem de links e presença do marcador de campanha; não guarda corpo completo, canonical ou host final. Não comprova identidade integral do HTML. Preservação funcional das variantes decorre da revisão do delta e do QA local; SHA/CI/deploy decorrem da confirmação independente do Board.
