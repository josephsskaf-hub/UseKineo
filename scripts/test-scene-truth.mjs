#!/usr/bin/env node
// ═══ CONTRATO CENA VERDADEIRA + DIRETOR DE FORMATO — gates do TOP 5 ═══════
//
// Os dados abaixo sao REAIS: falas e prompts lidos de
// `cinematic_submission_claim` do render 37c8d832 em producao.
//
// GATE 1 (item 1 do TOP 5): o roteiro NOAA deve associar U-boat a submarino,
//         naufragio, sonar, mapa ou destrocos — nunca a pessoa submersa.
// GATE 2 (item 2 do TOP 5): o roteiro NOAA gera zero apresentador e zero
//         rosto em primeiro plano SEM depender da tag escondida [faceless].
//
// Rodar: node scripts/test-scene-truth.mjs   (sem rede, sem custo)

import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..')

// Achar o tsc SEM depender de `npm install` dentro da worktree.
// Worktree de git nao tem node_modules propria; a arvore principal tem.
// Sem isso o teste so roda com symlink na mao — e no Windows do fundador,
// nem isso. Procura na worktree, no repo principal e nos pais.
function acharTsc(base) {
  const tentativas = []
  let dir = base
  for (let i = 0; i < 6; i++) {
    tentativas.push(join(dir, 'node_modules', 'typescript', 'bin', 'tsc'))
    const pai = dirname(dir)
    if (pai === dir) break
    dir = pai
  }
  // Worktrees vivem em <repo>/.claude/worktrees/<nome> — o repo esta 3 acima,
  // e ja e coberto pela subida acima; esta linha e so explicitude.
  for (const t of tentativas) if (existsSync(t)) return t
  console.error('Nao achei o typescript. Rode `npm install` na pasta do projeto.\nProcurei em:\n  ' + tentativas.join('\n  '))
  process.exit(1)
}
const TSC = acharTsc(raiz)

const saida = mkdtempSync(join(tmpdir(), 'kineo-scenetruth-'))
const requerer = createRequire(join(saida, 'x.cjs'))
mkdirSync(join(saida, 'src'), { recursive: true })
for (const f of ['sceneTruth.ts', 'visualMode.ts']) {
  writeFileSync(join(saida, 'src', f), readFileSync(join(raiz, 'lib/cinematic', f), 'utf8'))
}
try {
  execFileSync(process.execPath, [
    TSC,
    join(saida, 'src', 'sceneTruth.ts'), join(saida, 'src', 'visualMode.ts'),
    '--outDir', join(saida, 'out'), '--module', 'commonjs', '--target', 'es2022',
    '--moduleResolution', 'node', '--skipLibCheck', '--rootDir', join(saida, 'src'),
  ], { stdio: 'pipe' })
  writeFileSync(join(saida, 'out', 'package.json'), JSON.stringify({ type: 'commonjs' }))
} catch (e) {
  console.error('Nao consegui compilar:\n', e.stdout?.toString() || e.message)
  process.exit(1)
}
const ST = requerer(join(saida, 'out', 'sceneTruth.js'))
const VM = requerer(join(saida, 'out', 'visualMode.js'))

let falhas = 0, total = 0
const checa = (nome, cond, det = '') => {
  total += 1
  if (!cond) { falhas += 1; console.error(`  x ${nome}${det ? ` — ${det}` : ''}`) }
}

console.log('\nKINEO — Contrato Cena Verdadeira + Diretor de Formato\n')

// ── O ROTEIRO NOAA, como o usuario escreveu ──────────────────────────────
const ROTEIRO_NOAA =
  'Satellites just spotted something spreading across the Gulf near two ships ' +
  'that sank in World War Two. NOAA reports oil sheens near the Norlindo and ' +
  'the Joseph M. Cudahy. Both were torpedoed in 1942 — a German U-boat sank ' +
  'the Norlindo. The Coast Guard is monitoring the sheen. Officials have not ' +
  'confirmed that either wreck is leaking.'

// ═══ GATE 2 — FORMATO ════════════════════════════════════════════════════
{
  const d = VM.decidirFormato(ROTEIRO_NOAA, false)
  checa('GATE 2: NOAA vira documentary_faceless SEM a tag [faceless]',
    d.modo === 'documentary_faceless', `${d.modo} — ${d.motivo}`)
  checa('GATE 2: apresentador NAO foi pedido', d.apresentadorPedido === false)
  checa('GATE 2: o modo NAO permite cena de apresentador',
    VM.permiteApresentador(d.modo) === false)

  const proib = VM.proibidosPorModo(d.modo)
  checa('GATE 2: host proibido', proib.includes('host'))
  checa('GATE 2: falar para a lente proibido', proib.includes('looking directly into the camera'))
  checa('GATE 2: rosto em primeiro plano proibido', proib.includes('close-up of a face'))
}

// ── o formato ainda respeita quem PEDE apresentador ──────────────────────
{
  const pedido = VM.decidirFormato('Make a video of me talking to the camera about my week', false)
  checa('quem pede apresentador continua tendo apresentador',
    pedido.modo === 'presenter' && pedido.apresentadorPedido === true, pedido.modo)
  checa('modo presenter nao proibe nada', VM.proibidosPorModo('presenter').length === 0)

  const tag = VM.decidirFormato('qualquer coisa [faceless]', true)
  checa('a tag antiga continua valendo', tag.modo === 'documentary_faceless')

  const hist = VM.decidirFormato('This is his story. He was born in a small village.', false)
  checa('historia de personagem vira character_story', hist.modo === 'character_story', hist.modo)
  checa('character_story ainda proibe falar para a lente',
    VM.proibidosPorModo('character_story').includes('looking directly into the camera'))
}

// ═══ GATE 1 — CONTRATO CENA VERDADEIRA ═══════════════════════════════════
const FALA_UBOAT = 'Both were torpedoed in 1942 — a German U-boat sank the Norlindo.'
const PROIBIDOS = VM.proibidosPorModo('documentary_faceless')

{
  // A CENA ERRADA que a producao entregou: rosto submerso fazendo bolhas.
  const errada = ST.montarContrato({
    indice: 4,
    falaFinal: FALA_UBOAT,
    promptFinal: 'a young boy underwater, face close to the lens, bubbles from mouth rising, ' +
      'sunlight filtering through the water, natural lighting, warm color palette',
    elementosProibidos: PROIBIDOS,
  })
  checa('GATE 1: a fala do U-boat extrai o sujeito',
    errada.sujeitoObrigatorio.includes('u-boat'), JSON.stringify(errada.sujeitoObrigatorio))

  const r = ST.verificarContrato(errada)
  checa('GATE 1: o menino fazendo bolhas REPROVA',
    r.veredicto !== 'aprovada', `${r.veredicto} — ${r.motivo}`)
  checa('GATE 1: e a reprovacao nomeia o motivo',
    r.proibidosEncontrados.length > 0 || r.sujeitosSemRepresentacao.length > 0, r.motivo)
}

{
  // A CENA CERTA: submarino / destrocos.
  const certa = ST.montarContrato({
    indice: 4,
    falaFinal: FALA_UBOAT,
    promptFinal: 'the rusted hull of a sunken cargo ship resting on the seabed, ' +
      'a submarine silhouette passing in the distance, sonar sweep overlay, ' +
      'cold blue water, natural lighting, light film grain',
    elementosProibidos: PROIBIDOS,
  })
  const r = ST.verificarContrato(certa)
  checa('GATE 1: submarino + destrocos APROVA', r.veredicto === 'aprovada',
    `${r.veredicto} — ${r.motivo}`)
}

{
  // Sujeito ausente: a imagem nao mostra NADA que represente o U-boat.
  const vazia = ST.montarContrato({
    indice: 4,
    falaFinal: FALA_UBOAT,
    promptFinal: 'an empty beach at sunset, seagulls flying, warm light',
    elementosProibidos: PROIBIDOS,
  })
  const r = ST.verificarContrato(vazia)
  checa('GATE 1: praia vazia reprova por sujeito ausente',
    r.veredicto === 'sujeito_ausente', `${r.veredicto} — ${r.motivo}`)
  checa('GATE 1: aponta QUAL sujeito ficou sem imagem',
    r.sujeitosSemRepresentacao.includes('u-boat'))
}

{
  // Apresentador numa cena de documentario: proibido pelo modo.
  const host = ST.montarContrato({
    indice: 1,
    falaFinal: 'Satellites just spotted something spreading across the Gulf.',
    promptFinal: 'The man stands in front of a map, looking directly into the camera, ' +
      'engaging the audience with urgency.',
    elementosProibidos: PROIBIDOS,
  })
  const r = ST.verificarContrato(host)
  checa('GATE 2: cena de apresentador reprova em documentario',
    r.veredicto === 'elemento_proibido', `${r.veredicto} — ${r.motivo}`)
}

// ── o lexico nao inventa exigencia para fala generica ────────────────────
{
  const generica = ST.montarContrato({
    indice: 7,
    falaFinal: 'And that is why nobody knows the answer yet.',
    promptFinal: 'abstract dark water texture, slow drift, moody light',
    elementosProibidos: PROIBIDOS,
  })
  checa('fala sem entidade concreta nao exige nada',
    ST.verificarContrato(generica).veredicto === 'aprovada')
  checa('e nao extrai sujeito do nada',
    ST.montarContrato({ indice: 7, falaFinal: 'And that is why nobody knows.', promptFinal: 'x' })
      .sujeitoObrigatorio.length === 0)
}

// ── satelite e coast guard, as outras entidades do mesmo roteiro ─────────
{
  const sat = ST.montarContrato({
    indice: 1,
    falaFinal: 'Satellites just spotted something spreading across the Gulf.',
    promptFinal: 'aerial view of the Gulf from above, iridescent sheen on the water surface',
    elementosProibidos: PROIBIDOS,
  })
  checa('satelite: vista aerea representa', ST.verificarContrato(sat).veredicto === 'aprovada',
    ST.verificarContrato(sat).motivo)

  // DUAS entidades na mesma fala: as DUAS precisam aparecer.
  // Este caso nasceu de uma falha do proprio teste — eu escrevi um prompt que
  // mostrava o navio e esquecia a mancha, e o gate reprovou. O gate estava
  // certo: a frase fala das duas coisas.
  const soNavio = ST.montarContrato({
    indice: 5,
    falaFinal: 'The Coast Guard is monitoring the sheen.',
    promptFinal: 'a coast guard cutter cutting through open water, wake behind it',
    elementosProibidos: PROIBIDOS,
  })
  const rSoNavio = ST.verificarContrato(soNavio)
  checa('duas entidades: mostrar so o navio REPROVA',
    rSoNavio.veredicto === 'sujeito_ausente', `${rSoNavio.veredicto} — ${rSoNavio.motivo}`)
  checa('e aponta que faltou a mancha',
    rSoNavio.sujeitosSemRepresentacao.includes('oil sheen'),
    JSON.stringify(rSoNavio.sujeitosSemRepresentacao))

  const cg = ST.montarContrato({
    indice: 5,
    falaFinal: 'The Coast Guard is monitoring the sheen.',
    promptFinal: 'a coast guard cutter cutting through open water, an iridescent ' +
      'oil sheen spreading across the water surface ahead of it',
    elementosProibidos: PROIBIDOS,
  })
  checa('navio + mancha juntos APROVAM',
    ST.verificarContrato(cg).veredicto === 'aprovada', ST.verificarContrato(cg).motivo)
}

console.log(falhas === 0
  ? `\n${total} VERIFICACOES OK — GATE 1 e GATE 2 fechados.\n`
  : `\n${falhas} FALHAS em ${total} verificacoes.\n`)
process.exit(falhas === 0 ? 0 : 1)
