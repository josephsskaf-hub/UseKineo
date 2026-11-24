// KINEO-H3-TURBO-0511 — guardião da disponibilidade pública do H3 Turbo e da escolha e leitura de cenas no caminho clássico.
// Rodar: node scripts/test-h3-turbo-0511.mjs
import fs from 'node:fs'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'

const lf = (f) => fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n')
const flags = 'lib/engineLaunch.ts'
const R = lf('app/api/generate-video-cinematic/route.ts'), S = lf('app/api/cinematic-clip-status/route.ts'), C = lf('lib/classicSceneRetry.ts'), M = 'minimax/h3-max-turbo/image-to-video'
let pass = 0, fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ', m) } else { fail++; console.log('  FALHA', m) } }
const contaDaCasa = 'casa@fixture.invalid'
const visitante = 'visitante@fixture.invalid'
const carregaLancamento = (editaFlags = (texto) => texto) => {
  const load = createOfflineLoader({
    mocks: { '@/lib/internalAccounts': { isInternalEmail: (email) => email === contaDaCasa } },
    source: (arquivo, texto) => arquivo === flags ? editaFlags(texto) : texto,
  })
  return {
    publico: load('@/lib/engineLaunch').H3_TURBO_PUBLIC,
    temAcesso: load('@/lib/engineLaunchAccess').h3TurboNoFilmePadrao,
  }
}
const paraTodos = ({ publico, temAcesso }) => publico === true && temAcesso(visitante) === true && temAcesso(null) === true
ok(paraTodos(carregaLancamento()), 'a régua de lançamento do servidor abre o H3 Turbo ao público')
const desligado = carregaLancamento((texto) => texto.replace('export const H3_TURBO_PUBLIC = true', 'export const H3_TURBO_PUBLIC = false'))
ok(!paraTodos(desligado) && desligado.publico === false && desligado.temAcesso(visitante) === false &&
  desligado.temAcesso(null) === false && desligado.temAcesso(contaDaCasa) === true,
'mutante: desligar fecha para visitantes e mantém o acesso da casa')
ok(S.includes("const H3_TURBO_I2V_MODEL = '" + M + "'") && S.includes('  H3_TURBO_I2V_MODEL, // KINEO-H3-TURBO-0511'), 'a consulta de status aceita o modelo; sem isso o clipe pago morria em 503')
ok(C.includes('VEO_I2V_MODEL, H3_TURBO_I2V_MODEL])'), 'a retomada de cena conhece o modelo')
const ramo = R.slice(R.indexOf('if (model === H3_TURBO_I2V_MODEL) {'), R.indexOf('if (model === SEEDANCE_I2V_MODEL) {'))
ok(ramo.includes("resolution: '768P'") && ramo.includes("prompt_expansion_mode: 'disabled'") && ramo.includes('image_url: imageUrl') && !ramo.includes('generate_audio'), 'a entrada segue o esquema da fal')
ok(R.includes('const i2vDoFilmePadrao = H3_TURBO_I2V_MODEL // KINEO-SEEDANCE-SAI-1111'), 'o caminho clássico, incluindo filme grátis fora do Kling 4 e desenho infantil, usa H3 Turbo para animar a imagem')
ok(R.includes('model === SEEDANCE_MODEL ? i2vDoFilmePadrao') &&
  R.includes('const t2vVivo = model === SEEDANCE_MODEL ? H3_TURBO_T2V_MODEL : model') &&
  R.includes(': [t2vVivo] // KINEO-SEEDANCE-SAI-1111'), 'o envio clássico usa H3 Turbo com imagem e na reserva de texto')
ok(lf('lib/compose.ts').includes("{ volume: '0%' }"), 'a montagem clássica zera o som nativo do clipe')
console.log('\n' + pass + ' ok, ' + fail + ' falha(s)')
process.exit(fail ? 1 : 0)
