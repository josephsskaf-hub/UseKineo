# GATES ABERTOS — só o fundador consegue destravar

**Regra:** eu nunca paro num gate. Anoto aqui, passo para a próxima coisa, e o Joseph resolve tudo de uma vez por dia.
**Não posso:** criar conta · digitar senha · resolver CAPTCHA · mover dinheiro.

---

## 🚨🚨 00. RECARREGAR CRÉDITOS OPENAI — PRODUÇÃO PARADA DESDE 11:07Z (2 min)

**A conta OpenAI zerou os créditos.** Desde 11:07Z (08:07 sua hora): **ZERO vídeos gerados**,
115 erros, 10 pessoas reais batendo em botão morto, **9 cadastros novos do TAAFT** chegando
num produto que não gera nada — e a **demo pública da landing também está morta** (cada
visitante TAAFT vê falha antes mesmo de se cadastrar). Log de produção, 13:46Z:
`429 You have no credits remaining`.

**→ https://platform.openai.com/settings/organization/billing/ — recarregar e acabou.**

Enquanto isso construí o alarme que faltava (commit `c91f0c4`, espelho do falAlert do
incidente fal.ai de 10/07): no próximo blackout você recebe **e-mail em segundos** + o
usuário vê **503 honesto** ("team was automatically alerted — your free videos and credits
are untouched") em vez de "try a different prompt". Sobe no 10-PUSH.

## 🔴 0. RODAR `scripts\10-PUSH.bat` — 10 segundos (substitui o 8 e o 9)

Sobe TUDO pendente (6 commits): ponte pós-download + TAAFT revive (sprint 10h) + docs
Reddit/Fazier/Stripe (sessão autônoma) + **ALARME OPENAI** (sprint 11h — o mais urgente de
subir: sem ele o próximo blackout é mudo de novo). Apaga também os 3 locks da sessão travada
das 10:01. Regra de sempre: clique no MAIOR número da pasta.

---

## ✅ SPRINT DE FLUXO 31/07 (3h) — o que EU já fiz sozinho, com a extensão viva

| Ação | Resultado |
|---|---|
| IndexNow (Bing/ChatGPT) | **107 URLs aceitas, HTTP 200** — inclui o case study novo |
| Google: reindex da HOME | **"Indexing requested"** — o título de marca novo entrou na fila prioritária |
| Google: index do case study | **"Indexing requested"** |
| Google: recrawl de /avatar | **"request rejected"** = o Google LEU o noindex — o snippet "ShortsForgeAI · $11.90" vai cair |
| **FutureTools (Matt Wolfe, ~700k subs)** | ✅ **"Tool Submitted!"** — 1ª submissão de diretório da história da empresa |
| **Insidr.ai** | ✅ **"Your submission was successful."** |
| aitoolsdirectory.com | ⏳ rascunho preenchido (Kineo + URL salvos no form); página com bug de render — terminar à mão leva 2 min |

## ❌ Diretórios que EU não consigo — precisam de VOCÊ logado (a extensão já permite eu dirigir depois do seu login)

Todos verificados em 31/07. Cada um pede conta/login:

| Diretório | Bloqueio | Link |
|---|---|---|
| **Fazier** (melhor dofollow da lista) | conta | fazier.com |
| **Microlaunch** | conta | microlaunch.net |
| **OpenAlternative** | conta | openalternative.co/submit |
| Dang.ai | magic link por e-mail | dang.ai/submit |
| Findly.tools | conta | findly.tools/submit |
| TinyLaunch (badge DR 72+) | conta | tinylaunch.com |
| ProductCool | magic link | productcool.com/submit |
| AIStage | login p/ ver o form | aistage.net/submit |
| Turbo0 | conta | turbo0.com/submit |
| StartupBase · BetaList · SaaSHub · Uneed | conta | — |

**Como destravar em lote (30 min, uma vez):** você loga nesses sites numa janela do Chrome e me fala — com a extensão conectada eu preencho e submeto todos na hora, igual fiz no FutureTools.

## ❌ Mortos ou pagos — riscar da lista para sempre

- **TAAFT rota grátis (tally.so/r/mRWbdK): FORMULÁRIO FECHADO** em 31/07 — "This form is now closed". A única rota grátis do TAAFT morreu; sobra a edição da ficha (já feita) e reviews.
- aitools.fyi/submit → virou serviço pago **$37**
- ToolsFine → formulário termina em **"Continue to PayPal – $10"**
- LaunchingNext → parede anti-bot infinita

---

## 🔴 1. TAAFT — pedir 5 avaliações reais — 15 min

Nota **3,0 com só 2 avaliações** governa o que todo LLM lê sobre a Kineo. O TAAFT segue sendo o canal nº 1 (81 cadastros, 32,1% de ativação, metade dos compradores da história) e está decaindo 48→16→9→5/semana. Mandar o link para 5 usuários reais é o item de maior retorno por minuto que existe: https://theresanaiforthat.com/ai/kineo/
Lista de candidatos (por vídeos concluídos) em `docs/SPRINT-2026-07-30-D.md` §7.
Bônus: **antonia@theresanaiforthat.com tem conta na Kineo com 5 vídeos** — contato mais valioso da empresa.

## 🔴 1.b Send no rascunho do pagante — 30 segundos (sprint 10h)

Rascunho novo no seu Gmail: **"Fixed — your videos will deliver now"** para
`valos87196@…` (o único plano pago ativo). Diagnóstico fechado hoje: 6 vídeos dele foram
renderizados e RECUSADOS na entrega por falha nossa de débito; o fix subiu no seu push desta
manhã e um débito real liquidou às 10:55Z. Ele não tenta desde 30/07 12:44Z — este e-mail é
o que o traz de volta. Só apertar Send.

## 🔴 2. E-mail de win-back — 12 pessoas, "pode mandar" seu

12 pessoas tiveram 25 vídeos prontos destruídos (23–30/07) por falha nossa. Rascunho pronto; só falta seu OK. O pagante `valos87196@…` merece contato direto.

## 🔴 3. Bing Webmaster Tools — 10 min

Import do GSC em 1 clique: bing.com/webmasters. O canal já está alimentado (IndexNow ×2); falta enxergar posições/consultas no índice que sustenta a busca do ChatGPT.

## 🟠 4. AlternativeTo — 20 min

Página da Kineo com 0 likes. "Suggest alternative" em OpusClip, Submagic, InVideo, Klap, Crayo, AutoShorts, Revid, Faceless.so, Syllaby, Pictory, HeyGen, Fliki, SendShort, Zebracat, Quso.

## 🟡 5. Computer-use nas tarefas agendadas — 1 min, mata o gate de push

Configurações da tarefa `kineo-sprint-diario` → adicionar **Explorador de Arquivos**. Aí as 4 sprints diárias empurram commits sozinhas.

## 🟢 6. KINEO_LIFECYCLE_EMAILS_ENABLED — TECNICAMENTE PRONTO. Só falta sua palavra.

Auditoria de 31/07 (sessão B) concluiu os dois pré-requisitos:
- **Supressão cruzada de 24h: JÁ ESTAVA LIGADA** nos 4 crons + 2 rotas admin desde 27/07
  (`lib/lifecycle/suppression.ts` — os docs é que estavam atrasados).
- **Templates auditados um a um:** remetente certo (`hello@usekineo.com`), claims honestos.
  Único erro real — video-rescue prometia "25 Shorts por $4,90" quando o pack dá **30** —
  corrigido e amarrado à fonte de preço (commit da sessão B).
- A "falsidade documentada" ("first AI video is free, no credits") vive só num **comentário
  de código** e no doc morto EMAIL-HOT-LEAD.md — nenhum e-mail enviado a contém.

**Para ligar:** Vercel → kineo → Settings → Environment Variables → `KINEO_LIFECYCLE_EMAILS_ENABLED=true` → redeploy. Reversível em segundos. 721 contatos do outro lado, máx. 1 e-mail/24h por pessoa, 1 de cada tipo por vida.

## ✅ 7. Post do Reddit — FEITO POR MIM em 31/07 (autorizado)
Postado de u/ShortsforgeAI + 1º comentário. Filtro do Reddit segurou o post (conta nova sem karma) — está na fila dos mods. Modmail de revisão bloqueado ("You can't message that user" = restrição de conta nova). **Se você tiver conta Reddit PESSOAL com karma, o próximo post sai dela — resolve o filtro na raiz.**

## ~~🆕 7-antigo~~. Post do Reddit — PRONTO PARA COLAR — 5 min

`docs/REDDIT-POST-PRONTO.md`: título + corpo + primeiro comentário, para o r/YouTubeCreators
(98k membros, sem regras de autopromoção). É a distribuição do case study — thread viva que
se atualiza toda semana. Postar exige sua conta Reddit; o texto está pronto palavra por palavra.
