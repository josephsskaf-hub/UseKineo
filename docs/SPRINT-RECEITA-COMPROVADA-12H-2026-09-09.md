# KINEO — RECEITA COMPROVADA · Sprint de12h

## Mandato do fundador e modo de execução

Solicitado em09/09/2026: montar uma nova sprint de12h, sem repetir trabalho, dedicada a novos clientes pagantes e aumento de receita; criar uma skill reutilizável. Janela: 09/09 às12h30 até10/09 às00h30 BRT (15h30–03h30 UTC). Não renovar a janela anterior; ela terminou12h11.

**Resultado desejado, ainda não alcançado:** pessoas externas encontram uma demonstração honesta, chegam ao checkout correto e pagam a oferta escolhida; cada venda tem origem identificada quando os dados permitem. O sucesso é financeiro, não volume de produção de código. Não prometer quantidade de assinaturas sem baseline e canal comprovados.

**Hipótese central:** remover falhas do caminho de compra e alcançar intenção explícita em superfícies já existentes deve ser mais útil nesta janela que acrescentar novas páginas ou campanhas indiscriminadas. É hipótese a testar, não causalidade já estabelecida.

## Ponto de partida — fatos e limites

- FATO CONFIRMADO: main observada6d977d80 inclui040af511, correção do Claude da taxa de entrada para line_items. Deploy READY já confirmado. NÃO refazer checkout/Stripe. Guardião11/0 e typecheck executados no SHA do conserto.
- EVIDÊNCIA DE BROWSER09/09~12h08: botão de trial abriu Stripe na conta do fundador, mas mostrouUS29 hoje. Código has_paid explica o desvio de elegibilidade; não foi feito pagamento. Falta validar tela deUS1 para conta elegível, sem manipular perfil.
- FATO CONFIRMADO: fontes atuais checkoutPricing/entryPolicy indicam14/29/59 mensais; taxaUS1, sete dias,80cr, depois29/mês. Snapshot datado, não números a copiar manualmente para JSX. Comissão30% recorrente; avulso separado de assinatura. Preço não será alterado.
- LOCAL: página de compra interrompida já implementada na branch codex/vendas-v7-12h-20260909, com141 testes específicos; aguardava visual e Hindi30/40. Não reconstruir nem publicar sem gates.
- PREPARAÇÃO EXISTENTE: seleção de exemplos, avaliaçãoMicrolaunch, kit afiliado e kitPH. Não chamá-los de novidade, distribuição ou conversão.
- RELATO CLAUDE09/09~09h05:31 eventos de falha em cinco pessoas antes do hotfix. Não é baseline atual nem31clientes; remedir por pessoa após deploy.
- Não há placar financeiro independente desta nova janela ainda. Sem alegar zero vendas da empresa ou sucesso atribuível.

## SCRIPT OPERACIONAL — usar integralmente com a skill

Você é responsável pela pista comercial da Kineo. Seu trabalho termina em pessoas pagando e receita verificada, não em relatórios bonitos. Pense a partir do que o comprador precisa conseguir fazer, trabalhe de trás para frente e use evidência para decidir onde mexer.

### 1. Marco zero e contrato — primeira rotação

Leia a skill `C:/Users/josep/.codex/skills/kineo-receita-comprovada/SKILL.md`, conversa recente, AGENTS da origin/main, Growth, PEDIDOS e fechamentos de Claude/Codex. RepositórioC:/kineo; worktree própria indicada no diário. Identifique o que já chegou ao usuário e o que ficou local. Não releia o repositório inteiro em cada checkpoint: leia mudanças relevantes depois da orientação inicial.

No primeiro bloco, estabeleça fonte, identidade externa, janela e início exato. Use lib/admin/versaoBFunnel.ts e régua financeira canônica; não crie outro admin. Compare coorte pós-hotfix com período equivalente, distinguindo fonte, dispositivo e elegibilidade somente onde esses campos existem. Não explique abandono por preço antes de descartar falha de abertura. Não explique toda seca histórica pelo defeito novo.

Valide a portaUS1 com conta autorizada elegível ou evidência real disponível. Conta do fundador com has_paid não é controle elegível. Não pagar, criar conta, alterar perfil ou conceder crédito. A evidência de sessão aberta não prova webhook/créditos/renovação. Peça a dependência concreta uma vez e avance em trabalho independente.

### 2. Quatro missões, com sequência adaptada ao dado

**M1 — Recuperar intenção perdida por erro nosso.** Reconciliar a coorte que tentou pagar antes do hotfix: quem continua sem pagamento, quem já recebeu contato e quem retornou depois da correção. Prioridade por tentativa recente e uso real, não número bruto de erros. Contato pertence ao responsável autorizado, após confirmar consentimento, supressão e entregas reais dos crons. Não escrever/enviar carta automaticamente nem repetir D+1 do Claude. Entrega comercial é comprador que retoma e paga, não lista de pessoas. Se houver impedimento do nosso lado em superfície autorizada, concluir a melhoria existente em vez de reconstruir. Sem acesso/anuência, pedido explícito e outra missão viável.

**M2 — Converter intenção nova vinda do ChatGPT.** Analisar o caminho atual conversa/referrer/handoff → /go ou /chatgpt → cadastro → porta → checkout → pagamento. Escolher UM descompasso novo, reproduzível e não corrigido entre expectativa e pouso. Trabalhar na superfície existente, preservando ideia, idioma, atribuição e termos. Não criar outra landing, painel ou gerador de prompts que já existe. Experimentos candidatos, sujeitos à anti-duplicação: esclarecer antes do cadastro o resultado específico que será entregue; tornar explícito um benefício já comprovado com trecho autorizado e rótulo de duração; corrigir link/CTA que perde o contexto. Um candidato duplicado é descartado, não renomeado.

**M3 — Capturar procura externa que já existe.** Procurar uma demanda pública recente e específica: criador querendo narrar histórias, substituir edição manual ou produzir um Short para seu canal. Escolher até três oportunidades verificadas, não uma lista genérica de diretórios. Estudar regras do canal e o produto que resolveria aquela tarefa. Usar assets e prova existentes com autorização para aquele destino. Publicação/resposta só depois de autorização específica de canal e conteúdo; conteúdo já aprovado em um lugar não vale para todos. Não scraping de contatos, mensagem em massa, spam, afirmação inventada ou campanha paga nova. Sem permissão de saída, não declarar aquisição; oferecer ao fundador uma decisão pronta e trabalhar na conversão existente. PH, Reddit Ads, TAAFT/Dodo já estão com Claude/Cowork: medir/entregar insumo solicitado, não lançar cópia.

**M4 — Multiplicar uma venda ou demonstração real.** Preferir um criador/parceiro já disposto a demonstrar o produto a uma lista de novos afiliados. Descobrir o impedimento concreto: link incorreto, comissão contraditória, demonstração inadequada ou destino que perde atribuição. Usar o programa atual, não criar outro. Comissão deriva da fonte e deve ser considerada no custo. Corrigir material somente com autorização e respeito ao dono; não enviar o kit antigo40%. Demonstrar com narrativa/asset verificado, nunca gerar vídeo pago automaticamente. Entrega é exposição real via parceiro e pagamento rastreável; material pronto é preparação. Se não houver parceiro disposto, não fabricar atividade — priorizarM2/M3 com ação disponível.

### 3. Cadência e limite de trabalho em andamento

Janela de12h,12rotações de até uma hora com checkpoints a cada30min. O segundo checkpoint continua a mesma hipótese. Não significa24entregas nem execução garantida a cada minuto; latência, limites e PC desligado podem interromper. Registrar início/fim efetivos.

Alocação inicial: R1 marco zero/validação; R2–R3M1; R4–R6M2; R7–R9M3; R10–R11M4; R12 fechamento. É prioridade de trabalho, não obrigação de esperar o relógio nem preencher horário. Pessoa real prestes a pagar e incidente novo precedem o calendário. Máximo duas variantes em amostragem; no máximo uma entrega de código em publicação por vez. Não abrir12frontes.

Antes de cada ação, escrever em poucas linhas: pessoa/coorte, evidência, hipótese causal, diferença do que já existe, mudança reversível, dono, canal, evento, métrica, gate de amostra e parada. Selecionar só ação com acesso e autorização disponíveis. Gastar no máximo15min na tentativa inicial de resolver dependência operacional; comunicar uma vez e retirar da execução até algo mudar. Isso não autoriza contorno de segurança. Se não restar ação viável, informar honestamente o bloqueio geral em vez de inventar uma nova página.

Meta operacional: fazer pelo menos uma melhoria autorizada alcançar uma superfície real na primeira metade da janela, e pelo menos uma distribuição autorizada se houver permissão de canal/conteúdo. Meta, não garantia; se faltarem gates, registrar o motivo sem chamar preparação de entrega. Não há cota de commits.

### 4. Placar que manda

Por coorte externa e janela fixa: visitantes identificáveis → cadastros → intenção de compra → checkout aberto → entradaUS1 paga → primeira mensalidade/anuidade → avulso → estorno. Desconhecidos permanecem desconhecidos. Usuário anônimo não deduplicável não vira pessoa identificada.

Novos compradores = pessoas sem pagamento anterior com primeiro pagamento confirmado na janela. TrialUS1 é comprador de entrada, não assinante mensal consolidado. Renovação no dia8 não cabe nesta janela. Eventos: reutilizar payment_success/card_trial, subscription_invoice_paid/trial_conversion e funções canônicas; conferir contratos e dedupe antes de somar. Não contar duas vezes invoice e payment_success da mesma cobrança.

Apresentar caixa bruto, devoluções e líquido de estornos; contribuição só se taxas, comissões, mídia e custo direto estiverem disponíveis e reconciliados. Receita anual antecipada não é MRR inteiro. Não escalar por clique, checkout ou trial barato sem considerar custo de aquisição e custo do benefício. Sem custos, margem = desconhecida.

Um exemplo de gate exploratório, a definir antes da variante:20pessoas externas elegíveis expostas e cinco que avancem ao degrau seguinte; isto não é significância estatística nem prova de aumento. Sem essa amostra, preservar variante e atuar em outra etapa. Para causa técnica, uma reprodução consistente basta para parar; não esperar20pessoas sofrerem. Se retornar erro de sessão, desvio silencioso de oferta, perda de ideia ou exposição privada, interromper aquela ação e pedir ao dono.

### 5. Fronteiras, execução e comunicação

Nossa pista: páginas públicas ChatGPT/intent e recuperação comercial previamente autorizizada, docs e testes; confirmar mapa vigente a cada troca de superfície. Claude: checkout/webhook, PricingClient/PricingCards, auth, admin, render/GenerateClient/compose, qualidade, campanhas já dele. Havendo dúvida, PEDIDO antes de código e concordância. Não mudar preços, oferta, comissão, créditos ou termos; não fazer migração/escrita em banco; não ler .env.local; não gastar; não enviar e-mail/mensagem/rascunho individual ou publicar fora do site sem autorização específica. A aprovação desta estratégia não concede essas permissões.

Código somente com escopo e publicação autorizados: worktree codex própria de origin/main; preservar alterações alheias; implementação mínima; testes de comportamento; tsc; guardiões relevantes; comparação visual e aprovação exigida; inspecionar scripts/enfileirar.sh antes de usar; nada de push direto/force ou BAT alternativo. Nenhum ganho de negócio justifica remover validações. Se a publicação depender de clique, entregar um pacote correto e pedido concreto, não tentar atalhos.

Antes de encerrar entrega material, registrar SHA, testes, limite visual, fila, deploy e ação observável. Informação local não é aviso recebido no Git pelo Claude. Publicar documentação por via autorizada ou dar o link local ao fundador com esse limite explícito. Nunca expor PII, segredos ou links de sessões financeiras em repositório público.

### 6. Fechamento sem maquiagem

No último checkpoint: remover somente este agendamento, preservar worktrees, fechar o diário e parar. Não renovar automaticamente. Entregar: alcance real; novos compradores e dinheiro por tipo; o que foi publicado e validado; o que foi apenas preparado; resultado inconclusivo; custo conhecido; pendências com dono; próxima decisão. Dizer claramente quando o número não foi medido ou quando não houve entrega comercial. Nenhuma compra interna conta como sucesso.

Pergunta obrigatória de encerramento: **qual pessoa passou a conseguir comprar ou descobrir a Kineo por causa de uma ação nossa — e qual evidência confirma isso?**

## Como reutilizar

Skill pessoal: `$kineo-receita-comprovada`. Ela não altera termos nem substitui aprovação; permite repetir o método com outra janela e prioridades atuais. Plano e diário locais nesta worktree até publicação autorizada. Claude não deve ser informado de que já recebeu o documento no remoto.
