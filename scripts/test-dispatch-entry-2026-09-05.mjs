// Guardião do KINEO-DISPATCH-ENTRY-2026-09-05.
//
// O QUE ELE PROVA, e por que existe: em 05/09 medi 4 pessoas (pós-marco) que
// apertaram gerar e receberam SILÊNCIO — zero render_jobs, zero vídeos, zero
// generation_stage_error, zero cinematic_dispatch_result. O rastro delas é
// 100% de eventos de CLIENTE e termina em `render_wait_abandoned` de 1 a 4
// segundos depois do clique. Com esse rastro é IMPOSSÍVEL dizer se o POST
// chegou ao servidor. Este guardião lê os ARQUIVOS REAIS das duas rotas de
// despacho e exige que a prova de chegada exista, seja fire-and-forget e não
// vaze o texto do cliente.
import fs from 'node:fs'

let ok = 0, fail = 0
const check = (nome, cond, detalhe = '') => {
  if (cond) { ok++; console.log(`  ok   ${nome}`) }
  else { fail++; console.log(`  FAIL ${nome}${detalhe ? ' — ' + detalhe : ''}`) }
}

const ROTAS = [
  { arquivo: 'app/api/generate-video-fast/route.ts', path: '/api/generate-video-fast', engine: 'fast' },
  { arquivo: 'app/api/generate-video-cinematic/route.ts', path: '/api/generate-video-cinematic', engine: 'cinematic' },
]

for (const r of ROTAS) {
  console.log(`\n── ${r.arquivo}`)
  const src = fs.readFileSync(r.arquivo, 'utf8')

  // 1. O evento existe, exatamente uma vez.
  const n = src.split("name: 'generation_dispatch_received'").length - 1
  check('1. emite generation_dispatch_received exatamente 1x', n === 1, `encontrei ${n}`)

  // Recorta o bloco da chamada para inspecionar só ele.
  const i = src.indexOf("name: 'generation_dispatch_received'")
  const bloco = i >= 0 ? src.slice(Math.max(0, i - 400), i + 600) : ''

  // 2. Fire-and-forget: `void writeServerEvent({` — nunca `await`. Telemetria
  //    que atrasa o despacho pagaria com o próprio render que veio medir.
  check('2. e fire-and-forget (void, nunca await)',
    /void writeServerEvent\(\{/.test(bloco) && !/await writeServerEvent\(\{\s*\n\s*name: 'generation_dispatch_received'/.test(src))

  // 3. Carrega o dono e o caminho certos — sem user_id o evento não liga a
  //    pessoa ao silêncio, que é a única pergunta que ele existe para responder.
  check('3. carrega userId: user.id', /userId: user\.id/.test(bloco))
  check(`4. carrega path '${r.path}'`, bloco.includes(`path: '${r.path}'`))
  check(`5. carrega engine '${r.engine}'`, bloco.includes(`engine: '${r.engine}'`))

  // 6. PRIVACIDADE: só o tamanho do texto, nunca o texto. A rota fast já tinha
  //    essa regra escrita em prompt_too_long; aqui ela vira teste.
  check('6. registra prompt_length (tamanho)', /prompt_length: prompt\.length/.test(bloco))
  check('7. NAO vaza o texto do cliente (sem `prompt:` cru no bloco)',
    !/\bprompt: (prompt|promptRaw|body\.prompt)\b/.test(bloco))

  // 8. O evento tem de nascer ANTES do trabalho caro DENTRO do handler. A 1a
  //    versão desta verificação comparava com a primeira MENÇÃO no arquivo e
  //    reprovava um código correto: os marcos caros aparecem antes, em
  //    definições de helper. Ordem de execução mede-se a partir do `POST`.
  const iPost = src.indexOf('export async function POST')
  check('8a. o handler POST existe', iPost >= 0)
  const iEvt = src.indexOf("name: 'generation_dispatch_received'")
  check('8b. o evento e emitido DENTRO do handler POST', iEvt > iPost)
  const marcosCaros = ['submitToFal', 'chat.completions', 'creatomate.com', 'deductCredits', 'claimCredits']
  const iCaro = marcosCaros
    .map((m) => src.indexOf(m, iPost))
    .filter((x) => x >= 0)
    .sort((a, b) => a - b)[0]
  check('8c. nasce ANTES do primeiro trabalho caro do handler',
    iEvt >= 0 && (iCaro === undefined || iEvt < iCaro),
    iCaro === undefined ? 'nenhum marco caro dentro do POST' : `evento em ${iEvt}, marco caro em ${iCaro}`)

  // 9. O import de que ele depende continua lá (mutação óbvia: alguém "limpa"
  //    imports e o arquivo passa a não compilar — melhor falhar aqui e explicar).
  check('9. importa writeServerEvent', /import \{[^}]*writeServerEvent[^}]*\} from '@\/lib\/serverEvents'/.test(src))
}

// 10. O par cinematic: o generation_id tem de viajar, senão não dá para casar
//     a chegada com o `cinematic_dispatch_result` do MESMO despacho.
const cin = fs.readFileSync('app/api/generate-video-cinematic/route.ts', 'utf8')
const iCin = cin.indexOf("name: 'generation_dispatch_received'")
console.log('\n── par cinematic')
check('10. cinematic carrega generation_id para casar com cinematic_dispatch_result',
  /generation_id: generationId/.test(cin.slice(iCin, iCin + 600)))

// 11. `generationId` já tem de estar VALIDADO quando o evento sai — emitir
//     antes da validação gravaria id inválido e sujaria a correlação.
check('11. cinematic emite DEPOIS de validCinematicGenerationId',
  cin.indexOf('validCinematicGenerationId(generationId)') >= 0 &&
  cin.indexOf('validCinematicGenerationId(generationId)') < iCin)

console.log(`\n${ok} ok, ${fail} fail`)
process.exit(fail === 0 ? 0 : 1)
