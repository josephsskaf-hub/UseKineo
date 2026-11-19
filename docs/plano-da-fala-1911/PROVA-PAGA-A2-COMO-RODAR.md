# Prova paga do A1 + A2 + portão do sujeito · como rodar · Div. 2 · 19/11

**Precisa do sim do dono antes:** o gasto passa de US$ 5 (4 filmes ≈ US$ 10,85), e o caixa está apertado: todo gasto pede o sim.
**Branch:** a de publicação desta volta (o portão de nome, o sujeito coerente e a opção (a)), já publicada em `'internal'` e revista.

## Por que a opção (a)
- **(a) A conta exata do ensaio declara `k4_roteiro_do_escritor` também no render real, só no modo ensaio (`k4_gratis_ensaio: true`).** O filme sai do MESMO roteiro do cliente. Assim a prova compara o código novo com o filme do defeito, e só o código muda. É mudança de porta: só a conta exata entra e o cliente continua sem o parâmetro. O revisor confere.
- **(b) Refazer pela tela (ideia → nosso escritor → Generate).** Não precisa de código, porque o `script_written` passa a ser do fundador. Mas sai um roteiro NOVO, e a prova passa a medir o escritor junto. Serve de reserva se (a) não passar no revisor.

## Custo por filme (render real, Kling 4 grátis pela conta do fundador)
| Peça | Valor | De onde |
|---|---|---|
| Clipe Kling 4 de 15 s | US$ 2,355 | `KLING4_TRIAL_COST_USD` |
| Clipe de até 20 s (o modo ensaio permite, se a voz medida passar de 15,5 s) | até US$ 3,14 | `KLING4_TRIAL_MAX_SECONDS_ENSAIO` |
| Personagem: folhas, regeração do crítico e âncoras | medido no render original: 273c7774 US$ 0 · 1c770cb7 US$ 0,726 · 40543daf US$ 0,439 · d8bfd93d US$ 0 | `personagem.extra_usd` do claim |
| Imagem-chave (1 por filme) | ~US$ 0,03 | não fica no claim; conferir na fatura da fal |
| Texto OpenAI (base, descritor gpt-4o, juízes, pedidos a mais, reescrita) + voz (tts-1-hd + Whisper) | ≤ US$ 0,045 | o eco dos 2 ensaios |

| Filme | Por quê | Total estimado |
|---|---|---|
| 273c7774 | cena | ≈ US$ 2,43 |
| 1c770cb7 | personagem | ≈ US$ 3,16 |
| 40543daf | final | ≈ US$ 2,87 |
| d8bfd93d | final pela reescrita | ≈ US$ 2,43 |
| **Os 4** | | **≈ US$ 10,9** (até ~US$ 14 se os 4 forem a 20 s) |

c92b352b e b1ffe3ad entram depois desta volta (o portão de nome derrubava os dois por engano).

## Passo a passo (Chrome do fundador, logado em usekineo.com)
1. Ter o sim do dono para o valor da tabela.
2. Rodar `docs/plano-da-fala-1911/ensaio-a2-2-lista.sql` (só SELECT) e copiar as linhas dos 4 filmes (roteiro, ideia, engine, language).
3. No console, UM filme por vez, sem `dry_run`:
```js
const l = { /* a linha do filme */ }
const r = await fetch('/api/generate-video-cinematic', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
  prompt: l.roteiro, original_idea: l.ideia ?? undefined, script_mode: 'verbatim',
  k4_gratis_ensaio: true, k4_roteiro_do_escritor: !!l.ideia,
  engine: l.engine ?? undefined, language: l.language ?? undefined,
  duration: 15, quality: 'cinematic_ai', generationId: crypto.randomUUID() }) }).then((x) => x.json())
console.log(r.generationId ?? r)
```
4. Esperar o filme terminar (Library ou status) antes do próximo: um Kling 4 por vez.
   **REGRA DE PARADA [revisor 19/11, 6ª passada]:** antes do 2º filme, conferir o 1º no banco (passo 5). PARAR e não rodar os outros se o 1º:
   - não tiver `ensaio_fundador` no claim;
   - não tiver o sujeito com motivo `ideia_*_do_escritor`;
   - tiver caído no caminho de hoje (o evento `kling4_descritor_forte` não existe, ou a descrição por seção não está nos planos);
   - tiver saído com clipe acima de 15 s.

   Do mesmo jeito, o 3º e o 4º só rodam se o anterior passou nas quatro. Parou: mandar à Div. 2 o `generation_id` e o motivo.
5. Conferir no banco (só SELECT), pelo `generation_id`:
   - o `cinematic_submission_claim` tem `kling4_trial.ensaio_fundador = true` e os planos com a descrição por seção;
   - o relato do sujeito vem com o motivo `ideia_*_do_escritor`;
   - o evento `kling4_descritor_forte` traz o veredito, as reescritas, `ultimo_sem_sujeito` e `nomes_depois`.
6. Comparar em quadros com o filme original do mesmo roteiro: a cena do pedido, o sujeito no último plano e o desfecho.
7. Os créditos saem da conta do fundador. A fal cobra pelo clipe e pelas imagens.
