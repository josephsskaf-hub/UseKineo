# Plano B quando a OpenAI cai — 28/09/2026

**Marcador no código:** `KINEO-PLANO-B-OPENAI-2026-09-28` · **Guardião:** `scripts/test-llm-fallback-2026-09-28.mjs` (148 verificações executando o código real; a seção (e) cobre a Revisão 2)

## O caso
De 26/09 16:22Z a 27/09 ~08:35Z a conta da OpenAI ficou sem crédito (a mensagem foi "429 You have no credits remaining"). No roteiro houve 59 tentativas bloqueadas, de 9 pessoas de fora:
- 47 no escritor de cenas do Kineo 1 (`generateScenes` em `lib/runway.ts`, chamado por `/api/generate-video-fast`);
- 12 no `/api/generate-script`.

8 dessas 9 pessoas nunca receberam um filme, e nenhuma delas voltou depois do conserto.

Nos 60 dias anteriores, todos os 429 da OpenAI foram falta de crédito (32 de 32) e não houve nenhum travamento. Tentar de novo, ou trocar de modelo na mesma conta, teria salvo 0 das 59 tentativas. A única saída é um segundo fornecedor, e o único que já está pago é a **fal** (FAL_KEY).

## O que mudou (nenhum arquivo da trava 8.2 foi editado)
1. **Texto** (`lib/llmFallback.ts`, ligado no Proxy de `lib/openai.ts`, só em `chat.completions.create`):
   - A chamada à OpenAI roda igual a antes.
   - O plano B entra quando a OpenAI falha com 429, 5xx ou queda de conexão **em menos de 8 s**. Nesse caso a chamada é repetida **uma vez** pelo roteador da fal (`https://fal.run/openrouter/router/openai/v1`), com o **mesmo modelo** (`openai/gpt-4o`, `openai/gpt-4o-mini`) e o mesmo pedido.
   - Se a fal também falhar, volta o erro **original** da OpenAI. O cliente vê a mensagem de capacidade de sempre, o alarme continua o mesmo e o motivo gravado nos eventos não muda.
   - Se a fal salvar a chamada, você **ainda recebe o e-mail** (o assunto é o de sempre, e o texto diz "PLANO B ATIVO") e o evento `llm_fallback_used` é gravado.
   - Os erros 400, 401 e 422 (pedido ruim, chave errada, recusa de conteúdo) não passam pelo plano B.
   - Cobre tudo o que usa o cliente da OpenAI para texto, incluindo generate-script, o escritor de cenas do Kineo 1, analyze-idea, o compose e o b-roll.
   - **Exceção: a rota `/api/generate-video-cinematic` inteira** fica **sem** plano B de texto — a estrada hollywood (Kling 3, H3, Omni, Seedance 2.5) **e também a chamada de texto dos clássicos** (Seedance 1.5, Veo, Kling 2.5), que despacham pela mesma rota. Ver "Revisão adversarial" e "Revisão 2" abaixo.
2. **Voz do Kineo 1 e dos clássicos** (`lib/ttsFallback.ts`, ligado em `app/api/compose/route.ts`):
   - Hoje, quando a voz da OpenAI (tts-1-hd) falha, a resposta é o erro 502 "Voiceover generation failed".
   - Agora, quando a falha for 429, 5xx ou queda de conexão, a narração sai pela **MiniMax Speech-2.8 HD na fal**. O formato do pedido é o mesmo da rota /audio: `prompt`, `output_format: 'url'` (obrigatório) e `language_boost: 'auto'`.
   - Só vale quando a OpenAI falha rápido, em menos de 20 s. Um timeout de 55 s mais a MiniMax passaria do limite de 300 s do compose, então nesse caso o 502 continua como antes.
   - O evento `tts_fallback_used` é gravado.
   - Essa voz reserva não entra no cache de voz e não passa pelo ajuste de duração, porque o formato conferido não tem controle de velocidade.
   - No **ajuste de duração** (passe corretivo), a OpenAI acabou de narrar a primária. Só a conta **sem crédito** vai direto à voz reserva; um 503 ou um 429 de velocidade passageiro segue a 2ª tentativa da OpenAI (como na origin/main), e a voz reserva só entra se essa 2ª tentativa também falhar.
3. **Sonda** `GET /api/admin/llm-fallback-probe`:
   - Só abre para admin.
   - Testa os ids `openai/gpt-4o-mini` e `openai/gpt-4o` no roteador da fal, pedindo resposta em JSON.
   - Devolve `{ok, results:[{model, ok, json_ok, ms, sample, error_status}]}`.
   - Não grava evento de uso e não manda e-mail.

## Revisão adversarial (28/09) — três consertos antes de subir
1. **Hollywood pagaria clipes que morrem no compose (o defeito grave).** Com a OpenAI sem crédito, a 1ª versão salvava o planejador hollywood pela fal. A rota então pagava os clipes à fal (Omni e7918140 ≈ US$ 11,86; H3 7127d8b4 ≈ US$ 5,70), e o filme morria na narração: a voz hollywood (`synthesizeHostSpeech`, tts-1-hd, arquivo travado) não tem voz reserva. Resultado: 422, crédito devolvido, dinheiro dos clipes perdido, e o cliente esperando à toa. Hoje (origin/main) o mesmo apagão derruba o planejador **antes** de qualquer clipe pago, com custo zero e resposta na hora.
   - **Conserto:** toda chamada de texto da rota cinematográfica fica **como antes** (a OpenAI ou o erro dela). São duas travas: a rota lida da pilha e a marca do prompt do planejador hollywood ("THE FOUR KEYS TO REALISM"). A segunda não depende de como a Vercel empacota o código.
   - **O Kineo 1 continua com o plano B de texto** (roteiro e cenas), porque a voz dele (`generateTTS`) tem voz reserva.
   - **Os clássicos (Seedance 1.5, Veo, Kling 2.5) não têm plano B na chamada de texto da rota cinematográfica.** Eles despacham por `/api/generate-video-cinematic`, e a trava pela rota vale para a rota inteira: com a OpenAI fora, o escritor de cenas deles no modo IA (`generateScenes`) devolve o erro original e a rota segue exatamente como na origin/main (nenhuma regressão, nenhum ganho). O que eles ganharam é a **narração** no compose, que tem a voz reserva, e o plano B no generate-script e no analyze-idea. (30 dias até 27/09: 65 despachos Seedance, 7 Veo e 6 Kling 2.5 com `verbatim=false` passaram por esse escritor.)
   - O log da trava diz **"SEM plano B na estrada hollywood (…, planejador hollywood)"** só quando a marca do planejador hollywood está no pedido; pela rota diz **"SEM plano B na rota cinematográfica"** (clássico ou hollywood). Para contar filmes hollywood retidos, conte só a primeira forma.
   - **Dados:** foram ~24 despachos hollywood em 30 dias e nenhum durante o apagão de 26-27/09. O defeito estava armado, mas ainda não tinha disparado.
2. **A voz reserva era chamada duas vezes no ajuste de duração.** Se a MiniMax falhasse na 1ª tentativa do passe corretivo, a 2ª tentativa chamava de novo. Isso somava até ~2 × 90 s dentro dos 300 s do compose, para no fim manter o áudio original.
   - **Conserto:** a MiniMax agora é tentada **no máximo uma vez por render**.
   - O download do mp3 da fal ganhou um teto de 20 s.
3. **O e-mail e o evento da voz reserva não tinham teto.** Um Resend ou um Supabase travado no apagão seguraria o compose depois do débito.
   - **Conserto:** agora eles usam o mesmo teto de 2,5 s do texto (`settleWithin`).

## Revisão 2 (28/09) — cinco consertos (FIX-REVISAO-2)
1. **Resposta 200 que não é conclusão.** O roteador da fal (OpenRouter) devolve erro de geração com HTTP 200 e o erro no corpo. A 1ª versão contava isso como salvo: o Kineo 1 quebrava lendo `choices[0]` e o cliente via um 500 genérico em vez da mensagem de capacidade, enquanto o fundador recebia "PLANO B ATIVO … O cliente não viu erro".
   - **Conserto:** só conta como salvo uma conclusão de verdade (`isRealChatCompletion`: sem `error`, `choices[0].message` com texto, `finish_reason` diferente de `error`; ou `tool_calls` quando o pedido tinha ferramentas). O resto relança o erro **original** da OpenAI, sem evento `llm_fallback_used` e sem e-mail de plano B. A sonda usa a mesma régua.
2. **Ajuste de duração trocava a voz por um soluço.** Ver o item de voz acima: só conta sem crédito pula a 2ª tentativa da OpenAI.
3. **O saldo da fal acabando no plano B não tocava alarme.** O plano B gasta a mesma carteira dos clipes; quando ela acaba, o Kineo 1 morre no roteiro, antes de qualquer clipe, e nenhum alarme de saldo rodava.
   - **Conserto:** a recusa por saldo do roteador (texto) e da MiniMax (voz) toca o **alarme único de saldo da fal** (`lib/falAlert`, fontes `llm_fallback` e `tts_fallback`, linha `fal_balance_exhausted` e o card do /admin). O cliente continua recebendo o mesmo erro de antes.
   - O SDK da OpenAI perdia a frase da fal (`{"detail":"User is locked. Reason: Exhausted balance"}` virava "403 status code (no body)"); o cliente do roteador agora traduz o `detail` para o formato que o SDK lê.
4. **Este documento dizia que os clássicos mantinham o plano B de texto.** Corrigido acima.
5. **Eventos forjáveis.** O `/api/events` público aceitava os nomes novos das levas de 28/09. Agora `fal_balance_exhausted`, `cinematic_dispatch_defect_alerted`, `llm_fallback_used`, `tts_fallback_used`, `classic_scene_retry_attempt`, `classic_scene_retry_unconfirmed`, `classic_scene_retry_hold_cleared`, `omni_scene_kling_fallback` e `pasted_brief_detected` são só do servidor, e o card de saldo da fal (RPC e leitura reserva) ignora linha com o carimbo do sink (`ip_hash`/`is_bot`).
- O e-mail do plano B só diz "Recarregar a OpenAI" quando a recusa foi de crédito.

## Interruptores (no código, porque não mexemos nas variáveis de ambiente da Vercel)
- `LLM_FALLBACK_ENABLED = true` em `lib/llmFallback.ts` controla o texto.
- `TTS_FALLBACK_ENABLED = true` em `lib/ttsFallback.ts` controla a voz. É separado porque trocar a voz é uma decisão de produto.

## O que ainda NÃO foi verificado
- Não sabemos se o roteador da fal aceita os ids `openai/gpt-4o` e `openai/gpt-4o-mini` com `response_format: json_object`, porque a documentação da fal não lista ids. **Abrir a sonda logo depois do deploy.** Se `ok` vier `false`, o plano B de texto falha e devolve o erro original, ou seja, fica igual a hoje e não piora nada.
- Não sabemos o preço do MiniMax 2.8 HD na fal. O 02-hd custava US$0,10 por 1.000 caracteres, e um filme de 60 s tem ~1.100 caracteres.

## Como medir depois do deploy
Durante um apagão o `openai_quota_dead` cai para zero **mesmo com a OpenAI fora**. A contagem certa passa a ser esta (os dois nomes são só do servidor desde a Revisão 2; para contar linhas antigas, filtre `metadata->'is_bot' is null`):
```sql
select name, metadata->>'route' as rota, metadata->>'model' as modelo, metadata->>'primary_status' as status, count(*)
from events
where name in ('llm_fallback_used', 'tts_fallback_used') and created_at > '<carimbo do deploy>'
group by 1, 2, 3, 4 order by 5 desc;
```

## O que fica de fora
- **Estrada hollywood inteira** (Kling 3, H3, Omni, Seedance 2.5):
  - `synthesizeHostSpeech` fica em `lib/hollywood/hostVoice.ts`, que está na trava 8.2, e continua só na OpenAI.
  - Por isso o plano B de texto também fica desligado na rota cinematográfica.
- **A chamada de texto dos clássicos na rota cinematográfica** (Seedance 1.5, Veo, Kling 2.5 no modo IA): fica como na origin/main, pela mesma trava. Liberar só o escritor clássico exige uma segunda marca no prompt dele (`lib/runway.ts`) ou mexer na rota travada — decisão sua.
  - Para ligar os dois juntos, a narração hollywood precisa de uma voz reserva com a mesma régua de ritmo (2,3 pal/s). Isso exige mexer em arquivo travado, com aprovação sua.
- **Três chamadas diretas** que não usam o cliente: `lib/pixabay.ts` (diretor), `lib/cinematic/speechImageAlign.ts` e `lib/fastCoherence.ts`. As três já seguem funcionando, de forma reduzida, quando falham.
- **Whisper** (legenda sincronizada): quando falha, a legenda passa a ser proporcional.
- **Recusas 422 do modelo**: são uma questão de política de conteúdo, não um apagão.

## Riscos
- O plano B gasta o **saldo pré-pago da fal**, o mesmo que paga os clipes. Um apagão longo da OpenAI pode esvaziar as duas contas; por isso o alarme continua tocando mesmo quando o plano B salva a chamada.
- A voz reserva não é a da persona e fala em outro ritmo, então o filme pode passar do alvo. Pela regra de 02/09, passar do alvo é aceitável.
