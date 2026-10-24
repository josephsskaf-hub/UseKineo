#!/usr/bin/env node
// KINEO-APRESENTADORES-2410 — only --generate --allow-paid can call the existing paid generator.
import { fileURLToPath } from 'node:url'
import { dirname, resolve, join } from 'node:path'
import { mkdir, writeFile } from 'node:fs/promises'
import { loadCatalog, buildPlan, inspectAssets, startAdmin, importCandidate, generateCandidates } from './lib/apresentadores-admin2410.mjs'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const allowedFlags = ['--help', '--dry-run', '--plan', '--serve', '--import', '--generate', '--allow-paid', '--all', '--id', '--source', '--face-source', '--voice-source', '--crop', '--sharp-module']
const valueFlags = ['--id', '--source', '--face-source', '--voice-source', '--crop', '--sharp-module']
const options = {}
try {
  for (let index = 0; index < args.length; index++) {
    const arg = args[index]
    if (!allowedFlags.includes(arg) || Object.hasOwn(options, arg)) throw new Error(`Opção inválida ou repetida: ${arg}`)
    if (valueFlags.includes(arg)) {
      if (!args[index + 1] || args[index + 1].startsWith('--')) throw new Error(`Falta valor para ${arg}`)
      options[arg] = args[++index]
    } else options[arg] = true
  }
  if (options['--help']) {
    console.log(`KINEO-APRESENTADORES-2410 — ferramenta local (sem .env)

node scripts/apresentadores-2410.mjs                      Inspeciona; não escreve nem gera.
node scripts/apresentadores-2410.mjs --plan               Grava jobs em docs/previews/apresentadores-2410-plan.json.
node scripts/apresentadores-2410.mjs --serve              Abre admin em origem aleatória 127.0.0.1 (Ctrl+C encerra).
node scripts/apresentadores-2410.mjs --import --id ID --source FOTO --crop x,y,w,h [--sharp-module ARQUIVO]
node scripts/apresentadores-2410.mjs --import --id ID --source CORPO.webp --face-source ROSTO.webp [--voice-source VOZ.mp3]
node scripts/apresentadores-2410.mjs --import --id ID --voice-source VOZ.mp3

FUTURO, SOMENTE COM AUTORIZAÇÃO PARA GASTO:
KINEO_BASE_URL e KINEO_FOUNDER_COOKIE devem ser passados no ambiente da sessão.
node scripts/apresentadores-2410.mjs --generate --allow-paid --id ID
node scripts/apresentadores-2410.mjs --generate --allow-paid --all

Um pedido de corpo inteiro por candidato via /api/images/generate. Rosto = recorte local da mesma imagem.
Não gera voz automaticamente. Importe a amostra MiniMax do mapeamento do candidato antes de aprovar.
Decisões são locais, exigem Joseph Skaf e revisão. Commit/publicação seguem o processo do fundador.`)
  } else {
    const modes = ['--dry-run', '--plan', '--serve', '--import', '--generate'].filter((mode) => options[mode])
    if (modes.length > 1) throw new Error('Escolha somente um modo por execução.')
    const mode = modes[0] ?? '--dry-run'
    if (options['--allow-paid'] && mode !== '--generate' || options['--all'] && mode !== '--generate') throw new Error('--allow-paid e --all só são válidos com --generate.')
    if (mode !== '--import' && valueFlags.filter((flag) => flag !== '--id').some((flag) => options[flag])) throw new Error('Fontes, crop e sharp-module só são válidos com --import.')
    if (mode === '--serve') {
      const { origin } = await startAdmin(root)
      console.log(`Admin local: ${origin}\nNão gera imagens. Ctrl+C encerra. Confirmação de identidade é local; nenhuma autenticação online é criada.`)
    } else if (mode === '--import') {
      if (!options['--id']) throw new Error('--import exige --id.')
      const result = await importCandidate(root, { id: options['--id'], source: options['--source'], faceSource: options['--face-source'], voiceSource: options['--voice-source'], crop: options['--crop'], sharpModule: options['--sharp-module'] })
      console.log(`Arquivos locais importados. Aprovação anterior revogada; decisão pendente (recusados continuam recusados). Catálogo ${result.hash.slice(0, 12)}.`)
    } else if (mode === '--generate') {
      const results = await generateCandidates(root, { id: options['--id'], all: options['--all'] === true, allowPaid: options['--allow-paid'] === true })
      for (const result of results) console.log(`${result.id}: ${result.skipped ? 'fonte existente preservada; sem nova chamada' : 'fonte local preparada'} em ${result.file}. Importe com recorte de rosto manual e confira no admin.`)
    } else {
      const catalog = await loadCatalog(root)
      if (mode === '--plan') {
        const folder = join(root, 'docs', 'previews')
        await mkdir(folder, { recursive: true })
        await writeFile(join(folder, 'apresentadores-2410-plan.json'), `${JSON.stringify(buildPlan(catalog.entries), null, 2)}\n`)
        console.log('Plano preparado em docs/previews/apresentadores-2410-plan.json. Zero chamadas externas; zero gasto.')
      } else {
        console.log('DRY RUN — somente leitura. Nenhuma chamada externa, credencial, .env ou gravação.')
        for (const entry of catalog.entries) {
          const inspected = await inspectAssets(root, entry)
          console.log(`${entry.id}: ${entry.status}; arquivos ${inspected.ready ? 'prontos' : 'pendentes'}; aprovação ${inspected.approvalCurrent ? 'conferida' : 'não liberada'}`)
        }
      }
    }
  }
} catch (error) {
  // Never log raw fetch errors, response bodies, URLs or environment values: a cookie may contain secrets.
  console.error(error.status || error.name === 'Error' && !error.cause ? error.message : 'Falha local. Confira opções e arquivos; nenhum segredo é exibido.')
  process.exitCode = 1
}
