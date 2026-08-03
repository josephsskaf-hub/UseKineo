# IDEIAS EXECUTADAS — registro canônico anti-repetição

**Para as sprints:** antes de propor a "ideia da sprint", leia este arquivo. Ideia daqui não
conta como nova. Formato: data · ideia · o que foi executado · métrica-alvo · prazo de morte
(7 dias sem mover = registrar como morta na seção do fim).

---

## Vivas (aguardando o número)

| Data | Ideia | Executado | Métrica-alvo | Morte em |
|---|---|---|---|---|
| 29/07 | Loop "Seus próximos 3 Shorts" pós-vídeo | No ar (`b7cca06` anterior) | Taxa de 2º vídeo (baseline 18,4%) | 05/08 |
| 29/07 | Reindex de marca no Google (noindex app + título Official Site) | No ar + reindex manual 31/07 | CTR de marca (baseline 0% / ~39 impr.) | 07/08 |
| 29/07 | IndexNow → índice do Bing/ChatGPT | 2 submissões (106 e 107 URLs, HTTP 200) | Cadastros com origem ChatGPT/Bing | 07/08 |
| 30/07 | Entregar-antes-de-vender (download verde primeiro) | No ar | Taxa de download (20% → 30% já medido ✅ FUNCIONANDO) | — |
| 31/07 | Case study vivo `/youtube-automation-case-study` | No ar, indexação pedida | Cadastros utm_source=case_study | 07/08 |
| 31/07 | Diretórios sem conta: FutureTools + Insidr | Submetidos ("Tool Submitted!" / "successful") | Cadastros com referral desses domínios | 07/08 (aprovação leva dias) |
| 31/07 | E-mails de lifecycle LIGADOS (flag + supressão + auditoria) | Env true + redeploy; baseline carimbos 11:08Z: nudge 490 · reminder 0 · rescue 220 · recovery 201 | Retornos D+1 e 1ª assinatura | 07/08 |
| 31/07 | Outreach fundador→usuário: 4 win-back + 8 pedidos de review TAAFT | **ENVIADOS pelo fundador** (HTML limpo, links ancorados) | Reviews no TAAFT (baseline 2) + retorno das 4 vítimas | 07/08 |
| 31/07 | Legenda de frase (4 palavras, fonte 62/76, quebra em pausa/frase) | No ar | Veredito do fundador no teste + retenção percebida | teste hoje |
| 31/07 | Post build-in-public r/YouTubeCreators | **POSTADO por mim** (u/ShortsforgeAI, /comments/1vbqphw) + 1º comentário com o link. Filtro automático do Reddit segurou (conta sem karma); está na fila dos mods; modmail bloqueado p/ conta nova | Cadastros utm/referral reddit | 07/08 |
| 31/07 | Contador "2 of 3 free today" no chip free (momento-teto visível) | No ar (`c2e428d`) | checkout_started de usuários no teto (baseline: 1 caso, kwajolinkup) | 07/08 |
| 31/07 | **Fazier COMPLETO no free tier** | 3 comentários úteis + logo/3 cards gerados + deal $4.90 + página live `fazier.com/launches/kineo`, launch agendado 03/08 | Cadastros referral fazier + dofollow | 10/08 |
| 31/07 | **Stripe: marca do checkout corrigida** | Nome "Aestivora Media"→**Kineo** · extrato "BOOKEDCALLS.CO"→**USEKINEO.COM** · desc. curta→KINEO · URL suporte→usekineo.com. Verificado no checkout live | Menos abandono/chargeback (era risco invisível) | — |
| 31/07 | **Ponte pós-download "postou? cola o link"** (da fila; sprint 10h) | Tabela `posted_shorts` (migration aplicada), `POST /api/posted-shorts`, card na tela de sucesso, upload direto gravando sozinho (`cf13d17`) — 1ª métrica de Shorts POSTADOS | Linhas em `posted_shorts` + evento `posted_short_submitted` | 07/08 |
| 31/07 | Revive do TAAFT ask (otimização, não ideia nova): flag por ação, gate 1º render, copy com motivo, botão primário (`99fa4e2`) | No ar após 8-PUSH — antes: 11 shows, **0 cliques na vida** | `taaft_review_ask_clicked` > 0 e reviews (baseline 2) | 07/08 |
| 31/07 | **Blackout honesto + alarme OpenAI** (sprint 11h; nasceu do incidente das 11:07Z) | `lib/openaiAlert.ts` (espelho do falAlert) + wiring em 4 rotas (generate-script, demo-script, demo-hooks, fast/cenas): e-mail automático ao fundador em segundos, 503 com copy honesta no lugar de 500 mudo, reason distinto `openai_quota_dead` (`c91f0c4`) | Tempo-até-detecção do próximo blackout (hoje: 3h → meta <30 min) · fim das tentativas cegas (5+/pessoa hoje) | — (infra permanente) |
| 31/07 | **Win-back pós-blackout automático** (sprint 13h; segunda metade do playbook) | Cron `/api/cron/send-blackout-winback` a cada 30 min: detecta fim do apagão (45 min sem `openai_quota_dead` + vídeo completado depois) e e-maila cada vítima UMA vez ("foi culpa nossa, voltou, créditos intactos", sem desconto; pagantes incluídos; janela 1º marker −6h; dedupe evento `blackout_winback_sent`) (`3a54522`, sobe no 11-PUSH) | Retornos de vítimas de blackout após o e-mail (baseline: 15 vítimas hoje, 0 voltaram) | 07/08 |
| 31/07 | **Typo "cineo" capturado de graça** (sprint 16h): JSON-LD `Organization`+`WebSite` com `alternateName` ['Kineo AI','UseKineo','Cineo','Cineo AI'] na home — 1ª entidade de marca estruturada do site (AEO + typo) | No ar após 12-PUSH (`app/page.tsx`) | Impressões/CTR da consulta "cineo" no GSC (baseline 14 impr./7d, 0 clique) | 07/08 (+latência de indexação) |
| 31/07 | **"A demo nunca morre"** (sprint 21h): banco estático curado (`lib/demoFallback.ts`, 5 verticais + genérico, matching por keyword) servido pelas rotas públicas `/api/demo-script` e `/api/demo-hooks` quando a OpenAI está quota-dead — visitante anônimo da TAAFT vê script real (HTTP 200 + `fallback:true`) em vez de erro 503; alerta ao fundador continua; render continua honesto | Código pronto, sobe no 13-PUSH | Conversão landing→cadastro em horas de blackout + ocorrências de `fallback:true` | 07/08 (ou o próximo blackout prova sozinho) |
| 02/08 | **"First win in one click" no checkout success** (nascida da autópsia do 5º comprador, que pagou em 60s e saiu sem gerar vídeo) | 3 tópicos virais 1-click (pool determinístico in-bundle, zero fetch) deep-link no trilho `create_intent=fast` → vídeo começa sozinho; countdown 5s→15s; evento `checkout_success_topic_clicked` | % compradores com 1º vídeo <1h do pagamento (baseline 0%) | 09/08 |
| 02/08 | **Ordem C — AEO na ferramenta grátis** (Regra Zero: `/free-script-generator` JÁ existia live+sitemap; página nova seria duplicata) | JSON-LD SoftwareApplication (price 0, isAccessibleForFree) + 308 `/youtube-shorts-script-generator`→página real (`ee354b7`, 16-PUSH); IndexNow pós-deploy pendente | Referral chatgpt.com/bing + indexação Bing | 09/08 |
| 02/08 | **Ordem E — Product Hunt 2º launch** (Regra Zero: 1º launch 14/07 flopou com 4 pts sem preparo; página estava desatualizada/vazia) | Página do produto refeita (tagline/descrição/categorias/pricing/galeria 3 imgs) + 2º launch completo agendado **terça 04/08 12:01am PT** via fluxo oficial; first comment honesto; checklist 100% | Posição no dia + cadastros referral producthunt.com | 11/08 |
| 02/08 | **Ordens 2 + A2 — PayPal no decline + embalagem Autopilot** (Regra Zero: PayPal já existia completo; Autopilot é serviço $299 de cliente → CTA só canal interno via isInternalEmail) | Recovery email com link PayPal por tier + linkify no HTML; descrição dos uploads do Curiosityvaultlab com CTA usekineo.com (`8d0836a`) | recovery→PayPal checkout / cadastros referral youtube.com | 09/08 |
| 03/08 | **Ordem 4 — E-mail do teto same-day** (gatilho mais quente: 3º vídeo do dia = provou 3× que quer HOJE) | Cron `send-cap-hit` (15,45 * * * *): e-mail em ≤1h espelhando a cópia aprovada do refusal in-app; preços de checkoutPricing; coluna `cap_hit_sent_at` JÁ em produção; supressão cruzada 24h; gate lifecycle (`067900f`) | cap_hit_sent_at → checkout_started no mesmo dia | 10/08 |

| 03/08 | **Medida 6 (PLANO-SEMANA) — cron send-video-ready** (gargalo gerar→baixar 30%: quem fecha a aba no render nunca sabe que o vídeo ficou pronto) | Cron `send-video-ready` (10,40 * * * *): e-mail único com thumbnail+título+link /history p/ completed 30min-24h sem download; stamp `video_ready_sent_at` (migration JÁ em produção); supressão cruzada 24h; pagantes incluídos (entrega, não venda) (`dda0859`, sobe no 24-PUSH) | video_ready_sent_at → download/ready_viewed no mesmo dia; taxa gerar→baixar 30%→? | 10/08 |

| 03/08 | **Ordens G1+G3 (PESQUISA-CONCORRENTES) — ângulo EARN** (Crayo $7,2M ARR vende "ganhar dinheiro", não "fazer vídeo") | Página `/make-money-clipping-with-ai` (pay-per-view $1–5/1k rotulado estimativa, tabela vs ad-share, CTA free `utm_source=clipping-page`, sitemap 0.9) + claim "highest rate we know of in this niche (40%)" na /partners (`7b957c0`) | Cadastros utm_source=clipping-page; applies de afiliado | 10/08 |

## Mortas (não repetir)

| Data | Ideia | Por que morreu |
|---|---|---|
| 31/07 | TAAFT rota grátis de ferramentas (tally) | Formulário fechado pela plataforma |
| 31/07 | aitools.fyi / ToolsFine como diretórios grátis | Viraram pagos ($37 / $10) |
| 31/07 | LaunchingNext | Parede anti-bot infinita |
| 30/07 | "Teto de 3/24h explica o gap de 44%" (hipótese) | Dado derrubou: 0 ocorrências em 30d |

## Fila (avaliadas, ainda não executadas — livres para uma sprint pegar)

- Fazier free (falta: 3 comentários úteis + badge no rodapé do site — sessão logada)
- aitoolsdirectory (rascunho salvo no iframe; renderer bugado — retentar)
- Wall of proof PÚBLICO na landing/examples alimentado por `posted_shorts` (a ponte já coleta; falta a vitrine)
- 2º/3º canal no Autopilot como outdoor (finance/history — RPMs altos)
- Registrar cineo.com (13 impressões/mês do typo > "kineo ai") — custa dinheiro, gate
- Badge "Made with Kineo" clicável no end-card do vídeo free (hoje é só texto)
