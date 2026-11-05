// KINEO-H3-TURBO-0511 — guardião: o filme padrão anima no H3 Max Turbo só para quem o interruptor manda; a consulta de status conhece o modelo.
// Rodar: node scripts/test-h3-turbo-0511.mjs
import fs from 'node:fs'
const lf = (f) => fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n')
const R = lf('app/api/generate-video-cinematic/route.ts'), E = lf('lib/engineLaunch.ts'), S = lf('app/api/cinematic-clip-status/route.ts'), C = lf('lib/classicSceneRetry.ts'), M = 'minimax/h3-max-turbo/image-to-video'
let pass = 0, fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ', m) } else { fail++; console.log('  FALHA', m) } }
const interno = (t) => t.includes('export const H3_TURBO_PUBLIC = false as boolean') && t.includes('return H3_TURBO_PUBLIC || isInternalEmail(email)')
ok(interno(E), 'desligado para o público: só as contas da casa')
ok(!interno(E.replace('H3_TURBO_PUBLIC = false', 'H3_TURBO_PUBLIC = true')), 'mutante: ligar sem revisar fica vermelho')
ok(S.includes("const H3_TURBO_I2V_MODEL = '" + M + "'") && S.includes('  H3_TURBO_I2V_MODEL, // KINEO-H3-TURBO-0511'), 'a consulta de status aceita o modelo; sem isso o clipe pago morria em 503')
ok(C.includes('VEO_I2V_MODEL, H3_TURBO_I2V_MODEL])'), 'a retomada de cena conhece o modelo')
const ramo = R.slice(R.indexOf('if (model === H3_TURBO_I2V_MODEL) {'), R.indexOf('if (model === SEEDANCE_I2V_MODEL) {'))
ok(ramo.includes("resolution: '768P'") && ramo.includes("prompt_expansion_mode: 'disabled'") && ramo.includes('image_url: imageUrl') && !ramo.includes('generate_audio'), 'a entrada segue o esquema da fal')
ok(R.includes('const i2vDoFilmePadrao = h3TurboNoFilmePadrao(user.email) ? H3_TURBO_I2V_MODEL : SEEDANCE_I2V_MODEL'), 'a escolha lê o interruptor pelo e-mail da conta')
ok(R.includes('model === SEEDANCE_MODEL ? i2vDoFilmePadrao'), 'o envio por cena usa a escolha; a reserva de texto segue sendo o modelo de antes')
ok(lf('lib/compose.ts').includes("{ volume: '0%' }"), 'a montagem clássica zera o som nativo do clipe')
console.log('\n' + pass + ' ok, ' + fail + ' falha(s)')
process.exit(fail ? 1 : 0)
