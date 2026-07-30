# GATES ABERTOS — só o fundador consegue destravar

**Regra:** eu nunca paro num gate. Anoto aqui, passo para a próxima coisa, e o Joseph resolve tudo de uma vez às 21h.
**Não posso:** criar conta · digitar senha · resolver CAPTCHA · mover dinheiro.

Ordenado por retorno. Marque `[x]` quando resolver — eu leio este arquivo toda manhã.

---

## 🔴 1. Bing Webmaster Tools — 10 min

**Link:** https://www.bing.com/webmasters/home → "Import from Google Search Console" (um clique)

**Por que é o primeiro da lista:** a busca do ChatGPT roda no índice do Bing, e o ChatGPT é a única fonte que já produziu checkout na Kineo (23/07: 4 cadastros e **os dois únicos checkouts da semana**; o Google inteiro trouxe 1 sessão e zero). Eu já submeti 106 URLs via IndexNow em 29/07 e o Bing aceitou (HTTP 200) — o canal está alimentado. O que falta é **enxergar** o canal: sem o Webmaster Tools não há como saber se estamos indexados lá, em que posição, nem para quais consultas.

**Bloqueio:** exige autenticar conta Microsoft.

---

## 🔴 2. TAAFT — pedir 5 avaliações reais — 15 min

**Link:** https://theresanaiforthat.com/ai/kineo/

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

**Bloqueio:** cada um exige criar conta.

---

## 🟡 5. `KINEO_LIFECYCLE_EMAILS_ENABLED` — decisão sua, não minha

**Situação:** os 9 crons já estão agendados no `vercel.json`. Falta só virar a variável de ambiente na Vercel. Do outro lado dela há **721 pessoas**.

**Por que eu não virei:**
1. `EMAIL-HOT-LEAD.md` contém falsidade ativa já documentada em `PRODUCT_AND_OFFER.md` §3.2 — *"Your first AI video is free, no credits needed"* — com marca e remetente velhos.
2. Falta a **supressão cruzada de 24h** (`ROADMAP.md` §4.3-bis Passo 3). Cada job é "1 por usuário para sempre", mas nenhum enxerga o do outro: quem se encaixa em vários critérios recebe ~4 e-mails no mesmo dia.

**Ordem certa:** auditar os 4 templates → eu implemento a supressão → você vira a flag.

**Se quiser que eu faça os dois primeiros passos, é só dizer "audita os templates e implementa a supressão" — isso eu posso.** O que eu não faço é disparar.
