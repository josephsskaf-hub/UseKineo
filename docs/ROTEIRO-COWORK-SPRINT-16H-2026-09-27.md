# Roteiro do Cowork · sprint 16 h · 27/09/2026

Rodar DEPOIS do 1º "hora de clicar" (marco A). Conta: a logada no Chrome (hotmail de preferência); nunca digitar senha.

```
ROTEIRO DO COWORK · SPRINT 16H · 27/09/2026 (arquivo: docs/ROTEIRO-COWORK-SPRINT-16H-2026-09-27.md; relatório em docs/TESTE-SPRINT-16H-2026-09-27.md)

PRÉ-CONDIÇÕES (não começar sem as três)
1. Marco 0 confirmado pelo Claude (crédito na OpenAI). Sem isso todo Generate morre em 'Kineo is at full capacity' e o teste mede o incidente, não a entrega.
2. Deploy A no ar (Claude avisa o hash e a hora BRT).
3. Duas contas: (i) uma conta TRIAL NOVA criada na hora (e-mail do fundador com +sprint0927), 10 cr; (ii) josephskaf@hotmail.com (pro, ~43 cr) para o Studio Ads. Anotar o e-mail e a HORA BRT de cada passo — o Claude cruza os eventos por user_id e separa sonda de orgânico por ip_hash.

O QUE GRAVAR EM TODO PERCURSO: hora BRT de cada clique, screenshot nomeado P<n>-<passo>.png, PASS/FAIL com uma frase, e o texto exato de qualquer erro. Não pagar nada: todo checkout para na tela da Stripe e volta.

RODADA 1 · depois do marco A (~09h30-11h)

P1 · Parede no clique (conta trial nova, 10 cr)
a) Abrir o link do quickstart do ChatGPT copiado de lib/growth/chatgptQuickstart.ts:33 (/studio?engine=seedance&script_mode=ai&duration=60&chatgpt_quickstart=idea&intent_campaign=…). Conferir: motor Seedance selecionado, duração 60.
b) Digitar uma ideia de 1 linha e clicar Generate. CRONOMETRAR do clique até o modal de créditos. PASS = modal em < 5 s, SEM spinner de roteiro antes, SEM 'full capacity'; o modal mostra Starter como 1º botão e uma caixa 'Use Kineo 1 (N cr)' com N = 5 (60 s). FAIL = roteiro roda antes do modal, ou modal não abre, ou N digitado diferente do custo (35 s = 3, 60 s = 5).
c) Clicar 'Use Kineo 1'. PASS = o filme completa (Kineo 1) e o saldo cai de 10 para 5. Anotar tempo até 'ready'.
d) Repetir a) e b) com o mesmo prompt: agora 5 cr, Seedance 60 s. PASS = modal de novo em < 5 s; clicar Kineo 1 → 2º filme, saldo 0.
e) Terceira vez: com 0 cr o modal deve dizer que o trial acabou (razão legítima), sem a caixa Kineo 1 paga; clicar Starter → a Stripe abre em Starter na moeda local (R$ no Brasil) → NÃO pagar → voltar. Anotar a URL do checkout (o Claude confere intent_campaign).
f) Registrar quantas vezes o modal abriu por parede (o Claude confere upgrade_modal_opened = 1 por parede no banco).

P2 · Porta do Studio Ads
a) Deslogado, em aba anônima: rodapé 'Videos for businesses' → PASS = cai em /ads (preço, modelos, FAQ), não em /login.
b) Deslogado, digitar /ads/new → nesta rodada AINDA vai a /login (esperado); anotar a hora (o Claude confere ads_access_denied who='anon').
c) Conta trial: menu 'Ads' → PASS = /ads; digitar /ads/new → volta a /ads; anotar hora (who='trial').
d) Conta hotmail (pro): /ads/new → PASS = painel 'AI makes it' visível (link + caixa de texto). Colar o link de um site real de padaria/restaurante, 'Make the plan' → plano aparece → render → anúncio entregue. Anotar tempo de leitura do link e tempo de render. FAIL = 'Something went wrong' (anotar o texto exato) ou painel IA ausente.
e) Na tela final, se aparecer oferta: PASS = 'See plans' vem ANTES do passe de US$19,90.

P3 · Pack regional — NÃO executável do Brasil (/api/geo lê só x-vercel-ip-country; não há override ?country=). Pular; o Claude prova por guardião (return=studio no href).

RODADA 2 · depois do marco B (~13h30-15h)

P4 · Exit-intent (aba anônima, /pricing)
a) Mover o mouse para fora da janela pelo topo até o painel abrir. PASS = não existe tile '$1'/'7 days of Creator'; existe Starter com preço em moeda local; a frase diz '2 Kineo 1 films' (não '0 Seedance'). Clicar o CTA → PASS = /signup com utm_source=exit_intent na URL.
b) Logado (conta trial): repetir. PASS = o painel não pede 'Sign up'; oferece voltar ao Studio.

P5 · Tabela do /pricing (aba anônima)
Ler e fotografar as linhas: Kling 3 = Creator '1/mo', Studio '2/mo'; Kling 2.5 sem '1080p'; H3 e Kling 2.5 com '1 film' em Starter; 'Saved characters' = 3 (trial) / 3 / 3 / 10; linha de tempo de render igual em todas as colunas ('Kineo 1 ~3–7 min · AI engines 8–20 min'); nenhum 'Priority'; prova social '2,100+ creators · 1,500+ films'. Comparar com o FAQ da MESMA página (Kling 3 films, tempo, garantia): PASS = zero contradição. Abrir /terms: PASS = sem 'introductory first-month price'.

P6 · CTA do trial (conta trial nova, 2ª conta se a 1ª já gastou)
No banner 'trial active' do /studio: PASS = botão principal diz Starter com preço local (R$49,90 no Brasil), Creator como link menor. Clicar → Stripe abre em Starter → não pagar. O modal de downgrade não é reproduzível (exige trial encerrado): o Claude prova por guardião.

P7 · Studio Ads, lista e upload (conta hotmail)
a) /ads/new → PASS = abre na lista 'Your ads' (há pedidos entregues) com miniatura, hora e idioma em cada item.
b) Novo pedido: selecionar logo + 3 fotos NUMA ÚNICA seleção de arquivos. PASS = 4/4 aparecem, sem 'Wait for the current upload to finish'. Repetir com logo primeiro e 3 fotos 2 s depois: PASS = 4/4. Aba Network aberta: anotar qualquer 4xx/5xx nas miniaturas (causa do 0×0 ainda não provada).
c) Barra de progresso: PASS = diz '2–3 minutes'; passo Render diz '35–55 s'.
d) /ads FAQ 'Do I need a subscription?': PASS = diz que qualquer plano pago inclui Studio Ads.

FORMATO DO RELATÓRIO: por percurso, PASS/FAIL, tempo medido, e-mail da conta, horas BRT, screenshots; no fim, nota 0-10 e a lista 'o que um cliente de verdade veria primeiro'. Defeito que exija mexer em compose/hollywood/generate-video/narrationFit entra como 'pede vai', não como conserto.
```
