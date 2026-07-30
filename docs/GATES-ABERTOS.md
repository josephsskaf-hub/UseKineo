# GATES ABERTOS — só o fundador consegue destravar

**Regra:** eu nunca paro num gate. Anoto aqui, passo para a próxima coisa, e o Joseph resolve tudo de uma vez às 21h.
**Não posso:** criar conta · digitar senha · resolver CAPTCHA · mover dinheiro.

Ordenado por retorno. Marque `[x]` quando resolver — eu leio este arquivo toda manhã.

> **REORDENADO EM 30/07** pelos dados de `docs/SPRINT-2026-07-30-B.md` §4. O TAAFT subiu para
> primeiro: é o canal nº 1 em volume **e** em qualidade (81 cadastros, 32,1% de ativação,
> **metade dos compradores da história**) e está decaindo **48 → 16 → 9 → 5 por semana**.
> Os cadastros semanais caíram 178 → 8 em três semanas, e o TAAFT explica quase toda a queda.

---

## 🔴 0-zero-A. Liberar computer-use na tarefa agendada — 1 minuto, resolve o push PARA SEMPRE

**Este item destrava o de baixo permanentemente, e nenhuma sprint futura precisa dele de novo.**

Em 30/07 (sprint C) tentei rodar o `push_only.bat` sozinho, pelo caminho que o próprio
`CLAUDE.md` do projeto prescreve. Não é possível — e o motivo não estava documentado:

> `Computer-use access can't be approved during a scheduled run. To grant it, send a message in
> this conversation, or add the app to the scheduled task's settings.`

As quatro sprints do dia rodam agendadas. Nenhuma delas consegue clicar em nada, hoje.

**O que fazer:** nas configurações da tarefa `kineo-sprint-diario`, adicionar **Explorador de
Arquivos** (e, se aparecer a opção, **Git Bash**) à lista de apps autorizados. A partir daí eu
empurro os commits sozinho e o gate 0-zero deixa de existir.

**Enquanto isso não acontece, todo commit meu espera você.** Foi o que manteve uma correção de
entrega paga 6h parada em 29/07 e o que mantém a de UX pós-vídeo parada agora.

---

## 🔴 0-zero. Um commit esperando push — 10 segundos

**Duplo clique em `scripts\push_only.bat`.** É a única coisa da lista que leva segundos.

> ⚠️ **CORRIGIDO EM 30/07 (sprint C): a linha "583e6a6 ✅ no ar" abaixo estava ERRADA.**
> O commit está no histórico, mas o commit seguinte (`b6fef68`) **apagou as 70 linhas de código
> dele**. Produção nunca recebeu a correção da entrega paga. Detalhe em `docs/SPRINT-2026-07-30-C.md`
> §1. **O push agora é urgente, não cosmético: é o que restaura a entrega para o único cliente
> pagante.**

| Commit | O quê | Estado |
|---|---|---|
| `583e6a6` | Correção da entrega paga | ❌ **NO HISTÓRICO, MAS APAGADA POR `b6fef68`** |
| `b6fef68` | `push_only.bat` + gates — e a reversão acidental acima | ✅ no ar (com o estrago) |
| **`e7fd432`** | **UX pós-vídeo: ordem de leitura + rodapé de afiliado** | ⏳ **falta push** |
| **`<sprint C>`** | **Restaura a correção da entrega paga + `failure_reason`** | ⏳ **falta push** |

Os dois primeiros já subiram — deploy `dpl_J3VFJ6C7m7MTaGWvCUD7pRHim7H5`, READY, alias
`www.usekineo.com`. O terceiro está commitado e verificado localmente (`tsc --noEmit` =
`EXITCODE=0`) e **enquanto não subir, a mudança da tela pós-vídeo não está em produção** — que é
justamente a tela onde 6 de 26 pessoas encerram a relação com o produto.

Por que eu não empurro: a credencial do GitHub vive no Windows Credential Manager e não existe
dentro do container (`could not read Username for 'https://github.com'`). Commitar eu consigo,
contornando o `.git/index.lock` do OneDrive com um `GIT_INDEX_FILE` em `/tmp`. O push é a única
parte que precisa da sua máquina.

**Use `push_only.bat`, não `push_sprint_12h.bat`** — aquele commita usando
`scripts/acq_commit_msg.txt` e arriscaria um commit com mensagem de sprint antiga. O novo apaga os
dois locks do OneDrive, commita por caminho explícito só o que ficou de fora (nunca `git add -A`,
por causa dos ~175 arquivos de ruído CRLF), empurra e confere o remoto no fim.

Confirmação de que funcionou: `git ls-remote origin main` deve devolver `e7fd432…` ou mais recente.

---

## 🔴 0. Reconectar a extensão Claude-in-Chrome — 2 min

**O item mais barato da lista, e ele bloqueou um terço do placar hoje.**

Em 30/07 a extensão estava desconectada nas duas sessões. Sem ela não há Search Console:
zero dado de indexação, de consultas e de **CTR de marca** — que é a métrica de saúde mais
sensível que temos e a origem do achado de 29/07. Duas sprints seguidas sem esse número e a
frente de PALAVRAS-CHAVE fica cega.

1. Extensão: https://chromewebstore.google.com/detail/fcoeoabgfenejglbffodgkkbkcdhcgfn
2. Abrir o painel lateral do Claude no Chrome e entrar com a mesma conta do app.

---

## 🔴 0-bis. Um cliente pagante está sem receber — precisa de uma palavra sua

**Não é aquisição. É o único cliente pagante ativo da empresa.**

`valos87196@…` (Austrália, plano `basic`, 75 créditos) teve **7 vídeos limpos recusados entre
29/07 e 30/07**, cada um com a mensagem errada dizendo para ele conferir o saldo. O saldo
sempre esteve certo. O último vídeo que ele recebeu foi 10/07 — o dia em que passou a pagar.

Corrigi a causa no código hoje (sessão B §2), mas **os 7 vídeos dele foram perdidos** e ele não
recebeu nenhuma explicação. Deixei um rascunho de e-mail de desculpa + oferta de entrega manual
na pasta de saída da sessão (fora do git, porque tem e-mail de cliente e o repo é público).

**Bloqueio:** disparar e-mail é seu gate. 5 minutos.

---

## 🔴 1. Bing Webmaster Tools — 10 min

**Link:** https://www.bing.com/webmasters/home → "Import from Google Search Console" (um clique)

**Por que é o primeiro da lista:** a busca do ChatGPT roda no índice do Bing, e o ChatGPT é a única fonte que já produziu checkout na Kineo (23/07: 4 cadastros e **os dois únicos checkouts da semana**; o Google inteiro trouxe 1 sessão e zero). Eu já submeti 106 URLs via IndexNow em 29/07 e o Bing aceitou (HTTP 200) — o canal está alimentado. O que falta é **enxergar** o canal: sem o Webmaster Tools não há como saber se estamos indexados lá, em que posição, nem para quais consultas.

**Bloqueio:** exige autenticar conta Microsoft.

---

## 🔴 2. TAAFT — pedir 5 avaliações reais — 15 min

**Link:** https://theresanaiforthat.com/ai/kineo/

> **30/07 — este item virou o de maior retorno da lista.** Medido: TAAFT = **81 cadastros**,
> **32,1% de ativação** (contra 28,7% da base) e **2 dos 4 compradores da história**. É o melhor
> canal em volume E em qualidade. E está morrendo: **48 → 16 → 9 → 5** cadastros por semana.
> Dois fatos novos que mudam como pedir:
> · `free.theresanaiforthat.com` (42 cadastros) já passou o domínio principal (40) — a rota
>   gratuita é a que está entregando;
> · **`antonia@theresanaiforthat.com` tem conta na Kineo, com 5 vídeos concluídos e 85 créditos.**
>   Alguém do TAAFT usou o produto de verdade. É o contato mais valioso que a empresa tem e
>   ninguém sabia que existia.
>
> Lista de candidatos reais a avaliação (por vídeos concluídos, com país e origem) está na pasta
> de saída da sessão — fora do git, porque tem e-mail de cliente.

**Situação:** nota **3,0 de apenas 2 avaliações** (uma 5★, uma 1★). O bloco de Prós/Contras é gerado pela plataforma a partir dessas duas reviews — não é editável, e não deveria ser.

**Por que importa:** essa é a ficha pública canônica do produto e é lida por LLMs. Duas avaliações é ruído estatístico governando a impressão de todo motor de resposta que ler a página. Já corrigi o que era factual ali em 29/07 (era "One-time / $4,90", agora mostra "Free + from $9.90/mo").

**O que fazer:** mandar o link para 5 pessoas que **de fato usaram** e pedir avaliação honesta. Não comprar review, não pedir nota alta.

**Bloqueio:** só você tem a relação com esses usuários.

---

## 🟠 3. AlternativeTo — 20 min

**Link:** https://alternativeto.net/software/kineo/

**Situação:** a página da Kineo existe com **0 likes** e não aparece como alternativa de ninguém.

**O que fazer:** usar "Suggest alternative" em 15–20 páginas de concorrentes — OpusClip, Submagic, InVideo AI, Klap, Crayo, AutoShorts, Revid, Faceless.so, Syllaby, Pictory, HeyGen, Fliki, SendShort, Zebracat, Quso.

**Por que:** é o diretório de maior intenção de compra que existe no nicho, e é onde a decisão "qual eu escolho" acontece.

**Bloqueio:** exige conta.

---

## 🟠 4. Diretórios grátis com dofollow confirmado — 90 min

Verifiquei HTTP e inspecionei HTML em 29/07. Todos gratuitos, todos vivos:

| Diretório | Link | Nota |
|---|---|---|
| **FutureTools** | futuretools.io/submit-a-tool | Curado pelo Matt Wolfe (~700k inscritos). Entrar aqui é entrar no radar dele |
| **Fazier** | fazier.com | 57 links externos, 0 nofollow — melhor razão da lista |
| **Microlaunch** | microlaunch.net | Alternativa ao Product Hunt, audiência indie |
| **OpenAlternative** | openalternative.co/submit | Casa com a estratégia /alternatives |
| **Twelve Tools** | twelve.tools | Submete a 12 diretórios de uma vez |
| aitools.fyi · Dang.ai · TinyLaunch · Findly | `/submit` em cada | 10 min cada |

**Não perca tempo:** launch-list.org, startupstash.com, aitoolhunt.com, crozdesk.com, toolpilot.ai — todos **404** em 29/07. Futurepedia cobra **$247–497** e é o pior retorno da lista.

**Por que importa mais do que parece:** domínio de 3 meses sem backlink não ranqueia, por melhor que seja o SEO on-page — e o SEO on-page da Kineo já está muito acima da média do estágio. **Autoridade é a variável que falta, e ela só vem de fora.**

> **30/07 — prova empírica de que isso funciona neste nicho, e ela apareceu sozinha.**
> **`topai.tools` trouxe 12 cadastros** e não está em documento nenhum: ninguém submeteu a Kineo
> lá, o diretório indexou por conta própria. `uneed.best` trouxe 1 pelo mesmo caminho.
> Doze cadastros de um diretório que recebeu **zero esforço** é o melhor argumento que existe
> para os ~20 diretórios desta lista que recebem esforço nenhum. Acrescente
> **topai.tools** e **uneed.best** à lista de submissão — os dois já nos conhecem.

**Bloqueio:** cada um exige criar conta.

---

## 🟡 4-bis. Pagar uma vez torna o produto mais caro de usar — decisão de oferta, sua

**Achado da sprint C, §2.1. Não é bug: é a regra funcionando como escrita.**

`lib/credits/engineCost.ts:44` → `return isPaidUser ? 1 : 0`. Quem tem `has_paid=true` passa a
gastar **1 crédito por vídeo Fast**; quem nunca pagou gasta **0** e gera à vontade (com marca
d'água). Os três compradores avulsos ficaram em `plan='free'` com saldo finito — 10, 20 e 10
créditos. Quando o saldo acabar, **quem pagou US$ 4,90 fica impedido de fazer o vídeo que qualquer
visitante anônimo faz de graça.**

Hoje **ninguém está em saldo zero**, então isso não custou cliente ainda. Mas os três compradores
avulsos sumiram entre 3 e 13 dias depois de comprar, e a empresa tem **0 assinaturas recorrentes na
história**.

**Não mexi**: preço tem fonte única (`lib/checkoutPricing.ts`) e regra de oferta é sua.
Minha recomendação, se quiser: dar ao comprador avulso o mesmo Fast gratuito que o visitante tem, e
cobrar crédito só pelo export limpo. A compra passa a somar em vez de subtrair.

---

## 🟡 5. `KINEO_LIFECYCLE_EMAILS_ENABLED` — decisão sua, não minha

**Situação:** os 9 crons já estão agendados no `vercel.json`. Falta só virar a variável de ambiente na Vercel. Do outro lado dela há **721 pessoas**.

**Por que eu não virei:**
1. `EMAIL-HOT-LEAD.md` contém falsidade ativa já documentada em `PRODUCT_AND_OFFER.md` §3.2 — *"Your first AI video is free, no credits needed"* — com marca e remetente velhos.
2. Falta a **supressão cruzada de 24h** (`ROADMAP.md` §4.3-bis Passo 3). Cada job é "1 por usuário para sempre", mas nenhum enxerga o do outro: quem se encaixa em vários critérios recebe ~4 e-mails no mesmo dia.

**Ordem certa:** auditar os 4 templates → eu implemento a supressão → você vira a flag.

**Se quiser que eu faça os dois primeiros passos, é só dizer "audita os templates e implementa a supressão" — isso eu posso.** O que eu não faço é disparar.
