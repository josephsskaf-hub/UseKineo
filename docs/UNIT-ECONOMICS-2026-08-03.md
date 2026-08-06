# FASE 0 — UNIT ECONOMICS (medido, não estimado) — 03/08/2026

## 0.2 — QUAL MOTOR ESTÁ PLUGADO (decide tudo)
**Seedance 1.5 Pro** (`fal-ai/bytedance/seedance/v1.5/pro/text-to-video`) — NÃO é 1.0 Lite
nem 2.0. Cobrança do fal é **POR TOKEN**: net rate **$1,20 / 1M tokens** (dashboard fal,
ciclo atual: 12,41M tokens = $14,90).
→ **O cenário catastrófico da tua análise (Seedance 2.0 a ~$13,65/vídeo) NÃO é o nosso caso.**
Medido: 12,41M tokens ÷ 68 clipes = 182k tokens/clipe de 5s = **$0,219 por clipe de 5s**.
Outros modelos no código (Kling v3/v2.5, Veo 3.1 fast, Sora-2, OmniHuman, VEED): **$0 de
consumo real** — nunca foram chamados por usuário externo (ver 0.5).

## 0.1 — CUSTO REAL POR VÍDEO FINAL ENTREGUE
Fonte: fatura fal (ciclo 01–03/08, $14,90) + Creatomate Growth ($129/10.000 cr ≈ $0,0129/cr,
~5,7 cr por Short de 45s) + OpenAI (script gpt-4o-mini + TTS-1-HD + Whisper).

| Tipo de vídeo entregue | fal | Creatomate | OpenAI | **TOTAL** |
|---|---:|---:|---:|---:|
| Fast — 1º vídeo de free (com AI hook Seedance) | $0,219 | $0,074 | $0,027 | **~$0,32** |
| Fast — demais vídeos (stock + TTS) | $0 | $0,074 | $0,027 | **~$0,10** |
| AI Gen (Seedance, 45s ≈ 9 clipes) — *não usado por externo* | ~$1,97 | $0,074 | $0,027 | **~$2,07** |
| Hollywood (150 cr) — *nunca usado por externo* | ~$8,90–10,20 (constantes do código) | — | — | **~$9–10** |
| AI Presenter / Avatar — *nunca usado por externo* | $0,0562–0,16/s (código) | — | — | **~$2,5–9,6** |

**ONDE O DINHEIRO ESTÁ INDO HOJE: 100% do gasto no fal é o AI HOOK do 1º vídeo de usuário
FREE** (`lib/fastAiHook.ts`, disparado só em 1º vídeo + free tier). Correlação perfeita:
01/08: 41 primeiros vídeos → $10,32 · 02/08: 24 → ~$3,5 · 03/08: 3 → ~$0,5.

## 0.3 — TAXA DE REROLL: **NÃO MENSURÁVEL HOJE** (lacuna real)
`videos` só persiste linha quando status='completed' (não-completados = 0 em 30d) e o evento
`generation_started` **não existe** no schema atual. Sem isso não há denominador.
→ Vira dependência da seção INSTRUMENTAÇÃO; não usar número inventado enquanto isso.

## 0.4 — HOLLYWOOD E PRESENTER
Constantes já no código: Hollywood ~$8,90–10,20/render (150 cr) · Avatar ~$9,60 (110 cr) ·
Presenter $0,0562/s · Presenter Pro $0,115/s · VEED 720p $0,15/s · OmniHuman $0,16/s ·
Kling 3 I2V $0,168/s. **Consumo externo real em 60 dias: ZERO.** O risco do Creator (Hollywood
incluído todo mês) é REAL no papel, mas ainda 100% teórico — ninguém chegou lá.

## 0.5 — CONSUMO REAL POR MOTOR, 60 DIAS, EXCLUINDO CONTAS INTERNAS
| Motor | Renders | Pessoas |
|---|---:|---:|
| **fast** | **181** | **123** |
| cinematic_ai / presenter / avatar / hollywood / veo | **0** | **0** |
(Os 9 cinematic_ai, 2 presenter, 1 avatar, 1 hollywood, 1 veo dos últimos 60d são TODOS da
conta interna do fundador.)

## MARGEM DE PIOR CASO POR PLANO (custo real medido, não o estimado do código)
Pior caso = usuário queima 100% dos créditos no motor mais caro que o plano libera.
Seedance real = ~$2,07/vídeo (20 cr) → **$0,104/crédito** (o código assumia $0,117 — conservador).

| Plano | Preço hoje | Líq. Stripe | Créditos | Pior caso COGS | **Margem pior caso** |
|---|---:|---:|---:|---:|---:|
| Starter | $9,90 | $9,31 | 25 | 1 Seedance + 5 Fast ≈ $2,57 | **+$6,74 (72%)** |
| Creator | $18,00* | $17,18 | 150 | 7 Seedance + 10 Fast ≈ $15,49 | **+$1,69 (10%)** |
| Creator c/ Hollywood | $18,00* | $17,18 | 150 | 1 Hollywood ≈ $9–10 | **+$7–8 (44%)** |
| Studio | $35,00* | $33,69 | 200 | 10 Seedance ≈ $20,70 | **+$12,99 (39%)** |
| Autopilot | $278* | $269,6 | 400 | 20 Seedance ≈ $41,40 | **+$228 (85%)** |
| Pack $4,90 | $4,90 | $4,46 | 30 | 1 Seedance + 10 Fast ≈ $3,07 | **+$1,39 (31%)** |
*preços USD aproximados da conversão atual.

**NENHUM PLANO OPERA COM MARGEM NEGATIVA.** O pior é o Creator no cenário "queimar tudo em
Seedance" (10%) — exatamente o plano que tua Fase 1 já manda subir mais. Diagnóstico
confirmado pelo dado, por motivo diferente do suposto.

## 🔴 RISCO URGENTE DESCOBERTO (fora do escopo pedido, mas bloqueante)
**Saldo fal: $38,33 · auto-reload ON confirmado 06/08 (saldo $41,97, $20→+$40 cartao 8677) — NAO projetar apagao.**
Sem auto-reload configurado = 3º apagão de fornecedor em 4 dias, e desta vez mata o AI hook
(o "wow" do 1º vídeo de todo free). Ação: recarregar/ativar auto-reload no fal.

## RESPOSTA AO ITEM 2.4 (antes de cortar o free)
**216 usuários free geraram vídeo nos últimos 30 dias.** Distribuição (30d, externos):
| Vídeos no mês | Usuários |
|---|---:|
| 1 | 169 (78%) |
| 2 | 31 (14%) |
| 3 | 10 (5%) |
| 4–7 | **7 (3,2%)** |
| 8+ | **0** |
Média 1,38 vídeo/pessoa. **Máximo absoluto no mês inteiro: 7 vídeos.**
→ O teto teórico de 90/mês NUNCA foi exercido por ninguém. Cortar para 3/mês afeta **7
pessoas (3,2%)**; o custo do free NÃO é abuso de cota, é o **AI hook do 1º vídeo** ($0,32
por signup que gera). O free não canibaliza o Starter na prática — canibaliza no MARKETING
(a promessa "3 por dia" tira a urgência de pagar), que é um problema de COPY, não de cota.
