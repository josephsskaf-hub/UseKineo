# 10 tarefas de vendas e MRR — 28/09/2026

Pedido do fundador (27/09 ~23h BRT): "as próximas 10 tasks voltadas a vendas e aumento de MRR, simples, as de maior probabilidade". Montado por 6 análises com dados do banco e do código (pagantes, checkout, ativação, canais, MRR/churn, alavancas paradas), síntese com 17 candidatas e 2 céticos adversariais (evidência/história e execução/velocidade de dinheiro). Workflow wf_8eb884ae-60d. Preço e oferta congelados até 09/10: o que depende de preço está na seção da mesa.

**Status em 28/09:** tarefas 1, 2 e 3 FEITAS. (1) Cowork: Stripe de 4 tentativas em 3 semanas → 8 em 2 meses (docs/COWORK-STRIPE-RETENTATIVAS-2026-09-28.md). (2) Fundador pôs saldo pré-pago na OpenAI; conferido no banco: roteiro e filme saindo às 01:23-01:27Z, 0 erros de capacidade em 6 h. (3) Fundador: "mantém o botão" — registrado em docs/DECISIONS.md. As perguntas do Cowork sobre o webhook em atraso longo estão em verificação (workflow wf_8934f8db-ece). Próximas datas: 30/09 (tarefas 4 e 5), 01/10-21/10 (tarefa 6), 04/10 (7 e 8), 07/10 (9), 12/10 (10).

**Cobrança em atraso (28/09 ~06h30 UTC, deploy 5c3114c8 READY):** a verificação do webhook (wf_8934f8db-ece) confirmou que o atraso não dá crédito grátis nem crédito em dobro no fluxo normal, e achou 3 defeitos, consertados com revisor adversarial e suíte inteira sem regressão: (1) cliente em atraso que clicava em assinar era rebaixado a free — checkout agora usa a regra única stripeSubscriptionKeepsAccess; (2) fim de assinatura não deixava rastro — evento subscription_ended {reason, tier, credits_left}; (3) com a janela de 2 meses, pagar a fatura antiga depois de a nova falhar era ignorado — agora credita uma vez (chave renewal_granted:<invoice.id> em stripe_events) e o que ainda for ignorado grava renewal_ignored_non_access. Sondas: webhook GET 405, POST sem assinatura 400, checkout anônimo 307 para /signup, controle 404; Vercel sem erro de runtime. Prova real: tentativa de cobrança da salswina em 01/10 00:57 UTC.

## Números-base

- Pagantes por canal (cadastros de 28/08 a 28/09 02h UTC, pessoas distintas): ChatGPT 353 cadastros → 5 assinantes; TAAFT 144 → 0; direto/sem origem 110 → 0; outros 113 → 1.
- Checkout por país (mesma janela, pessoas): país rico 21 abriram checkout → 6 pagaram (29%); emergentes 50 → 0; sem país 10 → 0.
- Checkout sem filme: 5 dos 6 assinantes novos desde 28/08 pagaram com 0 filmes, de 1 a 32 min depois do cadastro (o 6º, o god, pagou 24h depois do 1º filme). Nos últimos 7 dias, as 4 pessoas que clicaram em comprar antes do filme e não pagaram são de KE, UA, IN e NG.
- 6 dias sem assinante novo (o último foi em 21/09 16:50 UTC). Entre cadastros de país rico, quem abriu checkout até 30 min depois caiu de 5 em 49 (16/09 a 21/09) para 1 em 39 (21/09 a 28/09). A amostra é pequena; confirmar em 30/09.
- Renovação: 3 das 6 primeiras renovações foram recusadas por falta de saldo, e 0 de 2 foram recuperadas na regra atual da Stripe. As 10 assinaturas (MRR ~US$154) cobram entre 30/09 e 21/10.
- Uso de quem paga: 0 filmes dos 10 assinantes desde 24/09 (16 em 15 dias). Retenção na 1ª renovação: 3 de 7 (43%).

## As 10 tarefas (ordem de execução)

### 1. Dar 2 meses à Stripe para cobrar

- **O que:** No painel da Stripe (Settings → Billing → Revenue recovery → Retries), trocar '4 tentativas em 3 semanas' por '8 tentativas em até 2 meses'. Manter o cancelamento só depois da última tentativa. Abrir a fatura em aberto do sal (Studio US$29) e ver se ela já segue a regra nova. Se não seguir, anotar 14/10 como a data em que ele cai.
- **Por quê:** 3 das 6 primeiras renovações foram recusadas, todas por falta de saldo em cartão válido. Na regra atual recuperamos 0 de 2 (val e aka viraram free). O sal está em atraso desde 23/09. As 10 assinaturas (MRR ~US$154) cobram entre 30/09 e 21/10.
- **Impacto:** Até US$57 de MRR em jogo (o sal mais ~2 recusas esperadas em outubro). Chance de ~20% por caso, então o esperado é ~US$10/mês. Custo zero: quem está em atraso segue com o plano e não ganha crédito novo.
- **Esforço:** 0,1 h (6 minutos) · **Quem:** Fundador (painel da Stripe)
- **Medir:** No painel da Stripe, não no banco: status da assinatura e da fatura do sal em 01/10 e em 14/10. Em 21/10, contar quantas faturas recusadas em outubro acabaram pagas.

### 2. Saldo da OpenAI para 30 dias

- **O que:** Pôr na OpenAI saldo pré-pago para ~30 dias. Olhar o gasto por dia em Usage; em agosto ficou entre US$2 e 6 por dia. Não confiar na recarga automática antes de descobrir por que ela falhou em agosto. Se for religar, colocar um teto mensal. Conferir se o e-mail de alarme de cota chega ao celular.
- **Por quê:** No apagão de 26/09 16:22Z a 27/09 ~08:35Z, 89 erros de 'full capacity' atingiram 8 cadastros novos, 3 deles de renda alta (LT, CA, PL), e nenhum fez filme. As vendas acontecem até 30 min depois do cadastro. A recarga automática foi reprovada no teste real de agosto. Em 27/09 entrou só um crédito pequeno.
- **Impacto:** Protege a janela de venda e as 10 renovações de 30/09 a 21/10. ~US$10 esperado por mês (cada apagão de ~15h custa ~0,2 venda, mais o risco de cancelamento de assinante que encontra o produto parado).
- **Esforço:** 0,25 h · **Quem:** Fundador (billing da OpenAI)
- **Medir:** Zero erros de cota ou 'full capacity' da OpenAI por dia até 27/10.

### 3. Não esconder o botão de compra pré-filme

- **O que:** Decidir NÃO aplicar a proposta de 27/09 de esconder o botão de checkout do banner do trial até o 1º filme. Claude registra a decisão em 1 linha no DECISIONS.
- **Por quê:** Os 5 assinantes novos desde 28/08 pagaram com 0 filmes, de 1 a 32 min depois do cadastro, todos de país rico (ES, US, BE, NL, ES). O axe pagou o Creator pelo botão desse banner 2 min depois de chegar. Os 4 que clicaram antes do filme e não pagaram (7 dias) são de KE, UA, IN e NG. Esconder o botão fecharia a porta de quem paga.
- **Impacto:** Preserva ~1 venda por mês por essa porta (US$10 a 20 de MRR). É defesa, não receita nova.
- **Esforço:** 5 min do fundador + 10 min do Claude · **Quem:** Fundador decide; Claude registra
- **Medir:** Vendas por pessoa de quem clicou antes do 1º filme, separadas por país rico e emergente (entra na leitura da tarefa 4).

### 4. Ler em 30/09 e 04/10 o teste de 27/09

- **O que:** Claude estende a consulta que já existe da sprint de 27/09 (não cria outra) e roda em 30/09 e em 04/10. Separar por país (rico, emergente, sem país) e por porta (pricing, banner do trial, modal, parede de crédito). Na parede, separar o caso de falta de crédito do caso de plano. Contar Starter contra Creator, checkout aberto até 30 min depois do cadastro e vendas por pessoa. Não mexer em nada antes da leitura.
- **Por quê:** Não entra assinante novo desde 21/09 16:50 UTC (6 dias). Entre cadastros de país rico, quem abriu checkout até 30 min depois caiu de 5 de 49 (16/09 a 21/09) para 1 de 39 (21/09 a 28/09). A amostra é pequena, mas é o sinal a confirmar. As mudanças de 27/09 (Starter primeiro, parede, saída pelo Kineo 1) mexem exatamente nessa janela.
- **Impacto:** Não vende sozinha. Decide em 7 dias, e não em 30, o que fica do que subiu em 27/09, e libera as tarefas 7 e 8. Regra já combinada: só inverter a parede no caso de plano se ela der menos de 1 checkout a cada 10 exibições e a saída pelo Kineo 1 gerar filme sem checkout.
- **Esforço:** 0,75 h · **Quem:** Claude
- **Medir:** A própria leitura, entregue ao fundador em 30/09 e em 04/10 com uma frase de veredito por porta.

### 5. Ler as cartas de 27/09; depois, a val

- **O que:** Até 30/09, ver o que as 10 cartas pessoais de 27/09 renderam (axe, sal e as 8 vítimas do apagão): respostas, cliques e vendas. Se alguma mexer, Claude deixa 1 rascunho só para a val: 'seu cartão recusou US$24,90; o Starter é US$9,90 por 60 créditos'. Preço tirado do código, link limpo (sem google.com/url), sem cupom. Antes, conferir que ela não pediu para sair da lista.
- **Por quê:** Regra da casa: carta nova só depois de a velha mexer. A val pagou Creator, caiu por falta de saldo (4 recusas de 04/09 a 19/09) e continuou usando depois: 9 filmes, última sessão em 21/09, 67 créditos parados.
- **Impacto:** +US$9,90 de MRR se ela voltar. Chance de ~20%.
- **Esforço:** 0,5 h · **Quem:** Claude (leitura e rascunho) + fundador (revisa e envia)
- **Medir:** Respostas, cliques e vendas das 10 cartas até 30/09. Venda da val até 27/10.

### 6. 'Parte 2' para o assinante que renovou

- **O que:** Depois que cada assinante RENOVAR (antes, nada), Claude deixa 1 rascunho pessoal sugerindo a 'Parte 2' do filme que a própria pessoa fez, sem crédito nem desconto. Para quem veio do ChatGPT, 1 linha a mais: 'o que você perguntou ao ChatGPT antes de nos achar?'. Fora axe e sal, que já receberam carta em 27/09. Filme pronto só se o fundador disser 'vai'. Sem código e sem disparo automático.
- **Por quê:** Nenhum dos 10 assinantes fez filme desde 24/09; foram 16 filmes em 15 dias. A retenção na 1ª renovação foi de 3 em 7 (43%). A carta para assinante parado nunca foi enviada. Lembrar o assinante parado ANTES da cobrança pode apressar o cancelamento; por isso a carta vai depois.
- **Impacto:** Salvar 1 de 6 na renovação seguinte mantém US$10 a 20 de MRR. A resposta sobre o ChatGPT mostra para onde vão as horas das páginas de motor.
- **Esforço:** 0,3 h por pessoa (~2 h no total, espalhadas de 01/10 a 21/10) · **Quem:** Claude (rascunhos) + fundador (envia e dá o 'vai' para render)
- **Medir:** Por pessoa: carta enviada → filme novo em até 7 dias → renovação seguinte paga. E quantos respondem à pergunta do ChatGPT (meta: 2 ou mais).

### 7. 04/10: Starter como destaque na home

- **O que:** Se a leitura de 04/10 mostrar que o Starter fecha pelo menos 10% dos cliques em país rico, sem cair a receita por clique, trocar só o card da home: o selo 'Most popular' e o botão principal passam para o Starter, e o Creator vira link secundário. Preço não muda. Se o teste não confirmar, não mexer.
- **Por quê:** Pelo 1º plano tentado (28/08 a 28/09): Starter 3 de 23 contra Creator 1 de 42. Cerca de 11 pessoas por mês entram pelo 'Most popular' do Creator na home, e 0 pagaram. 6 dos 10 assinantes são Starter.
- **Impacto:** +US$5 a 15 de MRR líquido por mês (mais Starters, menos algum Creator).
- **Esforço:** 0,5 h · **Quem:** Claude no código; fundador aprova o selo
- **Medir:** Em 11/10 e 18/10, só país rico: cliques e checkouts por plano na home × vendas por pessoa. Se o Starter fechar menos de 10% em 7 dias, voltar.

### 8. Link do Starter no cartão do ChatGPT

- **O que:** Depois de 04/10, se o banner com Starter vender em país rico, pôr um link discreto de Starter no cartão de boas-vindas de quem vem do ChatGPT. Ele fica abaixo do botão de começar o filme, sem competir com ele. Preço lido do código, com marca de campanha própria para medir. Teste isolado, sem outras mudanças ao mesmo tempo.
- **Por quê:** O ChatGPT é o canal que paga: de 28/08 a 28/09, 353 cadastros deram 5 assinantes; o TAAFT, 144 cadastros e 0. O cartão do ChatGPT chega a ~77 pessoas por semana e hoje não tem nenhum link de plano. Os pagantes compram na 1ª sessão.
- **Impacto:** US$0 a 20 de MRR em 30 dias; valor central ~US$10. Chance de ~30%.
- **Esforço:** 1 h · **Quem:** Claude no código; fundador clica SUBIR-SITE
- **Medir:** Cartão visto → clique no link → venda, por pessoa. Regra de corte em 7 dias: menos de 3 cliques, ou queda nos filmes iniciados pelo cartão = tirar.

### 9. Preparar a página da mesa de 09/10

- **O que:** Claude monta 1 página com os números que a mesa precisa para decidir preço: o resultado do Starter primeiro (04/10), WELCOME20, países emergentes, Studio, anual e Google Ads como opção de gasto (lista abaixo). Entregar até 07/10. Nada de preço muda antes da mesa.
- **Por quê:** O vazamento do checkout é preço (conclusão fechada). A mesa de 09/10 é o único momento em que preço pode mudar, então é a maior alavanca de MRR. Hoje, de 50 pessoas de país emergente que abriram checkout em 30 dias, 0 pagaram; de 21 de país rico, 6 pagaram.
- **Impacto:** Não vende sozinha. Garante que a maior decisão de receita do mês seja tomada com os números à vista.
- **Esforço:** 1,5 h · **Quem:** Claude prepara; fundador decide na mesa
- **Medir:** Página pronta até 07/10. Depois de 09/10: vendas por plano e por país.

### 10. 12/10: medir o que subiu em 27/09

- **O que:** Registrar no DECISIONS: nenhuma página nova de /for, /vs ou /ads/for até 12/10. Em 12/10, medir Studio Ads, as 8 páginas /ads/for e as 3 /vs novas com a mesma conta (visitas → cadastros → vendas). Cortar as que derem zero e repetir o molde na que vender.
- **Por quê:** Em 27/09 subiram 11 páginas novas que ninguém mediu. O histórico é fraco: /for teve 2 visitas reais; /vs, 64 IPs e 0 cadastros; Reddit Ads, US$50 e 0 pagantes; Studio Ads, 0 clientes externos pagantes.
- **Impacto:** Venda direta ~zero. Tira horas do que não paga e põe no que vende (1ª sessão, ChatGPT, renovações).
- **Esforço:** 1 h · **Quem:** Claude
- **Medir:** Tabela de 12/10 por peça: visitas, cadastros, vendas. Decisão escrita de cortar ou manter cada uma.

## Para a mesa de 09/10 (depende de preço/oferta)

- WELCOME20: 1.228 pessoas viram, 37 clicaram, 1 pagou (01/09 a 27/09). O cupom só vale para Creator e Studio, mas 3 dos 4 compradores novos escolheram o Starter. Decidir: incluir o Starter ou aposentar o cupom.
- Países emergentes: 0 de 50 pessoas que abriram checkout pagaram (28/08 a 28/09); o preço regional de agosto morreu sem ninguém ver. Decidir entre um Starter regional visível (exige rever a regra 'USD em toda a jornada' de 01/09) e parar de gastar pressão de checkout com eles.
- Studio: os 2 Studio (US$58, ~38% do MRR) vieram do antigo trial de 25 créditos em motor pago (n=2). No regime de 10 créditos: 4 pagantes, 0 Studio. É só um dado, sem oferta ao god.
- god: gastou 290 créditos em 25 dias contra 180 de cota e comprou os 2 únicos top-ups da história (US$18,80). Deve esgotar de novo por volta de 14/10. Dado para o crédito universal e para a escada nova.
- Anual 11×: 0 vendas de plano anual na história, e a troca de plano hoje recusa o anual. Avaliar oferecer só na 2ª renovação paga.
- Google Ads como opção de gasto: US$30 a 50 em 7 dias, só com nome de motor (seedance, veo 3.1) e só país rico, com destino na página do motor. Regra de corte: 0 venda em 7 dias → desliga. Lembrete: Reddit US$50 → 1.018 sessões → 2 cadastros → 0 pagantes.
- Descida de plano para quem teve o cartão recusado ('continuar no Starter'): desenhar junto com a escada nova, com canário, e não antes.

## Derrubadas pelos céticos (e por quê)

- Recarga automática da OpenAI (versão original): falhou no teste real de agosto. Trocada por saldo de 30 dias (tarefa 2).
- Consertar o checkout que rebaixa quem está em atraso: o defeito é real, mas nenhum dos 3 casos de atraso da história abriu checkout. Fica como higiene de 20 min na próxima mexida da Stripe.
- Reabrir o caminho do Studio agora: o fundador manteve o plano legado em 27/09, e dar trial maior contraria 'crédito não é isca'. Vai como 1 linha para a mesa.
- Cartão fixo de Starter no /studio para país rico: repete o banner que já abre com o Starter desde 27/09 e contamina o teste. Sobrou só o link do ChatGPT, depois de 04/10 (tarefa 8).
- Inverter a parede do Seedance: o Starter já está em cima no caso de falta de crédito, e o teste tem menos de 24h. A leitura entra na tarefa 4.
- Cron da carta de renovação recusada: seria um 3º canal (a Stripe e a faixa amarela já avisam) para ~2 casos por mês; e-mail automático foi derrubado em 27/09.
- Starter primeiro nas 8 portas restantes agora: contamina a leitura de 04/10. Sobrou só a home, e condicional (tarefa 7).
- 5 cartas separadas perguntando sobre o ChatGPT: é pesquisa, com 0 venda direta. Virou 1 linha na carta da tarefa 6.
- Cortar canais e apontar o TAAFT para a página do Seedance: é lista do que parar, não venda; o tráfego do TAAFT não traz a intenção que o do ChatGPT traz. Trocar a URL fica como higiene opcional de 10 min.
- Molde do Seedance nas páginas de Kling e Veo: depende de o ChatGPT citar, e o Kling está em 0 sessões há 43 dias. Rever depois de 12/10.
- Google Ads agora: é dinheiro saindo, com retorno esperado negativo em 30 dias (o Reddit deu 0). Foi para a mesa.
- Troca de plano para quem está em atraso e upgrade na parede: 6h mexendo na cobrança para ~1 pessoa por mês; 0 trocas de plano em 18 dias.
- Ofertas fora da escada (WELCOME20, preço regional, anual) agora: cupom e preço estão congelados até 09/10. Foram para a mesa.
