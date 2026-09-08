#!/usr/bin/env node
// ═══════════════════════════════════════════════════════════════════════════
// GUARDIÃO — A ESTEIRA DE TRIAL NÃO OFERECE FILME GRÁTIS QUANDO NÃO HÁ FILME
// GRÁTIS  [KINEO-VERSAO-B-SEM-FILME-GRATIS-2026-09-08]
//
// O DEFEITO QUE ISTO TRAVA (medido em produção, 08/09/2026 ~08:30 UTC):
// três ramos de `app/api/cron/trial-lifecycle-emails/route.ts` diziam, com
// estas palavras, "you can still make one on the free plan you're back on" e
// entregavam 3 links `create_intent=fast` que DISPARAM o render sozinhos.
// Desde a versão B (lib/entryPolicy.ts CARD_ENTRY_ONLY, produção 08/09
// 04:22 UTC) o free tier tem `limit: 0` e /api/compose recusa na PRIMEIRA
// reserva — a carta prometia um filme e o link entregava um 402.
// Coorte de 7 dias, por `events.trial_lifecycle_email_sent.metadata->>'body'`:
//   downgraded_loss/never_ran 61 · expired_offer_d5/offer_first_film 37 ·
//   expired_lastcall_d10/offer_first_film 28  =  126 pessoas (~18/dia).
//
// COMO ESTE GUARDIÃO É ESCRITO (memórias `guardiao-que-conta-texto-nao-prova-
// condicao` e `guardiao-vermelho-pode-estar-parado`): ele NÃO conta frases. Ele
// amarra cada oferta de filme grátis à VARIÁVEL que decide se existe filme
// grátis (`FREE_FILM_AVAILABLE`), e essa variável ao LIMITE DO COBRADOR
// (`getFreeTierOffer().limit`), não a uma flag redigitada. Trocar a condição
// por `true` deixa este arquivo vermelho; mudar a redação da frase, não.
//
// Estilo readFileSync + contagem (memória `guardioes-com-alias-nao-rodam`:
// import com alias `@/` morre antes da 1ª verificação; e `assert` morre na 1ª
// falha, escondendo as demais).
// ═══════════════════════════════════════════════════════════════════════════

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8').split('\r\n').join('\n')

const rota = read('app/api/cron/trial-lifecycle-emails/route.ts')
const oferta = read('lib/freeTierOffer.ts')
const politica = read('lib/entryPolicy.ts')
const compose = read('app/api/compose/route.ts')

let ok = 0
let bad = 0
const check = (nome, cond) => {
  if (cond) {
    ok++
  } else {
    bad++
    console.error('  ✗ ' + nome)
  }
}

// ── 1) A condição existe e sai do LIMITE, não de uma flag redigitada ────────
check(
  '1. a rota declara FREE_FILM_AVAILABLE',
  /const FREE_FILM_AVAILABLE\s*=/.test(rota),
)
check(
  '2. FREE_FILM_AVAILABLE sai do limite do cobrador (getFreeTierOffer().limit), não de uma flag copiada',
  /const FREE_FILM_AVAILABLE\s*=\s*LIFECYCLE_FREE_OFFER\.limit\s*>\s*0/.test(rota),
)
check(
  '3. LIFECYCLE_FREE_OFFER vem de getFreeTierOffer(), a fonte única',
  /const LIFECYCLE_FREE_OFFER\s*=\s*getFreeTierOffer\(\)/.test(rota),
)
check(
  '4. a rota NÃO redigita CARD_ENTRY_ONLY para decidir isto (predicado do cobrador não se redigita)',
  !/FREE_FILM_AVAILABLE\s*=\s*!?\s*CARD_ENTRY_ONLY/.test(rota),
)

// ── 2) Os TRÊS ramos de primeiro filme estão amarrados à condição ───────────
// Cada um monta a lista de temas com `starterTopics(...)` e só entra no corpo
// que promete o filme quando a lista não é vazia (desvio que já existia).
const SEMENTES = [':loss', ':d5offer', ':d10offer']
for (const semente of SEMENTES) {
  const linha = rota
    .split('\n')
    .find((l) => l.includes(`starterTopics(\`\${c.id}${semente}\`)`))
  check(
    `5.${semente} — a linha de temas do ramo existe`,
    typeof linha === 'string',
  )
  check(
    `6.${semente} — os temas só são montados quando HÁ filme grátis`,
    typeof linha === 'string' && /FREE_FILM_AVAILABLE\s*\?/.test(linha),
  )
  check(
    `7.${semente} — a lista cai para [] (o desvio de pool vazio) e não para outra coisa`,
    typeof linha === 'string' && /:\s*\[\]/.test(linha),
  )
}

// ── 3) A frase falsa não pode ficar solta em nenhum ramo sem a condição ─────
// Toda ocorrência da promessa vive dentro de um `if (…length > 0)` alimentado
// por uma lista que passou pela condição acima. Aqui a checagem é de CONTAGEM:
// 3 promessas, 3 listas condicionadas.
// ⚠️ A contagem ignora COMENTÁRIO: o bloco que explica este conserto cita a
// frase, e contar a citação como promessa daria um número que não existe no
// e-mail (o defeito `guardiao-que-conta-texto-nao-prova-condicao` ao contrário).
const linhasDeCodigo = rota
  .split('\n')
  .filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l))
const promessas = linhasDeCodigo.filter((l) => l.includes("free plan you're back on")).length
const listasCondicionadas = (
  rota.match(/FREE_FILM_AVAILABLE \? starterTopics\(/g) || []
).length
check(
  `8. as 3 promessas de filme grátis (texto+html = 6 linhas) têm 3 listas condicionadas (promessas=${promessas}, listas=${listasCondicionadas})`,
  promessas === 6 && listasCondicionadas === 3,
)

// ── 4) O corpo `standard`, que passa a receber quem nunca entregou nada, não
//      afirma um acervo que não existe ───────────────────────────────────────
check(
  '9. o corpo standard do downgraded_loss calcula nothingKept',
  /const nothingKept\s*=\s*c\.videosMade === 0 && otherTotal === 0/.test(rota),
)
check(
  '10. a frase do acervo SOME quando não há acervo (texto)',
  /const keptText = nothingKept\s*\n\s*\?\s*''/.test(rota),
)
check(
  '11. a frase do acervo SOME quando não há acervo (html)',
  /const keptHtml = nothingKept\s*\n\s*\?\s*''/.test(rota),
)
check(
  '12. o parágrafo vazio não vira linha em branco no e-mail',
  rota.includes("${keptText ? `\\n${keptText}\\n` : ''}") &&
    rota.includes('${keptHtml ? `  <p style="margin:0 0 14px;">${keptHtml}</p>'),
)

// ── 5) A verdade do outro lado: o limite realmente é 0 na versão B ──────────
check(
  '13. lib/entryPolicy declara CARD_ENTRY_ONLY',
  /export const CARD_ENTRY_ONLY\s*=/.test(politica),
)
const cardEntryLigado = /export const CARD_ENTRY_ONLY\s*=\s*true/.test(politica)
const ofertaLimiteZero = /const CARD_ENTRY_OFFER[\s\S]{0,400}?limit:\s*0/.test(oferta)
check(
  '14. a oferta da porta única tem limit 0 (não há filme grátis)',
  ofertaLimiteZero,
)
check(
  '15. getFreeTierOffer devolve a oferta da porta quando CARD_ENTRY_ONLY',
  /if \(CARD_ENTRY_ONLY\) return CARD_ENTRY_OFFER/.test(oferta),
)
check(
  '16. o cobrador recusa a partir do limite (compose lê FREE_OFFER.limit)',
  /reservedOrCompleted > FREE_OFFER\.limit/.test(compose),
)

// ── 6) Falsificação: se a condição virar constante verdadeira, isto reprova ─
// (a trava não pode ser satisfeita por texto que não avalia nada)
const mutante = rota.replace(
  /const FREE_FILM_AVAILABLE\s*=\s*LIFECYCLE_FREE_OFFER\.limit\s*>\s*0/,
  'const FREE_FILM_AVAILABLE = true',
)
check(
  '17. o mutante foi mesmo escrito (a mutação precisa provar que aplicou)',
  mutante !== rota && mutante.includes('const FREE_FILM_AVAILABLE = true'),
)
check(
  '18. a verificação 2 fica VERMELHA no mutante',
  !/const FREE_FILM_AVAILABLE\s*=\s*LIFECYCLE_FREE_OFFER\.limit\s*>\s*0/.test(mutante),
)

// ── Estado observado, para o diário ────────────────────────────────────────
console.log(
  `\n  estado: CARD_ENTRY_ONLY=${cardEntryLigado ? 'true' : 'false'} · ` +
    `oferta da porta com limit 0=${ofertaLimiteZero ? 'sim' : 'não'} · ` +
    `ramos condicionados=${listasCondicionadas}/3`,
)
console.log(`\n  ${ok} verificações passaram, ${bad} falharam`)
process.exit(bad === 0 ? 0 : 1)
