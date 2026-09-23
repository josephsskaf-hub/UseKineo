# Semana comercial — afiliados, aquisição e assinaturas

## Mandato e janela

**DECISÃO DO FUNDADOR (sessão Board, 18/09/2026):** coordenar as tarefas existentes durante uma semana, com melhoria contínua e prioridade ao programa de afiliados e a novos assinantes. Claude continua dono de motores, bugs do produto e administrador. Gastos e novos compromissos voltam ao fundador.

**PLANO OPERACIONAL:** 18/09/2026 02:10 até 25/09/2026 02:10 BRT, equivalentes a 2026-09-18T05:10:00Z e 2026-09-25T05:10:00Z. Sem renovação automática. Preparação pode começar antes; a última passagem de cada tarefa fecha o ciclo. Depois do corte, só reconciliar operações iniciadas e pausar o próprio agendamento. Um disparo é oportunidade de execução, não prova de trabalho ininterrupto.

**META, NÃO PREVISÃO:** buscar pelo menos um novo assinante externo pago por dia. O resultado será o número efetivamente confirmado, mesmo que menor ou zero. Não trocar receita por contagem de arquivos, mensagens, cliques ou candidatos.

## Donos e cadência

| Tarefa existente | Dono/ID | Cadência | Entrega prioritária |
|---|---|---|---|
| Kineo · Programa Afiliados | 01a08825-362a-7020-90ce-fb6d45b3f6c4 | 1 hora | Ativar parceiro elegível até primeira publicação rastreável e comprador; atribuição e termos antes de escalar |
| Kineo · MMR | 01a0a651-7565-7d71-aec3-9eb6091651be | 1 hora | Remover impedimento reproduzido entre intenção e primeira assinatura; placar financeiro canônico |
| Kineo · Citações no ChatGPT | 01a088dd-908c-7c42-9bac-3e886e72a785 | 1 hora | Prova pública útil e descoberta qualificada, sem fabricar tráfego nem multiplicar páginas semelhantes |
| Kineo · Parcerias com criadores | 01a088dd-a686-7790-975a-9b581e8d33da | 2 horas | Demonstração/distribuição com criador compatível; piloto pago só após orçamento autorizado |
| Kineo · Diretórios e listagens | 01a088dd-6c44-7e21-aabe-482fc772f970 | 2 horas | Converter submissão já aceita em ficha pública correta; nova oportunidade relevante, não reenvio |
| Board UseKineo | 01a03e3e-5f63-7cf1-8b9f-6c6646b446b7 | 4 horas | Resolver dependências, evitar colisão, consolidar dinheiro e fila de decisões |

Afiliados tem preferência em dependências comerciais e em revisão do Board. Parcerias não recruta a mesma entidade em paralelo. Toda reserva usa identidade e aliases; dados pessoais e negociações ficam nos ledgers privados existentes, não neste Git.

## Primeira passagem: continuar, não recomeçar

1. Usar a skill `kineo-receita-comprovada`. Ler AGENTS integral, estado/perguntas/Growth e referências obrigatórias, respeitando as datas. Clone ativo `C:/kineo`; nunca escrever na main suja ou no clone OneDrive. Fetch, delta da main e handoffs atuais; worktree codex própria. Reutilizar worktree segura, não criar outra a cada despertar.
2. Reconciliar entrega local, enfileirada, publicada e experimento em amostra. Procurar por mecânica e superfície nos diários e no log antes de escolher. Classificar NOVA, PARCIAL, DUPLICADA ou BLOQUEADA. Uma regressão nova reproduzida pode reabrir trabalho; pouca amostra não.
3. No máximo três candidatas por pista e duas variantes comerciais simultâneas no conjunto. Reservar superfície/dono antes de editar; reservar entidade antes de qualquer contato. Uma operação incerta se reconcilia, não se repete.
4. Cada execução continua a entrega aberta até um ponto verificável. Pesquisa e medição apoiam a execução; alvo operacional 20% pesquisa necessária e 80% produção/validação/distribuição elegível. Não inventar trabalho para cumprir proporção ou relatório por hora.

## Primeiros trabalhos, por pista

### Afiliados — prioridade da semana

**FATO CONFIRMADO na base 264df924:** `lib/affiliateCommission.ts:9` declara taxa 0,3; o arquivo também declara pagamento manual, carência e mínimo. Há pedido posterior de 20% por 12 meses no histórico do fundador. **CONTRADIÇÃO A RECONCILIAR:** não trocar termos, prometer 20/30/40% nem divulgar bônus por memória. Ler código, decisão vigente, concessão real e superfície pública; registrar divergência específica para decisão. Preservar obrigações existentes.

Primeiro, aproveitar a auditoria já feita (81 itens no ledger privado de 15/09), não refazê-la. Conferir apenas mudanças/respostas e o caminho de atribuição ainda sem prova. Reutilizar correções de cookie/zero-click existentes; não reescrever checkout ou webhook. Provar offline com mocks e ler evidência real existente. Uma compra real de teste exige orçamento explícito e não conta como assinante externo.

Depois, concentrar ativação nos parceiros que realmente aceitaram afiliação: link próprio correto, kit com filmes autorizados já existentes, uso concreto e primeiro local de publicação. Não confundir convite, cadastro de afiliado, aceite, link copiado, publicação e venda. Se não houver resposta elegível, melhorar superfície pública/kit existente ou qualificar novo parceiro antes de pedir autorização de abordagem. Evitar listas enormes sem distribuição.

**Guardas herdadas:** Franco pediu indisponibilidade até 25/09 22:54 UTC, depois do fim desta janela; não cobrar antes. Recusas de comissão não viram aceites ao renovar sprint. Opt-out/bounce e todos os aliases continuam suprimidos. Não contatar den.higgins, noelrss21, emiliomontinari, akajitin nem AltAI/R.Rahman/altaitools.com. Consultar lista privada completa e histórico real, não apenas estes exemplos. GET `/api/affiliate/me` pode escrever; não usar como consulta só leitura.

### MMR — converter intenção sem refazer A1

**VALIDADO EM PRODUÇÃO (18/09 01:43:50 BRT, registro anterior):** A1 mensal FIRST50/COMEBACK50 publicado em bda79eb6; fechamento documental 264df924. Fonte: `docs/growth/BOARD-RECEITA-A1-2026-09-18.md`. Não reaplicar 153866ed nem refazer esta correção. Gate: 20 visitantes externos identificados elegíveis ou revisão em sete dias; pouca amostra = inconclusivo. Regressão de cobrança/navegação pode parar antes.

Escolher o próximo obstáculo real fora dessa superfície. Reconciliar candidatos locais TRIAL10/Welcome20 antes de construir outra versão, sem misturar ofertas ou burlar gate visual. Pedidos no backend financeiro/admin/auth vão ao Claude; nenhum código protegido é autorizado por este plano. Não duplicar recuperação por e-mail: a coorte da cota semanal já contatada deve respeitar os gates; pedido de reativação foi adiado para 24/09.

### Citações — trazer intenção, não só menção

Preservar contrato pendente CITACOES-PROVA-ORIGEM; admin precisa de aceite do Claude antes da publicação integrada. SSR/preview/TRIAL10 locais mantêm seus gates. Não contornar bloqueio de navegador. Trabalhar em resposta pública existente de intenção concreta, prova real, links internos e coerência factual. Não editar `lib/seo/**`, `app/ai-video-generator/for/**`, sitemap ou llms do Claude sem reserva/aceite. Sem IndexNow/recrawl automático.

Benchmark fixo e limitado em início, revisão intermediária e fechamento; mesmo modo/modelo observável. Busca web não é resposta do ChatGPT, teste bloqueado é desconhecido. Não regenerar até obter citação. Distribuição externa própria preserva origem verdadeira; não carimbar visitantes Google/diretórios como ChatGPT. Novas páginas exigem lacuna e distribuição concretas.

### Parcerias e diretórios — distribuição que possa virar compra

Continuar respostas e fichas existentes; não repetir pacotes/contatos. Parcerias distingue comissão, produção UGC, licença e patrocínio. IAltanto, Wyndo e propostas pagas herdadas permanecem HOLD até decisão sobre valor, canal, escopo e evidência. Diretórios valida ficha pública e link rastreável; recibo não é publicação. Uma compra de listing não é uma venda da Kineo.

Filmes de demonstração somente existentes e autorizados, sem render novo e sem alegar que motores pausados/idiomas não validados estão perfeitos. Sem consentimento, não publicar nome, vídeo ou depoimento de cliente. YouTube/publicações sociais exigem autorização de canal e conteúdo; manter fila para o fundador quando faltar.

## Semana adaptativa

- Dia 1: reconciliar atribuição/termos dos afiliados, entregas prontas e primeiros ativos que podem alcançar pessoas sem novo gasto.
- Dias 2–3: avançar aceites e publicações elegíveis; remover uma fricção concreta de compra. Sem nova exposição, mudar estágio, não a mesma headline.
- Dias 4–5: comparar pessoas alcançadas e primeiras compras, corrigir canal/pouso conforme evidência. Escolher um piloto pago somente se fundador autorizar o orçamento concreto.
- Dias 6–7: aprofundar o caminho com evidência mais forte, preservar amostras inconclusivas e fechar pendências, custos e receita. O calendário não obriga lançar experimento sem condições.

## Autorização, execução e publicação

Este mandato organiza uma semana de trabalho; não cria autorização ilimitada. Dentro das pistas já autorizadas: pesquisa pública, análise do código, documentação e melhorias comerciais mínimas reversíveis, com testes/gates. Contato individual, formulário, rascunho ou resposta só segue quando destinatário/canal/conteúdo e autorização vigente estiverem registrados. Renovar janela não renova oferta expirada, recusa, cooldown ou aprovação de gasto. Sem isso, registrar dependência específica e fazer outra entrega executável. Nada de blast, endereços inferidos ou canal alternativo para contornar recusa.

Não mudar preço, crédito, comissão, cupom, promessa ou termos; não comprar mídia/diretório, não criar conta externa, não gastar em teste/render, não migrar/escrever banco, não acessar `.env.local`, não imprimir segredo. Consultas financeiras somente leitura com skill e autorização; sem acesso = desconhecido. Claude mantém render/motores/admin/auth/backend Stripe e Google reservado.

Publicação: reserva de arquivo, apply_patch, testes comportamentais, typecheck e guardiões pertinentes; antes/depois visual e gates vigentes. Fetch/reconciliação; `bash scripts/enfileirar.sh` e batch guardado com dois SHAs revisados, após leitura. Uma publicação por vez. Nunca push direto/force, amend após fila, reset ou edição na árvore alheia. Confirmar SHA/deploy/superfície; commit não é exposição nem venda.

## Placar e handoff

**FATO / referência datada, não marco zero desta semana:** a consulta do Board em 18/09 cobriu 17/09 04:30Z até 18/09 04:30Z: nenhum `payment_success` observado e uma renovação de US$9,90; não é prova de aumento de MRR nem reconciliação financeira global. O novo ciclo precisa de janela própria, sem somar esses números a ela.

MMR consolida fonte financeira canônica: novos compradores externos, primeiras assinaturas, renovações, avulsos, cancelamentos, reembolsos e receita por moeda separados; anual normalizado para MRR, não valor cheio como mensal. Deduplicar pessoa/transação, excluir internos/testes, manter anônimos e atribuição desconhecida separados. Comissões aprovadas, pendentes e pagas são estados distintos. Medir por afiliado e campanha, com vínculo canônico e sem declarar causalidade apenas por correlação.

Cada pista mantém diário próprio e ledger privado, publicando apenas agregados/IDs pseudônimos. Relatar entrega material ao Board: ENTREGUE (estado e prova), RESULTADO (exposição/pagamento, fonte e corte), PRÓXIMA AÇÃO, FILA DO FUNDADOR (valor/canal/escopo/aprovação que falta). Board resolve reserva entre pistas e consolida; não responder ACK em círculo. Não repetir bloqueio inalterado nem pesquisa já concluída.

## Encerramento e limites operacionais

Última passagem antes do término: fechamento por pista e preservação dos artefatos. A partir de 25/09 02:10 BRT não abrir código, contato, teste ou campanha novos; reconciliar estado incerto e pausar agendas desta semana sem apagar histórico. Board verifica as seis agendas e entrega saldo final, incluindo inconclusivos e bloqueados. Sem renovação automática e sem dizer que a meta financeira foi cumprida pelo fim do prazo.

**LIMITE OPERACIONAL:** tarefas locais dependem de computador ligado, aplicativo em execução, acesso e saldo/limites da conta. A programação não garante computação ininterrupta nem receita. Referência oficial consultada em 18/09: https://learn.chatgpt.com/docs/automations?surface=app.

## Execução distribuída — pedido direto do fundador, 23/09/2026

**DECISÃO DO FUNDADOR / ESCOPO:** às 16:05 UTC o Board retomou o pedido de distribuir entre as sessões existentes a execução da conversa sobre diferenciação e aquisição. Codex coordena descoberta, apresentação, conversão e ativação; Claude continua dono de motores/render, auth, admin e backend financeiro. A direção é demonstrar o valor de produzir um vídeo completo com múltiplos motores e uma experiência simples. Integração futura com grandes plataformas é direção estratégica, não integração já existente, promessa comercial ou ordem de abrir outra frente de API/SDK agora.

**META / QUESTÃO PENDENTE:** buscar 20 pessoas externas ativas e pagas no total até domingo27/09, interpretação provisória já informada ao fundador. Baseline vigente ainda desconhecido; primeiras compras da semana não são total ativo. Não prometer dois compradores por dia ou calcular o gap sem a fonte. Esta distribuição não renova os reforços encerrados nem a semana após25/09 05:10UTC, não muda agendas e não amplia autorizações de contato, gasto, dados ou publicação.

| Sessão existente | Entrega e limite desta execução | Evidência de conclusão |
|---|---|---|
| Citações no ChatGPT | Concluir a preparação do candidato Seedance56e0fe61/7b6eb6db: exemplo próprio autorizado, pedido documentado copiável, configuração, custo/limites e caminho existente. Executar somente gates pertinentes ainda não cobertos; delta mínimo sobre ponta atual, sem branch histórica por arrasto. | SHA/base/arquivos e gates; preview humano e aprovação do objeto final antes da fila. LOCAL não é exposição. Reteste80 em24/09 09:05BRT preservado. |
| Melhorias UX e UI | Revisar em leitura o mesmo preview desktop/mobile e devolver comparação visual e até dois impedimentos concretos, se existirem. Não redesenhar home/Studio já publicados nem editar a worktree de Citações. Não contornar bloqueio de navegador. | Imagem/preview inspecionado e achado específico, ou limitação declarada. Revisão técnica não substitui aceite do fundador. |
| MMR | Fonte financeira única: completar o contrato mínimo da extração vigente para o dono autorizado, reutilizando baseline-ativos-oportunidades-20260923.md. Nenhuma consulta proxy repetida. Três oportunidades privadas continuam sem autorização de contato. | Corte/cobertura/critério verificáveis; total confirmado somente com fonte suficiente. Primeira assinatura, renovação, MRR e caixa separados. |
| Programa Afiliados | Dono exclusivo do candidatoP3-017. Continuar a proposta e artefatos autorizados, verificando prontidão nominal, direitos do asset, atribuição e publicação pretendida. Não prometer a exceção como operacional antes da prova do dono. | Aceite, capacidade, autorização de envio e URL/data de divulgação são gates separados. Venda exige transação externa canônica. |
| Parcerias com criadores | Apoiar somente a completude operacional do mesmo candidato: canal/formato, direitos de redistribuição e próximo passo, a partir do histórico já conciliado. Não criar lista/kit/contato concorrente. | Lacuna nova e acionável repassada à pista líder, ou preservação da ficha sem retrabalho. |
| Diretórios e listagens | Reconciliar o material existente de línguas/listagens para apoiar o reteste, sem varredura ou submissão nova. Diretório acessível não equivale a mais citado. Preservar ficha Toolify e UTMs existentes. | No máximo uma pendência concreta de ficha/URL/idioma que altere o trabalho de Citações; sem ranking não demonstrado. |
| Board | Reservar superfícies, revisar os objetos antes da fila, consolidar a fonte única e encaminhar as dependências ao Claude pelo registro abaixo. | Entregue/enfileirado/publicado/exposto/pago distintos, sem ACK circular ou repetição de bloqueio inalterado. |

**COORDENAÇÃO / RESERVA:** Citações continua dono de CitationCostProof e teste correspondente; UX apenas lê e comenta. Afiliados é dono da entidade; Parcerias apenas apoia. MMR é dono dos números; Board publica este adendo documental e o ponteiro BOARD-EXECUCAO-20260923. Máximo duas variantes comerciais existentes; não há autorização para uma terceira. Sem necessidade nova comprovada, não produzir arquivo, bateria ou campanha para preencher a frequência.

**CLAUDE / PEDIDO ÚNICO DE COORDENAÇÃO:** ver BOARD-EXECUCAO-20260923 em PEDIDOS. Ele referencia AF-P3-017-20260922 e MMR-RECUPERACAO-ROTEIRO-SALDO-20260923, sem duplicar suas especificações ou assumir aceite. Acrescenta somente o pedido mínimo da fonte de assinantes vigentes para a meta, com dados pessoais fora do Git. Incidente real de cliente prevalece sobre a fila comercial. Sem nova escrita de banco/migration, render ou pagamento de teste, credencial compartilhada, mudança global de taxa ou oferta.

**MEDIDA / CUSTOS:** pessoas externas com chegada atribuída, primeiro filme concluído, primeira assinatura e receita canônica. Não inferir causalidade pela publicação ou pelo aumento de uma janela pequena. Nenhum gasto novo autorizado por esta divisão; comissões futuras aprovadas não são despesas já pagas. Leitura/execução pelo Claude e novos compradores continuam desconhecidos até prova.

## Sprint de sete horas e nova distribuição — 23/09/2026

**ADENDO / DONO DA PUBLICAÇÃO:** fundador pediu “Pede pro cowork publicar”; handoff único YOUTUBE-TUTORIAL-KINEO-20260923 em PEDIDOS. MP4 concluído localmente, Cowork é o único publicador, Board não opera o canal em paralelo. Aceite dos termos de envio continua pendente conforme handoff; não contornar por delegação. Publicação/URL ainda não comprovadas.

**DECISÃO DIRETA DO FUNDADOR:** publicação do Diretor aprovada; sprint fixa de23/09 17:31:25UTC a24/09 00:31:25UTC (14:31–21:31BRT), sem renovar a semana. Priorizar novas chegadas e primeiras assinaturas, não repetir auditorias, previews ou tratar atendimento antigo como aquisição. As seis sessões existentes foram acionadas; agendas mantêm frequência, histórico, notificações e corte25/09 05:10UTC.

**ENTREGUE / PUBLICADO / DEPLOY VALIDADO:** Diretor visual/localização em a941cfdd58a086b0b9fd4802ffac5b5917dbdb1c, após merge normal do pacote aprovado298bc850 com documentoClaude bf6990e7. Produto limitado ao componente, preservadas lógica de consentimento, chave tardia, Desfazer e montagemStudio; três testes legados ajustados conforme pedido. tsc e24scripts locais PASS. Vercel dpl_GjoHEfKPDRbREg5M5GvYApmSYB5F READY23/09 17:35:38.964UTC, aliaswww.usekineo.com e SHAcorrespondentes; statusVercel success não equivale a Actions executado. UX reporta leitura mobile390px sem overflow, consentimento desmarcado, botão de adaptação desabilitado; não exercitou sugestão paga. Isso não comprova compradores.

**NOVA / CONTRATO DA DISTRIBUIÇÃO:** coorte = criadores externos ainda não adquiridos; obstáculo = falta de distribuição nova. Hipótese = demonstração útil em canal existente gera chegada e experimentação. Mudança reversível = uma publicação orgânica autorizada no YouTube, sem oferta nova; UX prepara MP4 factual com capturas reais EN e Board é o único operador do canal. Fundador confirmou nominalmente o canal. O material mostra preparação antes de Generate, sem geração final/sugestão fabricada, dados pessoais, música de terceiros ou chamada paga. Sucesso = pessoas externas que chegam, geram filme e fazem primeira assinatura canônica; visualização/documento não é receita. Amostra = janela fixa e maturação posterior declarada, sem reinício. Riscos = promessa excessiva, sobreposição de canal e atribuição falsa; parada em falta de direito/autoridade/acesso ou corte. Link e prova de publicação ficam no diário privado; fonteYouTube, nuncaChatGPT.

**PARCIAL / APOIO CITAÇÕES:** nova demanda pública script→faceless localizada pela pista, mas regras do destino exigem permissão escrita prévia da moderação. Sem rascunho/resposta/DM autorizados; decisão mínima registrada uma vez, sem nova varredura por cadência. Diretórios verificou somente regras do destino. Seedance3fb96b1a e seu gate humano permanecem preservados, reteste24/09 09:05BRT intacto. Afiliados segue dono exclusivoP3-017; Parcerias apoia, sem contato concorrente.

**EVIDÊNCIA / BASELINE ANTERIOR À SPRINT:** fonte privadaMMR sprint7h-baseline-20260923-173125.md, corte23/09 17:31:25UTC, intervalo[03UTC,17:31:25):13novos externos,11Studio,7primeiros filmes,1checkoutnovo e0pagamento observado nas famílias consultadas. ChatGPT registrado em7 (3referrerreal e4somenteUTM),7Studio,4filmes,0checkout. Esses números não são ganho da sprint. Total ativo/MRRglobal/custos continuam desconhecidos. Fechamento único após24/09 00:31:25UTC, sem SQL intermediária por cadência; não recontar21/09 nem atribuir conversão ao deploy por correlação.
