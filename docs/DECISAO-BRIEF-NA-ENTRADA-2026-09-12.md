# DECISÃO — Briefing na entrada: aviso honesto agora, construir depois (12/09/2026)

Fundador (17:40): "faz o que você acha melhor" sobre a demanda "desenho infantil
com dois personagens fixos e duas vozes" (relatório das 12 h, fichas 6-10: uma
pessoa, duas contas, cinco tentativas, um checkout, zero filme utilizável).

## O que eu acho melhor, e por quê

Construir duas vozes + personagem fixo é produto novo (Seedance com âncora de
personagem, TTS por fala, compose com faixas alternadas) — dias, não horas, e
sem prova de demanda além de uma pessoa. O que sangra hoje é outra coisa: a
pessoa gasta 25 dos 30 créditos sem saber que o produto não faz aquilo. Então:

1. **Aviso honesto na entrada, sem bloquear e sem trocar o modo** (o mesmo
   aviso de colagem que já existe ganha a forma `brief` / `brief_two_voices`):
   "isto é um briefing; a Kineo escreve a história a partir dele e narra com
   UMA voz; personagem de design fixo só no Seedance 1.5 — escolha antes de
   gerar; quer as palavras exatas, cole a narração". Impressões medidas pelo
   evento de sempre (`activation_instruction_notice_viewed`, `paste_shape`).
2. **Brief nunca auto-inicia** (`looksLikeInstruction` passa a reconhecer
   brief): quem cola ficha + instruções ganha a caixa aberta e o aviso, não um
   render automático de 25 créditos.
3. **O servidor já faz o certo** (leva anterior): brief com "as is" vira modo
   IA; ficha e instrução nunca são narradas; história infantil em PT avisa o
   motor (Kineo 1 → Seedance).
4. **Construir quando a demanda repetir**: se `paste_shape=brief_two_voices`
   passar de 5 pessoas distintas em 14 dias, abre-se o projeto "dois
   personagens, duas vozes" (Seedance + âncora + TTS por fala). Até lá, não.

## Implementação

- `lib/growth/instructionPasteNotice.ts`: formas `brief` e `brief_two_voices`
  com copy honesta; classificador puro (o arquivo continua sem import, como o
  guardião exige).
- `lib/momentumTopic.ts`: `looksLikeInstruction` reconhece brief.
- Detector `looksLikeBriefLite` espelhado nos dois arquivos puros, byte a byte
  (guardião compara); a verdade completa segue em `lib/scriptParser.ts`.
- Tela intocada: o GenerateClient já mostra `instructionPasteNoticeFor(shape)`.

## Vermelhos herdados conferidos na main pristina

`test-marcador-da-casa` (import de `.ts` sem extensão — ambiente),
`test-coerencia-historia-2026-09-02` (2: duration na URL, onboarding/credits).
