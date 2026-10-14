# Plano de validação paga — Ads fiel ao produto + prazo de ~8 min (KINEO-ADS-FIEL-1510, 15/10/2026)

**Nada disto foi rodado.** Render pago só com o "vai" do fundador. O código está atrás do interruptor
`ADS_V2_PRODUCT_LOCK_MODE = 'internal'` (lib/ads/v2ShotLists.ts): depois da publicação, a trava do produto só liga para a lista
EXATA de contas da casa (`isAdsInternalEmail`). Cliente segue no caminho de antes até virar `'all'`.
O prazo (foto parada, reserva rápida, ator em 10 min) e o aviso dos estilos valem para todos desde a publicação.

## O que mudou (resumo)
1. **Trava do produto** (cena criada do Comercial/Premium em pedido de produto ou setor loja/outro; o ator; a "pessoa segurando",
   que segue desligada): recorte `fal-ai/birefnet/v2` UMA vez por foto (cache no bucket) → esboço (recorte real sobre cinza, no
   formato) como 1ª referência do Nano Banana, saída PNG → o recorte REAL é colado de novo no MESMO retângulo → o Kling O3 anima
   um quadro que já tem o produto verdadeiro. Qualquer falha = o plano anima a FOTO REAL do produto (no ator, o caminho de antes).
2. **Prazo**: tentativa aceita vira "presa" em 3,5 min (vídeo) / 2,5 min (imagem) — era 20; a régua de antes só enquanto couber
   em 6,5 min desde o início; vídeo preso vai direto à reserva H3 se couber; senão a vaga vira a foto real parada com zoom (sem fal,
   sem cobrar), até 2 por pedido; passados 6,5 min, os atrasados viram foto parada se TODOS couberem no teto. Ator desiste em 10 min.
   Evento `ads_v2_shot_fallback` em toda troca de caminho; `ads_v2_product_locked` em todo quadro travado.
3. **Estilos com efeito** (PixVerse): mantidos; o aviso "reinterpretam o produto — a foto real fecha o anúncio" (16 línguas) no fim
   da linha de baixo da escolha de estilo. O packshot (foto real) e o cartão final (foto real) seguem em todo anúncio de produto.

## Custo por anúncio (créditos IGUAIS — adsV2Credits não mudou)
| Item | Antes | Agora |
|---|---|---|
| Recorte birefnet | — | fal lista US$ 0/seg de computação (15/10); teto conservador US$ 0,01 por FOTO (cache: 1 vez por foto) |
| Nano Banana (PNG em vez de JPEG) | US$ 0,15/cena | US$ 0,15/cena (formato não muda preço) |
| Esboço + colagem | — | CPU da Vercel (~0,5 s por cena), sem fornecedor |
| Armazenamento | — | ~3–5 MB por cena (PNG travado + esboço) ≈ US$ 0,0003/anúncio |
| Foto parada (prazo) | — | economiza a 2ª/3ª tentativa na fal |
| Recorte que falha | — | economiza o Nano Banana daquela cena (US$ 0,15) |
**Extra por anúncio: US$ 0,00 a 0,01.**

## Renders de validação (conta da casa — marca d'água forçada, ok para validar)
| # | Pedido | Créditos | fal (estimado) | O que olhar |
|---|---|---|---|---|
| 1 | Perfume da QA (frasco Atheeri), **Comercial 15 s 9:16**, cena "hotel com chuva" | 41 | ~US$ 2,39 | 3 cenas com `ads_v2_product_locked`; frasco idêntico à foto (proporção, cor do líquido, tampa, rótulo) no 1º quadro E ao longo dos 3 s; sem "fantasma" do frasco redesenhado em volta do colado |
| 2 | Mesmo perfume, **Premium 15 s 1:1** | 51 | ~US$ 4,13 | idem + herói Seedance (foto do cliente) intocado; quadro 1080×1080 |
| 3 | Outro produto (pote/caixa com texto no rótulo), **Comercial 15 s 4:5** | 41 | ~US$ 2,39 | texto do rótulo legível e igual em todas as cenas; produto no lugar certo no 4:5 |
| 4 | Perfume, **Foto em movimento + ator** (apresentador escolhido) | 34 | ~US$ 2,93 | o frasco na mão do ator é o real durante a fala; rosto e boca naturais; ator sai em < 10 min |
| 5 | Perfume, **Foto em movimento + estilo giant_product** | 34 | ~US$ 1,80 | o aviso aparece na escolha de estilo; o anúncio fecha com o packshot (foto real) + cartão com a foto real |
**Total: 201 créditos da casa, ~US$ 13,64 de fal** (cabe no teto de US$ 25/semana da casa — ler o saldo da fal antes).

Para cada render: dry-run $0 antes (regra da casa), cronômetro `delivered_at - started_at` (meta ≤ 8 min), 1 débito só
(`credit_debits` com o `billing_ref` do pedido, `refunded_at` nulo).

### Critério de aprovação (para virar `'all'`)
- produto pixel a pixel igual à foto no 1º quadro de toda cena travada (o PNG `-lock.png` no bucket) e sem deformação visível no clipe;
- nenhum contorno duplicado (frasco redesenhado aparecendo atrás/ao lado do colado); se aparecer: apertar a linha do esboço ou a caixa
  (`ADS_V2_PRODUCT_LOCK_BOX`) e repetir SÓ o render 1;
- aparência "recortado e colado" aceitável para o fundador (a luz do produto é a da foto do cliente, não a da cena);
- 5/5 entregues, ≤ 8 min cada (o 4, com ator, ≤ 11 min).

## Prazo — como observar em produção (sem render pago)
```sql
-- trocas de caminho desde a publicação (preencher o marco)
select metadata->>'to' as para, count(*) from events
where name = 'ads_v2_shot_fallback' and created_at > '<marco da publicação>'::timestamptz group by 1 order by 2 desc;
-- duração dos anúncios entregues desde a publicação
select percentile_cont(0.5) within group (order by extract(epoch from delivered_at - started_at)) / 60 as p50_min,
       percentile_cont(0.95) within group (order by extract(epoch from delivered_at - started_at)) / 60 as p95_min, count(*)
from ads_v2_orders where status = 'delivered' and started_at > '<marco da publicação>'::timestamptz;
```
Alarme: `to = 'still'` em mais de 1 de cada 10 anúncios = fornecedor doente (ver `previous_reason`).

## Virada
Aprovado o render 1–5: `ADS_V2_PRODUCT_LOCK_MODE = 'all'` (uma linha, lib/ads/v2ShotLists.ts) + rodar
`node scripts/test-ads-fiel-1510.mjs` (o S1 confere o modo e precisa ser reancorado junto).
