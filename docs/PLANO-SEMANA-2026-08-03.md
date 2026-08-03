# PLANO DA SEMANA — 10 MEDIDAS (03/08). Ordem = retorno ÷ esforço, com o funil medido.

## FUNIL REAL, 14 DIAS (externos, medido 03/08)
| Etapa | Pessoas | Perda |
|---|---:|---:|
| Cadastros | 197 | — |
| Geraram 1º vídeo | 102 (51,8%) | **−95** |
| Baixaram | 31 (30% dos que geraram) | **−71** |
| Abriram checkout | 16 (52% dos que baixaram ⭐) | −15 |
| Pagaram | ~1 | **−15 (94%)** |

**Mediana cadastro → 1º vídeo: 4,2 min** (92 de 102 em <10 min). A hipótese dos
"37 min de fricção" está MORTA — o fluxo é rápido; o problema não é velocidade.
**Download → checkout é 52%** — excelente, o desejo existe. O gargalo mudou de lugar:
**checkout → pago (6%, mercado 30-50%)** e **gerar → baixar (30%)**.

---

## AS 10 MEDIDAS

### BLOCO A — O ÚLTIMO METRO — ✅ EXECUTADO em 03/08 (mesma noite)
**Autópsia (medida 1) DERRUBOU o mito do decline:** dos 19 payments "failed" da conta,
13 eram testes internos de maio ("moeda não aceita"/CVC, cartão •1375), 3 eram o abhijeet
(INR, que depois COMPROU), 1 victoriaskaf (família), 1 o fundador. **ZERO declines de
clientes externos desconhecidos.** Quem não paga DESISTE sem digitar cartão.
**Remédios shipados (commit da noite):**
- custom_text no checkout do Stripe: "7-day money-back guarantee. Cancel anytime..." —
  reversão de risco no pixel exato da hesitação (única superfície da jornada sem ela)
- /checkout/cancelled: garantia visível + survey de 1 clique "what stopped you?"
  (price / just looking / had questions) → evento checkout_cancel_reason. SPRINTS:
  reportar a distribuição diariamente — é o novo radar do maior buraco do funil.
- PayPal (medida 2): REBAIXADA — sem declines reais, sem urgência. Reavaliar se o survey
  apontar pagamento como motivo.

### (original) BLOCO A — O ÚLTIMO METRO (15 pessoas perdidas com cartão na mão)
**1. Autópsia de cada checkout perdido.** Stripe mostra 19 "malsucedidos" de 64 na vida
   (~40% decline bancário). Cruzar os 16 do período: país, moeda, decline code. Sem esse
   dado a gente está adivinhando. ENTREGA: tabela país × motivo no doc da sprint.
**2. PayPal visível NO checkout (não só no pricing).** As rotas app/api/paypal/* já existem
   e a flag PAYPAL_ENABLED controla a exibição. Se o decline bancário confirmar (#1),
   ligar e expor "or pay with PayPal" junto do botão — ataca direto o cartão internacional
   recusado, que é perda 100% mecânica.
**3. Recuperação de decline em tempo real.** Hoje quem leva "cartão recusado" na tela do
   Stripe some. Adicionar retorno para /checkout/cancelled com mensagem específica de
   decline + alternativa (PayPal / outro cartão) + o resgate 2-4h já no ar.

### BLOCO B — STATUS 03/08 (noite): medida 4 SHIPADA, medida 6 SPEC PRONTA
**4 ✅** `video_ready_viewed` no ar (GenerateClient): dispara no done com aba visível;
aba oculta → espera visibilitychange e marca was_hidden + seconds_to_return.
Leitura para as sprints: completed sem ready_viewed = nunca voltou (alvo da 6);
ready_viewed sem download = viu e não quis (UI/valor). Reportar a razão diariamente.
**6 → SPRINT (Regra Zero conferida: NÃO existe nada parecido nos crons):** criar
send-video-ready — e-mail único "Your video is ready 🎬" com thumbnail + link direto
para o vídeo, disparado para vídeo completed sem download em 30 min. Stamp próprio
(video_ready_sent_at ou tabela), supressão cruzada 24h, padrão dos demais crons.
ALVO: a fatia "completed sem ready_viewed" que a medida 4 agora mede.
**7 ✅ (Bloco C)** reset de senha consertado (PKCE) — commit fc10ada.

### BLOCO B — GERAR → BAIXAR (71 pessoas por 14 dias)
**4. Medir POR QUE não baixam.** Não temos evento de "viu o vídeo pronto e saiu". Instrumentar
   video_ready_viewed + tempo até download/abandono. Sem isso, tudo aqui é palpite.
**5. Autoplay do resultado + botão de download sticky no mobile.** Hipótese testável: em 380px
   o vídeo pronto e o botão verde não cabem na mesma dobra. Verificar em 380px antes de mexer.
**6. E-mail "seu vídeo está pronto" com link direto.** Quem fecha a aba durante os 2-4 min de
   render nunca mais volta. O vídeo fica em /history mas ninguém sabe. Um e-mail no evento
   de conclusão recupera essa fatia inteira. (Regra Zero: conferir se já existe algo assim.)

### BLOCO C — CADASTRO → GERAR (95 pessoas)
**7. Consertar o reset de senha.** Bug REAL visto pelo fundador em 03/08: a página fica com
   "If this page looks stuck, go back and click the reset link from your email again" e o
   botão Update Password desabilitado. Quem cai nisso não entra mais na conta — perda total,
   e nem aparece no funil de geração. PRIORIDADE DE BUG, não de otimização.
**8. Auditar o exit-intent modal ("Wait — pick your deal before you go").** O fundador achou
   poluído. Ele aparece ANTES de a pessoa ter gerado qualquer vídeo? Se sim, está vendendo
   antes de entregar — exatamente o erro que já corrigimos na tela de download.

### BLOCO D — AQUISIÇÃO (encher o topo)
**9. Product Hunt terça 04/08 + Fazier segunda.** Já agendados. A sprint prepara: monitorar
   o dia inteiro, responder TODO comentário em <1h (o algoritmo do PH premia conversa),
   e medir cadastros/hora para saber o valor real de um launch.
**10. Plano F (30 micro-influencers) sai do papel.** Lista com 5 candidatos existe em
   docs/INFLUENCERS.md; falta completar e-mails e gerar os 10 primeiros rascunhos. Oferta:
   3 meses de Creator + link de afiliado 40% (recorrente = parceiro permanente, não menção
   única). Fundador só aperta Send, máx 10/dia.

---
## REGRA DA SEMANA
Medidas 1, 4 e 7 vêm PRIMEIRO: uma é diagnóstico do maior buraco, outra é instrumentação
sem a qual o bloco B é chute, e a terceira é um bug que expulsa usuário. Otimizar sem
medir foi o erro que a hipótese dos "37 minutos" quase nos fez cometer.
