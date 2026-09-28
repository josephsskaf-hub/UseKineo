# Canário do anúncio v2 — 29/09/2026 (madrugada, BRT)

Três anúncios reais na conta interna do fundador, pelo navegador dele, com o restaurante fictício de teste "Brasa" (3 fotos verticais recortadas do kit C:/kineo-teste-anuncio + logo). Todos passaram pelo ensaio grátis (dry_run) antes do pago.

| Nível | Pedido | Créditos | Planos | Motor | Resultado | Som |
|---|---|---|---|---|---|---|
| Comercial | 6dc2b61d | 41 | 6 (3 fotos + 3 cenas criadas) | Kling O3 3 s + Nano Banana Pro | entregue em ~6 min, 15 s, 1080×1920 | mudo do s 8 ao 14 |
| Cinema | bdba9af5 | 51 | 7 (2 closes + 4 cenas + 1 lugar) | Seedance 2.0 Fast 4 s + Kling O3 + Nano Banana Pro | entregue, 16,5 s | sem música nenhuma |
| Foto em movimento | c7860f5d | 34 | 6 (as 3 fotos, 2 movimentos cada) | Kling O3 3 s | entregue, 15 s | música do começo ao fim, voz até ~7 s |

Todos os 19 planos saíram na 1ª tentativa, sem 503, recusa ou refação. Débito único por pedido, sem estorno, `videos.quality_mode='ads_v2'` e `render_id = billing_ref`. Custo de fornecedor aproximado: US$ 2,69 + 4,62 + 2,02 (planos) + montagem e voz.

## Os dois defeitos de som (consertados e provados)

1. **Faixa com introdução muda.** O Lyria não respondeu nos 3 pedidos (sem linha `[lyria]` no log; investigar à parte) e a reserva da biblioteca sorteou `emotional-11.mp3`, que tem 14 s de silêncio digital na abertura. Conserto: `lib/ads/v2Music.ts` com o início medido (ffmpeg silencedetect, -40 dB, janela de 32 s) das 59 faixas; `emotional-08` fica fora. Commit 9d200dd0.
2. **`loop` + `trim_start` no áudio do Creatomate.** A doc do Creatomate proíbe os dois juntos; o Cinema saiu sem música nenhuma, sem erro. Conserto: início > 0 vai só com `trim_start`; início 0 só com `loop`. Commit 2955b829. Provado no Foto em movimento: RMS por segundo sem nenhum -inf depois do s 0,4.

A música agora fica em 25% sob a voz e sobe a 70% quando a voz acaba.

## O que a leitura dos quadros mostrou

- As fotos reais ganharam movimento sem deformar o prato; as frases ficam no terço do meio; o cartão final mostra o logo real e "Visit us".
- Cinema: os 2 closes do Seedance 2.0 são os planos mais bonitos (vapor, brilho). Uma das 4 cenas criadas saiu numa sala diferente (luz de dia, mesa rústica), o que quebra a continuidade. Próxima melhoria: imagem mestra que prende gente e lugar antes de animar (parecer do cético, docs/RECEITA-ANUNCIO-V2-2026-09-28.md).
- Nada de texto passou por IA (não havia foto marcada "Screen or text" neste teste).

## Outros achados

- Subir fotos NÃO apaga o nome, a frase nem o tipo já digitados (testado explicitamente no 3º pedido).
- A tela mostra quanto falta quando o saldo não cobre um nível ("You need 6 more credits").
- O Lyria não gerou música em nenhum dos 3 pedidos: a biblioteca está segurando todos os anúncios. Investigar no próximo ciclo (pode afetar os filmes também).
