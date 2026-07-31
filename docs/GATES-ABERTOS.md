# GATES ABERTOS — só o fundador consegue destravar

**Regra:** eu nunca paro num gate. Anoto aqui, passo para a próxima coisa, e o Joseph resolve tudo de uma vez por dia.
**Não posso:** criar conta · digitar senha · resolver CAPTCHA · mover dinheiro.

---

## 🚨 00. REABERTO — BLACKOUT OPENAI ROUND 2 (detectado pela sprint 16h às 19:02Z)

**A recarga das 16:42Z segurou só 31 minutos.** Markers `openai_quota_dead` voltaram
17:13Z–18:23Z: 15 markers / 5 vítimas no round 2, e **0 vídeos criados desde a recarga**
— a produção não entregou UM vídeo o dia inteiro (desde 11:07Z). Não há tentativas de
geração desde ~18:23Z, então não dá para afirmar o estado AGORA — mas 0 vídeos
pós-recarga diz que ela nunca chegou a destravar de verdade.

**Checar em https://platform.openai.com/settings/organization/billing/ (2 min), nesta ordem:**
1. **Teto de $30/mês bateu?** Era o ponto único de falha previsto no pós-mortem. Se sim,
   auto-reload fica morto até subir o teto → subir para $100+ (teto é permissão, não gasto).
2. Colchão fino: gatilho $5 → recarrega só até $10 — a onda queima isso em minutos.
   Subir gatilho para $10 → recarregar até $25.
3. A recarga caiu na MESMA org da API key de produção? (conta com múltiplas orgs engana)

O win-back dispara sozinho quando voltar (45 min sem marker + 1 vídeo completado).
O e-mail 🚨 do round 2 pode ter chegado agrupado na mesma thread do das 15:40Z —
conferir o Gmail de hoje ~14:15–15:25 (horário local).

---

## ✅ 00-a. ROUND 1 (histórico) — recarga feita pelo fundador, fim às 16:42Z (31/07)

Duração total: **11:07Z → 16:42Z (5h35)**. Dano final: 15 vítimas externas / ~196 erros /
0 vídeos no período. Verificado em produção às 16:50Z: **zero erros desde 16:43Z** (antes,
~1/min). Timeline completa em SPRINT-2026-07-31 (§ sprints 11h e 13h).
Alarme (10-PUSH) e win-back (11-PUSH) ambos no ar — deploy `a81f6d8` READY.
O win-back dispara sozinho quando: 45 min sem erro de quota + 1 vídeo COMPLETADO depois
de 16:42Z (cron roda às hh:05/hh:35). Nenhuma ação pendente.

**Pós-mortem (16:55Z, screenshot do fundador):** saldo $18.98 e **auto-reload LIGADO**
(gatilho $5 → recarrega até $10, teto $30/mês) — a causa raiz está tratada. ⚠️ Ajuste
recomendado (2 min, botão Modify): colchão de $5 é fino para pico de onda (gatilho $10 →
até $25) e o **teto de $30/mês é o novo ponto único de falha** se o volume seguir
crescendo — subir para $100+ (teto é permissão, não gasto). Se o teto bater, o alarme
pega em segundos e o win-back recupera as vítimas — mas melhor não bater.

## ✅ 0. `scripts\11-PUSH.bat` — RODADO pelo fundador às ~16:44Z (deploy `a81f6d8` READY)

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

## ✅ 6. KINEO_LIFECYCLE_EMAILS_ENABLED — LIGADO em 31/07 (nudges saindo em ritmo saudável: 502 às 16:02Z)

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
