# Amostras congeladas para a migração dos modelos da OpenAI (fase 1, 14/10/2026)

Marca: `KINEO-MIGRACAO-OPENAI-F1-1410`. Plano: `docs/MIGRACAO-MODELOS-OPENAI-2026-10-14.md`.

Estas amostras são a **linha de base** do A/B da fase 2. Elas mostram o que os clientes mandaram de verdade e o que os modelos de hoje (gpt-4o, gpt-4o-mini, tts-1-hd, whisper-1) entregaram. Nenhuma chamada paga foi feita para montá-las e nenhuma mídia foi baixada.

## Como foram tiradas

- Fonte: Supabase `cqqukkvjjrguayiyjvhh`, só `SELECT` pelo conector (MCP), em 14/10/2026.
- **Contas internas fora.** Toda linha passou por `profiles.email !~* '(josephsskaf|josephskaf|josepghsskaf|@usekineo\.com)'` e `user_id is not null`.
- **Anonimização.**
  - No SQL: e-mail → `[email]`, URL → `[url]`, `@perfil` → `[handle]`, telefone → `[phone]`.
  - À mão: nome de marca de cliente → `[marca]`, nome de canal de cliente → `[canal]`, nome que pode ser de pessoa privada → `[nome]`.
  - Ficaram figuras públicas (Julius Caesar, Verstappen, Elon Musk, Cristiano/Georgina) e personagens de ficção que o cliente inventou (Milo, Spark, Leon).
  - Nenhum `user_id`, `video_id`, `render_id` ou e-mail foi copiado. Onde é útil reencontrar o vídeo, o campo `ref` guarda os 12 primeiros hex de `md5(video_id)`. Só quem tem acesso ao banco consegue voltar do `ref` ao vídeo.
- **Varredura de vazamento.** Os 5 JSON passam numa busca por e-mail, URL, UUID, telefone, e-mails internos e pelos nomes anonimizados. Resultado: zero ocorrências.
- **Escolha determinística.** Dentro de cada grupo (motor × duração × idioma), as linhas foram ordenadas por `md5(texto || sal)` e pegas as N primeiras. Textos repetidos foram eliminados por `md5`. Rodar a mesma consulta no mesmo banco devolve a mesma amostra.

## Arquivos

### `roteirista.json`: 36 casos do escritor de roteiro

Entrada do cliente → palavras escritas, palavras narradas e segundos do MP4.

| Grupo | Casos | Duração | Idiomas | De onde veio a entrada |
|---|---|---|---|---|
| Kineo 1 (classic) | 13 | 35 / 60 / 90 | en, pt, es, ar | `render_job_opened.prompt` (modo `ai`), unido ao `render_delivered_measured` do mesmo cliente nos 40 min seguintes **com a mesma duração** |
| Seedance 1.5 15 s (classic) | 10 | 15 | en, es, fr, pt, hi, ur | ideia do cadastro (`auth_callback_completed` / `email_signup_completed`), até 3 h antes do `script_written` do mesmo cliente |
| Seedance 1.5 35/60/90, Kling 2.5, Veo | 6 | 35 / 60 / 90 | en, es, fr | `compose_submission_claim.topic` (texto do cliente que foi para a montagem), unido por `render_id` ao `render_delivered_measured` |
| Hollywood (H3, Kling 3 O3) | 7 | 15 / 30 / 35 / 60 | en, ko | `hollywood_resume.response.prompt`, com o `voiceover_script` que o planejador escreveu e a voz pinada |

- A ideia do cadastro fica gravada com só 120 caracteres. Os casos afetados levam `entrada_cortada_na_origem: true`.
- O texto foi cortado em 1.800 caracteres quando era maior (`entrada_cortada_em`).
- Hollywood externo é raro: só 8 filmes em toda a história, e 7 entraram. Só 1 deles tem MP4 medido.

### `analyze-idea.json`: 20 corpos do `POST /api/analyze-idea`

- O corpo é `{prompt, language, scriptMode, duration}`, tirado de `render_job_opened`. É o mesmo texto que o Studio manda ao analyze-idea.
- 11 casos no modo `ai` e 9 no `verbatim`.
- Idiomas registrados: en, es, pt, fr, ar, pl. Os textos ainda incluem espanhol e chinês marcados como `en`: são casos reais de idioma trocado.
- O campo `nota` diz o que cada caso exercita: instruções que não podem ser narradas, rótulos `Title:`, prosa sem marcadores e verbatim de uma linha.

### `ads-plan.json`: 7 briefs do Studio Ads v2

- Campos: frase, cena, tier, idioma, segundos e setor, mais a narração que o plano devolveu.
- **Falta de amostra, dita às claras.** Foram pedidos ~15. Na história inteira só existem 7 pedidos v2 de conta externa: são da mesma conta, de 14/10, com 4 frases distintas. Os outros 50 pedidos v2 e todos os 18 do Ads clássico são de contas internas e ficaram fora pela regra.
- As repetições da mesma frase servem para medir a **variância** do planejador.
- Para chegar a 15 na fase 2: escrever briefs sintéticos marcados `sintetico: true` em arquivo separado. Não misturar com estes.

### `narracoes.json`: 45 narrações com duração medida

Linha de base do ritmo da voz tts-1-hd, por motor:

| Motor | Narrações |
|---|---|
| Kineo 1 | 20 |
| Seedance 1.5 | 20 |
| Kling 2.5 | 2 |
| Veo | 2 |
| Kling 3 (hollywood) | 1 |

- **A persona de voz não é gravada em nenhum evento:** `render_delivered_measured.voice` e `.speed` estão nulos em 100% das linhas. Por isso `persona_estimada` foi calculada offline com o próprio `selectPersonaForScript` do código de 14/10:
  - vertical = indefinido;
  - tier pelo motor (Kineo 1 = free, cinematográficos = cinematic);
  - idioma = o registrado, ou o lido do texto.
- Personas cobertas: 7 de 9 (`finance-authority`, `energetic-facts`, `storyteller`, `documentary`, `dark-mystery`, `luxury-narrator`, `emotional-storyteller`). `conspiracy` e `futuristic-ai` não apareceram em nenhuma narração externa.
- `pal_por_s` = palavras ÷ segundos do MP4. É um **piso** do ritmo da voz: o MP4 inclui o respiro final e é cortado nos tetos de 61,5 s e 90 s.
- O método de anotação: `persona_estimada` vem de `selectPersonaForScript(texto, undefined, tier, idioma)` em `lib/narration/niche-mapping.ts`. Para refazer, copie `niche-mapping.ts` e `personas.ts` para uma pasta, troque `from './personas'` por `from './personas.ts'` e rode com o Node 24 (que remove os tipos sozinho).

### `legendas.json`: 11 casos de legenda

- Subconjunto de `narracoes.json`, escolhido pelo que estressa o tempo por palavra do whisper-1: números, aspas, escrita da direita para a esquerda, cirílico, devanágari, chinês no meio do inglês e fala de personagem.
- Cada caso traz o texto exato, a duração e o `ref`.
- **Nenhum áudio foi baixado.** O A/B de legenda sintetiza de novo a partir do texto, ou baixa pelo `ref` com autorização.

## O que estas amostras já mostram (sem gastar nada)

- **A ideia crua do cliente não é gravada nos motores cinematográficos.** O `script_written` não tem o tópico, e o `compose_submission_claim.topic` já é o roteiro escrito. Na fase 2 vale gravar a entrada original (com hash, em `generation_attempt_opened`) para ter A/B de verdade.
- **A voz usada não é gravada.** Sem isso, a régua por voz só pode ser estimada. Gravar `persona_id`, `voice` e `speed` no `render_delivered_measured` antes da virada da voz.
- **Defeitos reais do escritor de hoje**, que o modelo novo não pode repetir:
  - número ou nome apagado ("Days, Jesus fasted", "the of Versailles");
  - fala muito curta para a duração pedida (ship 35 s com 32 palavras; Kineo 1 90 s saindo com 61,5 s);
  - instrução narrada ("Juste l'histoire, pas de description de scène").
