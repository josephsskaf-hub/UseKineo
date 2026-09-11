# DECISÃO — A voz nossa na boca do avatar (11/09/2026)

Ordem do fundador (11/09, manhã): "a gente vai colocar a voz na boca do avatar,
pra ficar bom". Contexto: os motores caros (Kling 3, MiniMax H3, Omni Flash)
saíam com personagem que não falava ou falava com voz que mudava por cena; o
Seedance 1.5, com a nossa narradora em toda cena, era o melhor filme da casa.

## O que muda

- **Cenas de diálogo** (personagem falando na câmera) saem com a **nossa voz**
  (tts-1-hd) sincronizada nos lábios pelo Kling AI Avatar v2 sobre o retrato
  âncora do personagem. O motor deixa de inventar voz por cena; a cena deixa
  de sair muda. Caminho "host" de 13/07, religado por padrão.
- **A voz vem da ficha do personagem** (`lib/hollywood/characterVoice.ts`,
  puro): gênero e faixa de idade da `characterSheet` do planner decidem a voz
  (homem → onyx/echo, mulher → nova/shimmer, idoso mais lento, criança mais
  clara). Ficha sem gênero → persona de sempre (nunca inventa). Foi a falta
  disso que desligou o lipsync em 16/08 (homem com voz feminina).
- **Uma voz para o filme inteiro**: a voz escolhida viaja no claim assinado
  (`host_voice`) e o compose narra o b-roll com a mesma voz, em vez de
  re-resolver por palavras-chave do roteiro.
- **Interruptor de emergência**: `KINEO_HOLLYWOOD_HOST_TTS=off` na Vercel
  desliga (qualquer outro valor, inclusive ausente, = ligado).
- Voz nativa do motor fica só como fallback quando o lipsync falha no envio
  (log `falling back to O3 native audio`) — a medir; se aparecer, vira
  narração por fora.

## Custo e margem

Cena host roda no Kling AI Avatar v2 (US$ 0,0562/s) em vez do Kling 3
(US$ 0,168/s): a cena falada fica **~3× mais barata**. Créditos do cliente não
mudam (150).

## O que NÃO muda

Seedance/Veo/Kling 2.5 (caminho clássico) seguem iguais. Preços, créditos,
contratos de duração/fala/música do Codex (11/09) intactos: a cena host passa
pela mesma verificação por ASR (nosso áudio contra a fala pedida).

## Prova

- Guardião `scripts/test-voz-na-boca-2026-09-11.mjs` (39): a lib executada com
  6 fichas reais, a rota (flag padrão, ficha → voz, `host_voice` no claim, seconds
  = áudio real), o compose (claim primeiro), e o hostVoice (ficha manda).
- `test-cinematic-speech-2026-09-11` (125) segue verde com o escopo do claim.
- **Pendente:** canário audiovisual pago (Kling 3, 150 créditos) com roteiro de
  personagem; assistir e medir: voz igual em todas as cenas, lábios, legenda,
  duração. Só depois chamar de validado.
