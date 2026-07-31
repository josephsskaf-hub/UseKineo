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
| 31/07 | Post build-in-public r/YouTubeCreators | Texto pronto (`REDDIT-POST-PRONTO.md`) — **falta o fundador postar** | Cadastros utm/referral reddit | após postar |
| 31/07 | **Ponte pós-download "postou? cola o link"** (da fila; sprint 10h) | Tabela `posted_shorts` (migration aplicada), `POST /api/posted-shorts`, card na tela de sucesso, upload direto gravando sozinho (`cf13d17`) — 1ª métrica de Shorts POSTADOS | Linhas em `posted_shorts` + evento `posted_short_submitted` | 07/08 |
| 31/07 | Revive do TAAFT ask (otimização, não ideia nova): flag por ação, gate 1º render, copy com motivo, botão primário (`99fa4e2`) | No ar após 8-PUSH — antes: 11 shows, **0 cliques na vida** | `taaft_review_ask_clicked` > 0 e reviews (baseline 2) | 07/08 |

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
