# Decisão — régua de silêncio proporcional ao filme (23/09/2026)

**Aprovada pelo fundador em 23/09/2026, à noite:** "concordo com a régua nova".

## O que mudou
- **Silêncio TOTAL do filme:** era 8 s fixos. Passa a ser **8 s a cada 60 s de filme**, nunca menos de 8.
  Um filme de 60 s continua com 8 s; um de 110 s tem 14,7 s.
- **Silêncio POR CENA:** continua **1,5 s**. Esse é o limite que pega cena muda de verdade.
- A proporção é aplicada na rota (`reguaDoFilme` em `app/api/generate-video-cinematic/route.ts`).
  `lib/cinematic/timelineContract.ts` ficou intocada (trava 8.2).

## Por quê
O render H3 do fundador (roteiro pronto de 228 palavras, 60 s, "Use my script as is") foi recusado duas vezes.
As cenas têm segundos inteiros, então cada uma carrega em média ~0,5 s de respiro. Um roteiro de ~220 palavras vira
um filme de ~110 s em ~16 cenas e soma 9-10 s de respiro, sem nenhuma cena muda. O teto fixo de 8 s,
desenhado para filmes de 60 s com ~8 cenas, recusava exatamente os roteiros mais longos que os clientes colam.

## Junto, no mesmo dia (commits d880382e, eae48f7c/2d6d7940, fdaa246c)
- A cena dividida na fronteira de frase recebe os segundos da própria fala (antes ficava com os 12 s do teto).
- A frase curta presa numa cena de 4 s junta-se à vizinha, ou empresta dela uma frase inteira, ou em último caso palavras.
  Mesmas palavras, mesma ordem.
- Em verbatim, a cauda nunca mais ganha texto da IA: o ensaio da cratera tinha saído com "It spans 3.4 kilometers" inventado.
- A tela de recusa diz quantas palavras faltam, e "Edit my idea" volta ao /studio em vez de travar.

## Prova
- Fuzz de 500 roteiros prontos sobre a fatia real da rota: **315/500 → 500/500**, texto do autor intacto em 500/500.
  O fuzz ficou permanente, com 300 roteiros, em `scripts/test-h3-verbatim-corte-2026-09-23.mjs`.
- Ensaios `dry_run` ($0) em produção no deploy fdaa246c: **12/12** (B-24 228 palavras, cratera 213, frases curtas 140).
- Continua barrando: cena de diálogo muda sem conserto possível → 422 com estorno. Um filme de 60 s com mais de 8 s de
  silêncio total → apara ou 422.

## Como reverter
Em `reguaDoFilme`, trocar `Math.max(1, filme / 60)` por `1`.
