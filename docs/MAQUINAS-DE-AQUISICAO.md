# AS MÁQUINAS DE AQUISIÇÃO DO KINEO [KINEO-AQUISICAO-2026-08-14]

Inventário do que roda SOZINHO depois das 4 levas de 14/08. Cada máquina tem a
query de leitura — rodar 1x/semana e anotar no Placar.

| # | Máquina | Como funciona | KPI (query semanal) |
|---|---|---|---|
| 1 | **Loop viral /v/** | Todo vídeo pronto → e-mail com link público compartilhável; página com CTA fixo, share button, preview real no WhatsApp | `select count(*) from events where name='public_video_cta_clicked' and created_at > now()-interval '7 days'` |
| 2 | **Marca d'água → ferramenta** | usekineo.com/free → /free-ai-shorts-generator (41% de conversão) | `select count(*) from events where name='landing_session_started' and path like '/free-ai-shorts%' and created_at > now()-interval '7 days'` |
| 3 | **Blast de abandono** (cron 10:00 UTC) | Todo clique de checkout sem pagamento → e-mail $4.90 no dia seguinte (agora com os nomes novos de evento) | contar `abandon_emailed` novos na semana |
| 4 | **Hot-lead blast** (cron 13:10 UTC, segment=auto, 25/dia) | Drena burned → stalled → watermark → power → paying; 1 e-mail por pessoa NA VIDA (flag `hotlead_emailed_v1`) | `select metadata->>'segment' seg, count(*) from events where name='hotlead_emailed_v1' group by 1` |
| 5 | **SEO ferramentas** | 2 tool pages com prova viva + exit-intent + og:image; /scripts hub com exit-intent; IndexNow no cron | cliques `organic_cta_clicked` por path, 7d |
| 6 | **Referral sempre armado** | Código de referral buscado no MOUNT (Generate + History): nenhum share sai mais sem ref | `referral_attached=true` ratio nos eventos de share, 7d |
| 7 | **Afiliados** | /partners público no footer (40% recorrente) + convite por e-mail aos pagantes (segmento paying) | signups com sf_aff cookie, 7d |
| 8 | **Recuperação de checkout ao vivo** | /checkout/cancelled na marca + CheckoutResumeBanner + StalledCta | `checkout_resume_banner_clicked`, 7d |
| 9 | **Gate TAAFT** | Domingo 19h: go/no-go automático por e-mail com checklist medido | ✅ **ENCERRADA 16/08 19h — veredito NO-GO**, ver `docs/GO-NO-GO-TAAFT-347-2026-08-16.md` (reabre só com entrega ≥85% em dia de ≥25 tentativas **e** 1 pagamento TAAFT) |
| 10 | **B2B copy-paste** | docs/KIT-DISTRIBUICAO + docs/B2B-COPIA-E-COLA: 6 alvos contatados, 26 na fila | respostas na caixa do Fiverr/hello@ |

## Regras de ouro
- Nenhuma máquina de e-mail fura a supressão de 24h da régua.
- Flag idempotente antes de qualquer re-disparo.
- Pagamento/boost = SEMPRE mão do fundador.
- Toda máquina nova entra NESTA tabela com a query de leitura no dia em que nasce.

## Diretórios grátis pendentes (mão do fundador, 5 min cada)
- Fazier ✅ (feito, backlink no ar) · TAAFT ✅ (featured)
- Pendentes que aceitam listagem grátis: aitoolsdirectory.com, futurepedia.io
  (submit free), toolify.ai, altern.ai — usar o mesmo blurb do kit.
