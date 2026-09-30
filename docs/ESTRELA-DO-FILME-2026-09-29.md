# Estrela do filme — 29/09/2026 (entrega 4, trava 8.2 com "vai" do fundador)

Pedido: o filme do amigo como Aquiles na guerra de Troia, com o rosto dele em toda cena com protagonista.

## Como funciona
- /studio: bloco "Estrela do filme (opcional)" — 1 a 3 fotos do rosto, caixa obrigatória de autorização, mesma rota de
  upload da foto de referência do /images (`/api/images/reference`: moderada, pasta da conta, só o caminho volta).
- Servidor (`/api/generate-video-cinematic`): antes do custo/claim/débito confere interruptor, motor, autorização, dono das
  fotos e assina as URLs (15 min). O still de cada cena COM protagonista sai do `fal-ai/nano-banana-pro/edit` (fotos + prompt
  da cena + ficha de figurino + "The protagonist is the person in the reference photo(s): keep the exact face and identity.");
  cena sem gente segue o still FLUX de hoje. Still que falha/é barrado na moderação de saída = still de hoje.
- Régua: `lib/estrelaDoFilme.ts` (pura). Servidor: `lib/estrelaServer.ts`. Guardião: `scripts/test-estrela-do-filme-2026-09-29.mjs`.
  Prova de $0: `node scripts/prova-estrela-aquiles-2026-09-29.mjs`. O ensaio `dry_run` também devolve `estrela.cenas`.

## Motores
- COM estrela: Seedance 1.5, Kling 2.5, Veo 3.1 (estrada clássica) · Kling 3, MiniMax H3, Omni Flash (estrada hollywood).
- SEM (recusa antes do débito): Kineo 1 (footage de banco), Sora (só t2v), Seedance 2.5 (cena com pessoa vai em t2v —
  o fornecedor recusou still de rosto), Avatar (fluxo próprio).

## Preço — PROPOSTA (decisão do fundador; interruptor `ESTRELA_PUBLIC=false` até lá)
Regra: +5 cr a cada 6 s de filme (≈ uma cena; 5 cr = o preço do Nano Banana Pro no /images), calculada antes do débito e
somada ao preço mostrado no /studio. Mesma sobretaxa em todos os motores com âncora.

| Duração | Sobretaxa | Stills típicos (US$ 0,15 cada) |
|---|---|---|
| 15 s | +15 cr | 3 → US$ 0,45 |
| 30 s | +25 cr | 5-6 → US$ 0,90 |
| 35 s | +30 cr | 5-7 → US$ 1,05 |
| 60 s | +50 cr | 9-14 → US$ 2,10 |
| 90 s | +75 cr | 12-20 → US$ 3,00 |

## Pendências
- Virar `ESTRELA_PUBLIC=true` só depois do canário aprovado.
- Canário sugerido: Kling 2.5 · 35 s · "Use my script as is" (roteiro Aquiles da prova) — 35 cr do motor + 30 cr da estrela = 65 cr.

Peso da sobretaxa a 35 s: Seedance 1.5 15→45 cr (3×) · H3 27→57 · Kling 2.5 35→65 · Veo 3.1 59→89 · Kling 3/Omni 88→118.
