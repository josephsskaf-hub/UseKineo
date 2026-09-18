# KINEO 1 — A RÉGUA DO ESCRITOR (17/09/2026, noite) — "vai pro item 1"

## O pedido
Fundador, depois do retrato dos motores: "vai pro item 1" — a parede **"narração curta"**, maior perda do
motor da casa: 90 recusas em 7 dias, **38 pessoas, 10 nunca fizeram filme nenhum** (27 apertaram o botão
de expansão e saíram com filme; 10 foram embora).

## O que eu tinha proposto × o que a investigação mostrou
Proposta no retrato: "expandir no servidor na primeira tentativa, sem botão". Ao abrir o código, isso
colidia com duas regras do próprio fundador: **C1** ("use my script as is" → o GPT nunca escreve fala) e a
direção de 14/09 ("roteiro próprio não é reescrito, acelerado nem cortado em silêncio"). Expansão
automática do texto de quem ESCREVEU o roteiro está fora.

Mas a parede não nascia de quem escreve. Ela nascia no **escritor da casa** (`/api/generate-script`), que
estrutura a ideia de uma linha que quase todo cliente digita:

| Quem mede | Régua | 60 s → palavras |
|---|---|---|
| Escritor (`generate-script`) | `WORDS_PER_SECOND` = **2,3 pal/s** (régua dos motores hollywood) × 0,95 | piso **132** |
| Portão do Kineo 1 (`generate-video-fast`) | voz da persona: fable × 1,1 = **2,81 pal/s**, cobertura ≥ 0,95 | exige **160** |

Um roteiro nascido no piso do escritor (132 palavras) dá 47 s no portão → cobertura 0,78 → **recusado por
construção**, antes de a pessoa escrever uma palavra. E o cliente nem mandava a duração ao escritor
(`{ topic, language }` → padrão 60 s): pedido de 90 s virava roteiro de 60 s. É a regra do CLAUDE.md
("UMA RÉGUA POR VOZ, NUNCA UMA SÓ") violada no nascimento do roteiro.

Dado que confirma: `narration_guard_blocked` (7 d) → pedidos de 35 s com **28 s de fala (cobertura 0,80)
a 2,96 pal/s**: exatamente o que o escritor produz a 2,3 × 0,95 × 35 s = 77 palavras.

## O conserto (commit desta branch)
- **`lib/scriptWriterRate.ts`** (novo): `writerRateFor(engine, topic, language)` devolve a régua do motor pela
  MESMA função do portão (`lib/speechRate`): Kineo 1 = persona (voz + velocidade, como a rota fast resolve),
  clássicos = 3,1, hollywood = 2,3; com motor conhecido o piso é a **duração inteira** (cobertura 1,0 → 5%
  de folga sobre os 0,95 do portão). Sem `engine`, tudo como antes (chamadores antigos intocados).
- **`app/api/generate-script/route.ts`**: lê `engine`, dimensiona alvo e prompt na régua certa, devolve
  `wordsPerSecond/family/minWords/words` e grava `script_written` (com await) — o denominador de "roteiro
  nascido curto", que antes não existia.
- **`GenerateClient.tsx`**: a chamada principal do estruturador passa `targetSeconds: duration` e
  `engine` (fast | quality).
- **O portão do roteiro próprio fica onde está** (C1 preservado; guardião prova).
- Guardião: `scripts/test-regua-do-escritor-2026-09-17.mjs` (14): prova em número que o piso antigo NÃO
  passava no portão e o novo passa (60/35/90 s).

## Trava 8.2 — registro para autorização
`app/api/generate-script/` está na lista da trava de qualidade (test-caixa-vazia-episodio2 #6,
test-despacho-vazio 8.2). Mesma categoria dos commits de hoje em `app/api/generate-video-fast` e
`lib/broll` que o fundador autorizou ("vai"). Commit **segurado na branch `codex/regua-do-escritor-0917`**,
não enfileirado, aguardando a palavra: **sobe** / **não**.

## Como medir depois do deploy
```sql
-- roteiros nascidos curtos (denominador novo) e recusas do portão, por dia
select date_trunc('day', created_at)::date d,
  count(*) filter (where name='script_written') escritos,
  count(*) filter (where name='script_written' and (metadata->>'fits')::boolean = false) nascidos_curtos,
  count(*) filter (where name='narration_guard_blocked') recusas_portao,
  count(distinct user_id) filter (where name='narration_guard_blocked') pessoas_na_parede
from events where created_at > '2026-09-18' and name in ('script_written','narration_guard_blocked')
group by 1 order by 1;
```
Esperado: `nascidos_curtos` ≈ 0 e `pessoas_na_parede` cai de ~5/dia para quem de fato colou roteiro
próprio curto (que continua vendo a oferta de expansão, como a regra manda).

---

## AUDITORIA (fundador: "faz uma auditoria antes para ver se tudo que você tá me falando tá certo")

| Afirmação minha | Conferida como | Veredito |
|---|---|---|
| Escritor a 2,3 pal/s; portão do Kineo 1 na persona (~2,8) | `lib/narrationFit.ts` WORDS_PER_SECOND=2.3; `generate-script` usava essa constante; rota fast usa `speechRateFor(persona)`; log real "fable speed=1.1 → 2.81" | **certa** |
| 90 recusas / 38 pessoas / 10 nunca fizeram filme (7 d) | SQL em `events` (generation_stage_error narration_too_short) × `videos` | **certa** |
| "27 apertaram o botão" | medido: 27 saíram com filme em 2 h (não necessariamente pelo botão); 80 das 90 recusas têm evento de expansão a ≤15 min | **imprecisa → corrigida** |
| "Recusado por construção" para todo roteiro da casa | depende da persona: catálogo real vai de 2,25 a 2,81 pal/s (9 personas); o piso antigo (132 palavras) passava só nas 2 mais lentas; um roteiro no meio da faixa (~145) reprovava nas 3 mais rápidas | **parcial → corrigida**: a recusa acontecia com persona rápida + roteiro perto do piso — que é o caso do log real das duas vítimas de hoje |
| Conserto robusto | **NÃO era**: escritor escolhe persona pelo tema cru, portão pelo roteiro pronto; podem divergir (2,25 × 2,81) e a folga de 5% não cobria | **defeito achado e corrigido**: escritor dimensiona pela persona MAIS RÁPIDA do catálogo (`fastestClassicPersonaRate`); guardião prova que o roteiro passa para TODAS as 9 personas e que, com a mais lenta, o filme sai ≤ ~25% acima do alvo |
| Cliente não mandava duração (90 s → roteiro de 60) | `GenerateClient.tsx` 7977: `{ topic, language }` | **certa**; observação: a duração 45 s do cliente não está em SUPPORTED_TARGETS [35,60,90] e cai em 60 (comportamento antigo, mantido) |
| C1 preservado (roteiro próprio não é reescrito) | portão + 422 + oferta de expansão intactos na rota fast (guardião f) | **certa** |
| tsc verde, guardiões verdes | tsc 0 erros; 17 verificações novas; expand-policy 95/95; idiomas-15 25/25; suíte inteira rodada na branch (ver abaixo) | **certa** |
| Não classifiquei as 90 recusas por origem (ideia de uma linha × roteiro colado) | o evento de recusa não guarda a origem; o novo `script_written` passa a dar esse denominador | **limite declarado** |
