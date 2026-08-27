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
  // A ancora generica TEM falsos positivos — narracao abstrata sobre imagem
  // abstrata pode nao partilhar palavra nenhuma. Por isso o veredito dela e
  // AVISO: registra e segue. O que este teste garante e que uma cena assim
  // NUNCA e tratada como algo a corrigir.
  const rg = ST.verificarContrato(generica)
  checa('fala abstrata nunca vira correcao',
    ST.severidadeDe(rg.veredicto) !== 'corrigir', `${rg.veredicto} — ${rg.motivo}`)
  checa('e o prompt sai intocado',
    ST.aplicarContrato(generica).promptCorrigido === generica.promptFinal)
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

// ══════════════════════════════════════════════════════════════════════════
// D1 — O CALLER EXISTE E ESTA NO LUGAR CERTO (inspecao estatica da rota)
//
// Este bloco existe porque a primeira versao passou 24 verificacoes com a
// biblioteca DESLIGADA em producao. Teste de biblioteca nao prova produto.
// Aqui a gente le o arquivo da rota e prova que a chamada acontece ANTES do
// POST pago, com a fala certa, e que o prompt enviado e o CORRIGIDO.
{
  const rota = readFileSync(join(raiz, 'app/api/generate-video-cinematic/route.ts'), 'utf8')
  // Comentarios fora: assercao ja casou no proprio comentario explicativo
  // quatro vezes neste repositorio.
  const codigo = rota.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n')

  checa('D1 rota importa sceneTruth', /import \{[^}]*aplicarContrato[^}]*\} from '@\/lib\/cinematic\/sceneTruth'/.test(codigo))
  checa('D1 rota chama montarContrato', /montarContrato\(\{/.test(codigo))
  checa('D1 rota chama aplicarContrato', /aplicarContrato\(contrato\)/.test(codigo))

  const iAplica = codigo.indexOf('aplicarContrato(contrato)')
  const iPost = codigo.indexOf('await submitToFal(scenePrompt,')
  checa('D1 aplicarContrato vem ANTES do submitToFal', iAplica > 0 && iPost > 0 && iAplica < iPost,
    `aplicar=${iAplica} post=${iPost}`)

  checa('D1 o prompt submetido e o CORRIGIDO', /scenePrompt = r\.promptCorrigido/.test(codigo))
  checa('D1 a fala usada e o voiceover da cena', /falaFinal: hs\.voiceover/.test(codigo))
  checa('D1 o veredito vai para o claim', /contrato_cena: contratoRelato/.test(codigo))
  checa('D1 o gate NAO derruba render pago', /seguindo sem corrigir/.test(rota))
}

// ══════════════════════════════════════════════════════════════════════════
// D2 — acaoObrigatoria E PREENCHIDA E VERIFICADA (era null fixo)
{
  checa('D2 acao extraida da fala', ST.extrairAcao('A German U-boat sank it in 1942.') === 'sank')
  checa('D2 fala sem acao conhecida devolve null', ST.extrairAcao('The team studied the data.') === null)

  const c = ST.montarContrato({
    indice: 1,
    falaFinal: 'A German U-boat sank it in 1942.',
    promptFinal: 'a rusted submarine hull on the seabed, sonar sweep',
    elementosProibidos: PROIBIDOS,
  })
  checa('D2 montarContrato NAO grava null quando a acao existe', c.acaoObrigatoria === 'sank', String(c.acaoObrigatoria))

  const contrariado = ST.montarContrato({
    indice: 2,
    falaFinal: 'A German U-boat sank it in 1942.',
    promptFinal: 'a submarine and a pristine ship sailing on the surface at full steam',
    elementosProibidos: PROIBIDOS,
  })
  const rc = ST.verificarContrato(contrariado)
  checa('D2 imagem que contradiz a acao REPROVA', rc.veredicto === 'acao_contrariada', `${rc.veredicto} — ${rc.motivo}`)
  checa('D2 e nomeia a contradicao', rc.contradicoesDeAcao.length > 0, JSON.stringify(rc.contradicoesDeAcao))
}

// ══════════════════════════════════════════════════════════════════════════
// D3 — SUJEITO FORA DO LEXICO NAO PASSA MAIS EM SILENCIO
//
// O lexico cobre 5 entidades. Antes, QUALQUER outro assunto produzia
// contrato vazio e era aprovado por definicao — o gate era cego para quase
// todo o produto. Agora entra a ancora generica.
{
  const fora = ST.montarContrato({
    indice: 1,
    falaFinal: 'The pyramid of Giza still hides a sealed corridor.',
    promptFinal: 'a golden retriever running on a suburban lawn at sunset',
    elementosProibidos: PROIBIDOS,
  })
  const rf = ST.verificarContrato(fora)
  checa('D3 fala e imagem sem NADA em comum reprovam', rf.veredicto === 'sem_ancora_comum', `${rf.veredicto} — ${rf.motivo}`)
  checa('D3 cobertura declarada como generica', rf.cobertura === 'generica', rf.cobertura)

  const coerente = ST.montarContrato({
    indice: 2,
    falaFinal: 'The pyramid of Giza still hides a sealed corridor.',
    promptFinal: 'the great pyramid at Giza, a narrow sealed corridor lit by a single beam',
    elementosProibidos: PROIBIDOS,
  })
  const rco = ST.verificarContrato(coerente)
  checa('D3 imagem coerente fora do lexico APROVA', rco.veredicto === 'aprovada', rco.motivo)

  const abstrata = ST.montarContrato({
    indice: 3,
    falaFinal: 'And then it was over.',
    promptFinal: 'an empty corridor, dust in the light',
    elementosProibidos: PROIBIDOS,
  })
  const ra = ST.verificarContrato(abstrata)
  checa('D3 fala abstrata nao inventa exigencia', ra.veredicto === 'aprovada', ra.motivo)
  checa('D3 e declara cobertura nenhuma', ra.cobertura === 'nenhuma', ra.cobertura)

  checa('D3 sem_ancora_comum e AVISO, nao reprovacao', ST.severidadeDe('sem_ancora_comum') === 'aviso')
  checa('D3 elemento_proibido manda corrigir', ST.severidadeDe('elemento_proibido') === 'corrigir')
}

// ══════════════════════════════════════════════════════════════════════════
// A CORRECAO — o menino da bolha morre mesmo se o texto se corromper de novo
{
  const bolha = ST.montarContrato({
    indice: 4,
    falaFinal: 'A German U-boat sank it in 1942.',
    promptFinal: 'a boy underwater, bubbles from mouth, deep blue water',
    elementosProibidos: PROIBIDOS,
  })
  const r = ST.aplicarContrato(bolha)
  checa('correcao: entrada era reprovada', ST.severidadeDe(r.antes.veredicto) === 'corrigir', r.antes.veredicto)
  checa('correcao: o menino saiu do prompt', !/\bboy\b/i.test(r.promptCorrigido), r.promptCorrigido)
  checa('correcao: as bolhas sairam', !/bubbles from mouth/i.test(r.promptCorrigido), r.promptCorrigido)
  checa('correcao: o submarino entrou', /submarine/i.test(r.promptCorrigido), r.promptCorrigido)
  checa('correcao: entrou no INICIO (token inicial pesa mais)',
    r.promptCorrigido.toLowerCase().indexOf('submarine') < 12, r.promptCorrigido)
  checa('correcao: o resultado passa no proprio gate', r.depois.veredicto === 'aprovada', r.depois.motivo)
  checa('correcao: as acoes ficam registradas', r.acoes.length >= 2, JSON.stringify(r.acoes))

  const limpo = ST.montarContrato({
    indice: 5,
    falaFinal: 'A German U-boat sank it in 1942.',
    promptFinal: 'a rusted submarine hull resting on the seabed, sonar sweep passing over it',
    elementosProibidos: PROIBIDOS,
  })
  const rl = ST.aplicarContrato(limpo)
  checa('correcao: cena boa passa INTOCADA', rl.promptCorrigido === limpo.promptFinal)
  checa('correcao: e sem acoes', rl.acoes.length === 0)
}


// ══════════════════════════════════════════════════════════════════════════
// D4 — O GATE COBRE OS 8 MOTORES (caminho classico + caminho hollywood)
//
// MEDIDO em producao: `hollywoodPath = wantsHollywood || wantsH3 || wantsOmni`
// cobria 3 motores. VEO, KLING 2.5, SEEDANCE e KINEO 1 iam pelo caminho
// classico, SEM verificacao fala x imagem — e foram 349 das 350 entregas dos
// ultimos 14 dias. Prova do buraco: o render 705368ff (Veo, 9/9 aceitas)
// gravou visual_mode e contrato_cena NULOS.
{
  const rota = readFileSync(join(raiz, 'app/api/generate-video-cinematic/route.ts'), 'utf8')
  const codigo = rota.split('\n').filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('*')).join('\n')

  // Os DOIS caminhos chamam o contrato.
  const chamadas = (codigo.match(/aplicarContrato\(contrato\)/g) ?? []).length
  checa('D4 aplicarContrato e chamado em DOIS lugares', chamadas === 2, `achei ${chamadas}`)

  // O classico usa a fala da cena.
  checa('D4 classico usa scene.voiceover como fala',
    /falaFinal: scene\.voiceover \?\? ''/.test(codigo))
  // O hollywood usa a fala da cena dele.
  checa('D4 hollywood usa hs.voiceover como fala',
    /falaFinal: hs\.voiceover \?\? ''/.test(codigo))

  // O prompt submetido no classico e o CORRIGIDO.
  checa('D4 classico submete o prompt corrigido',
    /cinematic = r\.promptCorrigido/.test(codigo))
  // e o bruto virou variavel separada (prova de que nao ficou sobrescrito).
  checa('D4 classico separa bruto de corrigido',
    /const cinematicBruto = buildFacelessCinematicPrompt/.test(codigo))

  // ORDEM: o gate roda ANTES do POST pago no classico.
  const iGateClassico = codigo.indexOf('cinematic = r.promptCorrigido')
  const iPostClassico = codigo.indexOf('dispatchOneSceneWithSafeVisualRetry({')
  checa('D4 no classico o gate vem ANTES do despacho',
    iGateClassico > 0 && iPostClassico > 0 && iGateClassico < iPostClassico,
    `gate=${iGateClassico} post=${iPostClassico}`)

  // Auditavel: os DOIS caminhos gravam o veredito no claim.
  checa('D4 hollywood grava contrato_cena no claim', /contrato_cena: contratoRelato,/.test(codigo))
  checa('D4 classico grava contrato_cena no claim', /contrato_cena: contratoRelatoClassico,/.test(codigo))
  checa('D4 os dois gravam visual_mode', (codigo.match(/visual_mode: formatoVisual\.modo/g) ?? []).length === 2)

  // NUNCA bloqueia: os dois tem try/catch que segue com o prompt bruto.
  checa('D4 os dois caminhos seguem em caso de falha do gate',
    (rota.match(/seguindo sem corrigir/g) ?? []).length === 2)
}


console.log(falhas === 0
  ? `\n${total} VERIFICACOES OK — D1..D4 fechados — o gate cobre os 8 motores, provado na rota.\n`
  : `\n${falhas} FALHAS em ${total} verificacoes.\n`)
process.exit(falhas === 0 ? 0 : 1)
