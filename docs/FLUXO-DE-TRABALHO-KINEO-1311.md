# Fluxo de trabalho da Kineo: Claude + GPT (proposta de 13/11/2026)

**Pedido do dono (13/11, antes de dormir):** "não esquece de fazer o melhor fluxo de trabalho da nossa empresa aqui no Claude e no GPT, quero o melhor modelo pra poder crescer a empresa que seja mais rápido."

**Estado:** APROVADO. O dono escolheu a opção A em 13/11 07:36 ("Vou no A"). O que já está ligado está marcado como **LIGADO**; o resto da seção 4 espera só as ações dele.
Foto de decisão (local): `C:/kineo/docs/decisoes-1311/fluxo-de-trabalho-ABC.jpg`.

## 1. Onde o tempo se perde hoje (medido na madrugada de 13/11)

| # | Gargalo | Número | Quanto custa |
|---|---|---|---|
| 1 | **O dono é o correio entre Claude e GPT.** O Codex só lê a missão quando ele abre a sessão e manda ler. | 3 vezes nesta madrugada ele precisou avisar "sessão do GPT acabou" ou colar um texto | Horas de espera a cada passagem; o GPT fica parado enquanto ele dorme |
| 2 | **O dono é quem testa no celular.** | Pelo menos 7 defeitos achados por ele no celular ou na tela (foto cortada, vídeo que não aparecia, vídeo preto, cartões cortados, botão que faltava). Nenhum pego antes por nós | Cada defeito = uma volta inteira de conserto e publicação com ele acordado |
| 3 | **Teste vermelho virou ruído.** | 126 dos 278 testes de tela já falham na produção (45%). A entrega do GPT veio com 9 falhas novas escondidas nesse ruído | ~40 min da CEO por entrega para separar o que é novo |
| 4 | **Toda sessão lê papel velho.** | Quadro com 501 linhas (222 KB); CLAUDE.md com 47 KB, quase tudo de agosto e setembro; 117 cópias de trabalho no disco, 87% cheio | Cada sessão gasta limite só para começar. Limite semanal em 57% faltando 3 dias |
| 5 | **Decisão chega picada.** | Ele trabalhou 16 a 17 horas respondendo uma decisão por vez | A empresa anda no ritmo do celular dele |
| 6 | **O esforço não segue o dinheiro.** | ChatGPT em 30 dias (medido 11/11): 449 cadastros → 258 fizeram filme → 82 baixaram → 47 abriram o pagamento → 3 pagaram. Só 6 de 73 filmes com nota ≥ 8 | Tela nova não muda a conta se o filme do teste grátis sai fraco |

## 2. O modelo proposto (opção A, recomendada): linha de montagem que anda sem o dono

### 2.1 Quem faz o quê

| Quem | Faz | Não faz |
|---|---|---|
| **Dono** | Direção, gosto, dinheiro. Decide em **2 janelas por dia** (ao acordar e antes de dormir), por foto, com A, B e C | Não é correio entre agentes. Não testa no celular. Não precisa avisar que uma sessão acabou |
| **CEO Claude (Fable)** | Plano do dia ligado ao número da semana; revisa e publica; mede; fala com o dono | Tarefa mecânica (vai para as divisões) |
| **GPT / Codex** | Telas, desenho, propostas visuais, citações. **Puxa os pedidos do quadro sozinho** | Não publica tela sem a revisão |
| **Divisões Claude (Opus)** | 2 motores e qualidade do filme · 3 anúncio pago · 4 receita e clientes · 5 plataforma e testes · 6 nota automática · **1 teste de tela no celular, logado** | Não editam área do outro |

### 2.2 As cinco mudanças

1. **O GPT puxa o trabalho sozinho.** O Codex já tem tarefas automáticas (há 10 antigas em `~/.codex/automations`). Criar uma: a cada 30 minutos, `git fetch`, ler "Pedidos ao GPT" no quadro e a missão mais nova em `docs/MISSAO-GPT-*.md`; se houver linha nova, começar. O outro sentido já existe: a tarefa `kineo-puxa-entregas-gpt-2` avisa a CEO de cada commit do Codex (**LIGADO** desde 13/11). Resultado: o ciclo pedido → obra → revisão → no ar fecha sem o dono no meio.
2. **"Pronto" tem uma definição só, para os dois braços.** Uma entrega só é entregue com: (a) tipos limpos; (b) `bash scripts/ci/novos-vermelhos.sh '<área>'` sem vermelho novo (**LIGADO**: a ferramenta está no repositório desde 13/11); (c) foto a 1920 px e a 390 px; (d) tela logada conferida logada; (e) depois do deploy, conferida no ar. Faltou um item, volta sem discussão.
3. **Celular é testado antes de o dono ver.** A Divisão 1 confere toda tela publicada em tamanho de celular, logada, com uma conta de teste da casa. Precisa de uma coisa do dono: aprovar a conta de teste e entrar com ela uma vez no navegador interno do Claude (a CEO não digita senha).
4. **Reversível sobe, irreversível espera.** Tela, ordem de cartão, texto e botão sobem depois da revisão e o dono ajusta depois (foi o que ele mandou em 13/11: "pode fazer tudo, amanhã mudamos o que tem que mudar"). Continuam esperando o sim dele: dinheiro saindo, preço, e-mail a cliente fora de rotina já aprovada, vídeo novo na vitrine, apagar dado.
5. **Papel velho sai da mesa.** O quadro vivo fica com as últimas 48 horas e o resto vai para um arquivo por mês; o CLAUDE.md fica só com as regras que valem hoje e a história vai para `docs/`. Menos limite gasto para cada sessão começar.

### 2.3 O dia

| Hora | O que acontece | Quem |
|---|---|---|
| 07:45 | **Placar da manhã** em uma tela: vendas, cadastros, nota dos filmes, o que subiu de madrugada e todas as decisões pendentes numa foto só | CEO |
| Ao acordar | Janela de decisão 1: o dono responde tudo de uma vez | Dono |
| Dia | Obra. Cada divisão com UM número da semana. O GPT puxa do quadro | Todos |
| 20:00 | Pautas dos vídeos do dia (já existe) | Sessão de vídeos |
| Antes de dormir | Janela de decisão 2 + lista do que roda de noite | Dono e CEO |
| 23:15 → 07:00 | Turno da noite: revisor dá nota, conserto de defeito com causa clara, GPT constrói, CEO revisa e publica o reversível | Todos |

### 2.4 A semana segue o dinheiro

Meta do dono: MRR de US$ 1.000 até 30/11. Toda segunda a CEO escolhe **3 apostas** com número e prazo de corte, e cada divisão recebe um número só:

| Divisão | Número da semana |
|---|---|
| 2 · Vídeo e motores | Filmes do teste grátis com nota ≥ 8 (hoje 6 de 73) |
| 4 · Receita | Dos que baixaram o filme, quantos pagaram (hoje 3 de 82 pelo ChatGPT) |
| GPT · Telas | Dos que veem a home, quantos clicam num cartão (hoje 12%) e quantos começam um filme |
| GPT · Citações + Div. 3 | Visitas vindas de ChatGPT, Bing e anúncio pago de país rico |
| 5 · Plataforma | Testes de tela vermelhos na produção (hoje 126) e minutos entre "pronto" e "no ar" |
| 1 · Teste de telas | Defeitos achados pelo dono (meta: zero) contra achados por nós |

## 3. As três opções para o dono

| | A · Linha de montagem (recomendada) | B · Só o mínimo | C · Tudo no Claude |
|---|---|---|---|
| O que é | As 5 mudanças + o dia + os números por divisão | Só a tarefa automática do GPT e as 2 janelas de decisão | As telas voltam para o Claude; o GPT só propõe desenho |
| O que pede de você | ~15 min uma vez: criar a tarefa no Codex, aprovar a conta de teste e entrar com ela, dizer sim à faxina do quadro e do CLAUDE.md | ~5 min: criar a tarefa no Codex | Nada |
| Ganho | Fecha os 6 gargalos | Fecha o 1 e o 5 | Fecha o 1, mas perde o desenho do GPT e gasta o limite do Claude (57% usado) |
| Risco | A tarefa do GPT gasta o plano dele de 30 em 30 min mesmo sem pedido: começa em 30 min e a gente mede em 3 dias | O celular e os testes vermelhos continuam como estão | Telas mais lentas e mais feias |

## 4. O que já está ligado (13/11) e o que espera o sim

| Item | Estado |
|---|---|
| Puxador das entregas do GPT (CEO avisada a cada commit do Codex) | **LIGADO** |
| Ferramenta `scripts/ci/novos-vermelhos.sh` | **LIGADO** (no repositório) |
| Regra "reversível sobe, irreversível espera" | **LIGADO** (ordem do dono de 13/11) |
| Aviso no celular a cada coisa nova e a cada decisão | **LIGADO** |
| Tarefa automática do GPT lendo o quadro | Espera o dono (é no Codex dele) |
| Conta de teste para o celular | Espera o dono |
| Faxina do quadro e do CLAUDE.md | Espera o dono |
| Um número por divisão + 3 apostas na segunda | Espera o dono; a CEO monta o primeiro placar em 16/11 |

## 5. Como saber se funcionou (medir em 7 dias, em 20/11)

- Defeitos achados pelo dono: de ~7 numa noite para no máximo 1 por dia.
- Horas entre "GPT terminou" e "no ar": hoje depende de ele estar acordado; meta de até 2 horas, dia ou noite.
- Entregas do GPT que voltam por teste vermelho: de 1 em 1 para menos de 1 em 5.
- Testes de tela vermelhos na produção: de 126 para menos de 60.
- Limite semanal do Claude no domingo: abaixo de 85%.
- E o que importa: filmes com nota ≥ 8 e pagantes por semana subindo. Se as cinco medidas acima melhorarem e essas duas não, o problema não era o fluxo, e a gente troca as apostas.
