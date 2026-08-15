# PREÇOS, RENDER E MOTORES — decisão pronta pra volta do fundador (15/08)
> Preços fal pesquisados 15/08 (validar no dashboard fal antes de ligar — task 1 da execução).

## 1. Custo real por segundo (fal, medido/pesquisado)
| Motor | Slug | $/s | Obs |
|---|---|---|---|
| Veo 3.1 Fast | fal-ai/veo3.1/fast | $0.10 silencioso (720p E 1080p — MESMO preço; 4K que é caro) | **1080p de graça!** |
| Veo 3.1 full | fal-ai/veo3.1 | $0.20/s | 2× melhor visual; upgrade Studio |
| Seedance 1.5 Pro | atual | ~$0.016-0.05/s 720p (~$0.13/clip) | 1080p ≈ 2× |
| Seedance 2.0 fast | confirmar slug | ~$0.022/s | upgrade quase gratis do 1.5 |
| Kling 2.5 Turbo | atual | $0.07/s | HD nativo |
| Kling 3.0 turbo | fal kling 3 | $0.14/s 1080p ($0.112 720) | expor como motor avulso |
| Wan 2.6 / 2.7 | fal | $0.05 / $0.10/s | tier barato novo |
| Hailuo 2.3 Pro | fal | ~$0.49/vídeo | custo fixo, ótimo |
| Sora 2 | fal-ai/sora-2 | ~$0.10/s 720p | retestar bloqueio |

## 2. Economia por render (45s ≈ 5 cenas × 8s = 40s de clipe)
Valor do crédito: Creator $24.90/240cr = **$0.104/cr** · Starter intro $4.90/25 = $0.196/cr
| Motor | Custo/render 720p | Créditos hoje | Receita (Creator) | Margem hoje | 1080p custo | Créditos proposto 1080p |
|---|---|---|---|---|---|---|
| Seedance 1.5 | ~$0.65 | 20 | $2.08 | ~69% | ~$1.30 | **30** (margem 58%) |
| Veo 3.1 Fast | ~$4.00 | 90 | $9.36 | ~57% | ~$4.00 (igual!) | **90 — 1080p SEM aumento** |
| Kling 2.5 | ~$2.80 | 50 | $5.20 | ~46% | nativo | — |
| Kling 3 (Hollywood) | ~$8-11 | 150 | $15.60 | ~35-49% | nativo | — |
| Wan 2.6 (novo) | ~$2.00 | — | — | — | — | **28** (margem 55%) |
| Hailuo 2.3 (novo) | ~$2.45 (5 clipes) | — | — | — | — | **35** |

## 3. Dificuldade de cada adição (dias, não semanas)
- Veo 1080p: **trivial** (trocar string) e provavelmente SEM custo extra → fazer primeiro
- Seedance 2.0: fácil (trocar slug + validar params) — 0.5 dia
- Kling 3 avulso: já integrado (Hollywood) — expor na UI, 0.5 dia
- Wan 2.6 + Hailuo: 1 dia cada (novo case no buildFalInput + custo + poll)
- Sora 2: código pronto; retestar conta/bloqueio — 0.5 dia
- Duração 15s: fácil (whitelist + 2 cenas) — 0.5 dia
- Seletor 720/1080 ponta a ponta: 1 dia (param + engineCost hd)

## 4. Quanto mudar de preço (proposta fechada)
- **Não mexer**: Fast grátis/1cr, Kling 2.5 (50), Kling 3 (150), preços dos planos
- **Veo 3.1**: 1080p vira PADRÃO sem subir créditos (fal cobra igual) — marketing puro: "Full HD agora em todos os Veo"
- **Seedance**: 720p segue 20cr; **1080p = 30cr** (upsell no gerador: "+10cr Full HD")
- **60s**: passa a 1.4× créditos do motor (hoje 60s custa igual 45s = margem furada). 15s = 0.6×.
- Novos: Wan 2.6 = 28cr ("Cinema Lite"), Hailuo = 35cr, Seedance 2.0 substitui o 1.5 no MESMO preço (20/30) — upgrade de valor percebido gratuito

## 5. Estratégias pra ganhar MAIS (ordem de impacto)
1. **Upsell 1080p por render** (+10cr Seedance): margem incremental ~100% sobre o custo extra; botão no gerador
2. **60s cobrando 1.4×**: para de subsidiar os vídeos longos (hoje 60s = prejuízo relativo)
3. **Seedance 2.0 "novo motor" como EVENTO de marketing** (é troca de slug): e-mail pra base + banner — Higgsfield fez isso com 2.5 e viralizou
4. **Modo Cinema image-first** (Onda 2 do relatório): âncora de imagem + i2v = qualidade Higgsfield; vira o motivo de assinar Studio
5. **Pacote "Engine Sampler"**: 1 render em cada motor premium por ~90cr (custo ~$1.8, receita $9.36) — vende a comparação, engancha no favorito
6. **Presets de câmera** como feature Studio-only (dolly/crash zoom/orbit — strings de prompt validadas, custo zero)
7. **Fim de semana Seedance ilimitado** (custo $0.13/clip controlável com cap diário) — máquina de signups estilo Higgsfield
