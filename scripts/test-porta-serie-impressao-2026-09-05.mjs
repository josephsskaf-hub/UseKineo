#!/usr/bin/env node
/**
 * sprint-retencao #15 (2026-09-05) — TODA PORTA DE SERIE PASSA A TER
 * DENOMINADOR.
 *
 * O QUE ESTAVA ERRADO (medido no banco, `events`, 30 dias):
 *   series_continue_clicked = 122 eventos em ONZE pares (source, path)
 *   series_continue_seen    =  72 eventos em DOIS   pares
 * Impressao menor que clique e impossivel — a nao ser que quase toda porta
 * seja invisivel para a medicao. E era: o evento de exposicao existia em UM
 * arquivo (GenerateClient, fontes `done_screen` e `composer_empty`). As
 * outras nove fontes tinham clique e ZERO denominador:
 *   history_video_card 31 · history_milestone 26 · generate_recent_video 24
 *   studio_milestone 11 · render_pill 7 · library_video_card 1
 * Toda leitura de "a porta converte?" saia errada por construcao: dividia o
 * clique de onze portas pela impressao de duas.
 *
 * A REGRA QUE ESTE GUARDIAO IMPOE: em qualquer arquivo que dispare
 * `series_continue_clicked` com um `source` literal, esse MESMO literal
 * precisa aparecer num `registrarPorta({ source: ... })`. Porta que sabe
 * contar clique e nao sabe contar aparicao volta a ser proibida.
 *
 * LIMITE HONESTO: isto e um guardiao ESTRUTURAL. Ele le os arquivos reais e
 * prova que a instrumentacao existe e esta pareada. Ele NAO prova que o
 * IntersectionObserver dispara no navegador — essa prova so vem do banco,
 * depois da publicacao, com `series_continue_seen` aparecendo nas fontes
 * novas. Nao chamar este teste de "prova de que a medicao funciona".
 *
 * Le os arquivos REAIS. Zero rede, zero banco, zero credito.
 */

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')

const TELAS = [
  'app/(dashboard)/history/HistoryClient.tsx',
  'app/(dashboard)/library/LibraryClient.tsx',
  'app/(dashboard)/studio/StudioClient.tsx',
  'app/(dashboard)/generate/GenerateClient.tsx',
  'components/ActiveRenderPill.tsx',
]
const CAMINHO_MODULO = 'lib/seriesDoorImpressions.ts'

let ok = 0
let falhas = 0
const erros = []

function checa(nome, condicao, detalhe = '') {
  if (condicao) {
    ok += 1
    console.log(`  ok  ${nome}`)
  } else {
    falhas += 1
    erros.push(`${nome}${detalhe ? ` — ${detalhe}` : ''}`)
    console.log(`  FALHA  ${nome}${detalhe ? ` — ${detalhe}` : ''}`)
  }
}

const ler = (rel) => readFileSync(join(RAIZ, rel), 'utf8')

// ── 1. O MODULO UNICO ─────────────────────────────────────────────────────
console.log('\n1) lib/seriesDoorImpressions.ts — uma unica definicao de "apareceu"')

let modulo = ''
let moduloExiste = true
try {
  modulo = ler(CAMINHO_MODULO)
} catch {
  moduloExiste = false
}
checa('1.1 o modulo existe', moduloExiste)
checa('1.2 e client component (roda no navegador)', /^'use client'/m.test(modulo))
checa('1.3 exporta o hook `useSeriesDoorSeen`', /export function useSeriesDoorSeen\(/.test(modulo))
checa('1.4 exporta a chave de deduplicacao', /export function chaveDaPorta\(/.test(modulo))
checa(
  '1.5 dispara EXATAMENTE o evento que ja existia (`series_continue_seen`)',
  /trackEvent\('series_continue_seen'/.test(modulo),
  'nome novo quebraria a serie historica do done_screen',
)
checa(
  '1.6 manda `source` — sem ele o par com o clique nao fecha',
  /source: porta\.source/.test(modulo),
)
checa(
  '1.7 so conta quando METADE do elemento entra no viewport',
  /LIMIAR_PORTA_VISIVEL = 0\.5/.test(modulo) && /threshold: LIMIAR_PORTA_VISIVEL/.test(modulo),
)
checa(
  '1.8 uma vez por porta por visita (dedupe por chave)',
  /disparadas\.current\.has\(chave\)/.test(modulo) && /disparadas\.current\.add\(chave\)/.test(modulo),
)
checa(
  '1.9 navegador sem IntersectionObserver conta com `observed:false`',
  /typeof IntersectionObserver === 'undefined'/.test(modulo) && /marcarVista\(porta, false\)/.test(modulo),
)
checa(
  '1.10 fire-and-forget: telemetria nunca derruba a tela',
  /void trackEvent\('series_continue_seen'/.test(modulo) && /catch \{/.test(modulo),
)
checa(
  '1.11 o observer nasce no registro, nao num efeito (senao perde a 1a porta)',
  /garantirObserver/.test(modulo) && !/useEffect\([\s\S]{0,140}new IntersectionObserver/.test(modulo),
)
checa(
  '1.12 desconecta ao desmontar (nao vaza observer entre telas)',
  /observerRef\.current\?\.disconnect\(\)/.test(modulo),
)
checa(
  '1.13 o modulo NAO mexe em href, preco, credito nem rota',
  !/(buildSeriesContinuationHref|router\.push)/.test(modulo),
  'telemetria pura — se isto falhar, o modulo passou a mudar produto',
)

// ── 2. A INVARIANTE: CLIQUE LITERAL EXIGE IMPRESSAO ───────────────────────
console.log('\n2) Toda fonte de clique literal tem a impressao pareada')

const fontesDeClique = (texto) => {
  const achadas = new Set()
  // Janela larga de proposito: o bloco do `studio_video_tile` tem 5 campos e
  // passava de 240 caracteres — com a janela curta o proprio guardiao ficava
  // cego para uma porta, que e exatamente o defeito que ele existe para pegar.
  for (const m of texto.matchAll(/trackEvent\('series_continue_clicked'[\s\S]{0,420}?\}\)/g)) {
    const fonte = m[0].match(/source: '([a-z0-9_]+)'/)
    if (fonte) achadas.add(fonte[1])
  }
  return achadas
}
const fontesRegistradas = (texto) => {
  const achadas = new Set()
  for (const m of texto.matchAll(/registrarPorta\(\{[\s\S]{0,240}?\}\)/g)) {
    const fonte = m[0].match(/source: '([a-z0-9_]+)'/)
    if (fonte) achadas.add(fonte[1])
  }
  return achadas
}

let totalFontes = 0
for (const rel of TELAS) {
  const texto = ler(rel)
  const cliques = fontesDeClique(texto)
  const vistas = fontesRegistradas(texto)
  if (cliques.size === 0) continue
  checa(
    `2.a ${rel} chama o hook uma vez`,
    /useSeriesDoorSeen\(\)/.test(texto) && /from '@\/lib\/seriesDoorImpressions'/.test(texto),
  )
  for (const fonte of [...cliques].sort()) {
    totalFontes += 1
    checa(
      `2.b ${rel}: '${fonte}' tem clique E impressao`,
      vistas.has(fonte),
      'porta que conta clique sem contar aparicao volta a produzir taxa impossivel',
    )
  }
}
checa(
  '2.c as seis fontes que estavam cegas foram cobertas',
  totalFontes >= 6,
  `encontrei ${totalFontes} fontes literais`,
)

// ── 3. AS DUAS FONTES QUE JA MEDIAM CONTINUAM MEDINDO ─────────────────────
console.log('\n3) `done_screen` e `composer_empty` nao foram perdidos no caminho')

const gerador = ler('app/(dashboard)/generate/GenerateClient.tsx')
checa(
  '3.1 `done_screen` continua disparando series_continue_seen',
  /trackEvent\('series_continue_seen'[\s\S]{0,200}source: 'done_screen'/.test(gerador),
)
checa(
  '3.2 `composer_empty` continua disparando series_continue_seen',
  /trackEvent\('series_continue_seen'[\s\S]{0,200}source: 'composer_empty'/.test(gerador),
)

// ── 4. NADA DE PRODUTO MUDOU NAS TELAS ────────────────────────────────────
console.log('\n4) As portas continuam levando ao mesmo lugar')

const ESPERADO_HREF = [
  ['app/(dashboard)/history/HistoryClient.tsx', "buildSeriesContinuationHref(title, 'history_video_card')"],
  ['app/(dashboard)/library/LibraryClient.tsx', "buildSeriesContinuationHref(v.title, 'library_video_card')"],
  ['app/(dashboard)/studio/StudioClient.tsx', "buildSeriesContinuationHref(myVids[0]?.title, 'studio_milestone')"],
  ['app/(dashboard)/studio/StudioClient.tsx', "buildSeriesContinuationHref(v.title, 'studio_video_tile')"],
]
for (const [rel, trecho] of ESPERADO_HREF) {
  checa(`4.a ${rel}: href intacto (${trecho.slice(0, 44)}…)`, ler(rel).includes(trecho))
}
checa(
  '4.b a pilula continua chamando handleNextEpisode no clique',
  /onClick=\{\(\) => handleNextEpisode\(nextSeed\)\}/.test(ler('components/ActiveRenderPill.tsx')),
)
checa(
  '4.c o ref foi pendurado no elemento que JA existia (sem wrapper novo)',
  !/<SeriesDoorSeen|<ImpressionWrapper/.test(TELAS.map(ler).join('\n')),
  'wrapper novo mudaria layout; a regra desta entrega e telemetria sem pixel novo',
)

console.log(`\n${'═'.repeat(66)}`)
console.log(`  ${ok} verdes · ${falhas} vermelhas`)
if (falhas) {
  console.log('\nFALHAS:')
  for (const e of erros) console.log(`  · ${e}`)
}
console.log('═'.repeat(66))
process.exit(falhas ? 1 : 0)
