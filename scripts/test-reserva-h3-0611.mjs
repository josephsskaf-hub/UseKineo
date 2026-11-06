// KINEO-RESERVA-H3-0611 — guardião sem rede: a reserva do filme grátis vai de H3 só com as 3 imagens; envio, claim e selo seguem a mesma regra.
import fs from 'node:fs'
import ts from 'typescript'
const ler = (f) => fs.readFileSync(f, 'utf8').replace(/\r\n/g, '\n')
let falhas = 0
const checa = (n, c) => { console.log((c ? '  ok  ' : '  FALHA ') + n); if (!c) falhas++ }
const claimFonte = ler('lib/cinematic/claim.ts')
const fonte = claimFonte.slice(claimFonte.indexOf('// RESERVA-INICIO'), claimFonte.indexOf('// RESERVA-FIM'))
const carrega = async (src) => import('data:text/javascript;base64,' + Buffer.from(ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText).toString('base64'))
const R = await carrega(fonte)
const img = (n) => ({ prompt: 'p' + n, duration: 7, image_url: 'https://x/' + n + '.jpg' })
checa('3 imagens: H3', R.modeloDaReservaDoTeste([img(1), img(2), img(3)]) === R.RESERVA_H3_MODEL)
checa('falta 1 imagem: Seedance no filme inteiro', R.modeloDaReservaDoTeste([img(1), { prompt: 'p', duration: 7 }, img(3)]) === R.RESERVA_SEEDANCE_MODEL)
checa('lista vazia: Seedance', R.modeloDaReservaDoTeste([]) === R.RESERVA_SEEDANCE_MODEL)
checa('endereço que não é https: Seedance', R.modeloDaReservaDoTeste([{ ...img(1), image_url: 'data:x' }, img(2), img(3)]) === R.RESERVA_SEEDANCE_MODEL)
const h3 = R.entradaDaReserva(img(1), R.RESERVA_H3_MODEL)
checa('corpo do H3', h3.image_url === 'https://x/1.jpg' && h3.duration === 7 && h3.resolution === '768P' && h3.prompt_expansion_mode === 'disabled' && !('generate_audio' in h3))
const sd = R.entradaDaReserva(img(1), R.RESERVA_SEEDANCE_MODEL)
checa('corpo do Seedance sem imagem e igual ao de antes', !('image_url' in sd) && sd.resolution === '720p' && sd.generate_audio === false && sd.duration === '7')
const mut = await carrega(fonte.replace('shots.every(temImagemDaReserva)', 'shots.some(temImagemDaReserva)'))
checa('mutante (aceita filme com cena sem imagem) é pego', mut.modeloDaReservaDoTeste([img(1), { prompt: 'p', duration: 7 }, img(3)]) === mut.RESERVA_H3_MODEL)
const envio = ler('lib/kling4TrialFallback.ts'), claim = ler('lib/cinematic/claim.ts'), rota = ler('app/api/generate-video-cinematic/route.ts'), selo = ler('lib/engineLabel.ts'), status = ler('app/api/compose/status/[renderId]/route.ts'), clip = ler('app/api/cinematic-clip-status/route.ts')
checa('envio e claim usam a mesma regra', envio.includes('modeloDaReservaDoTeste(shots)') && claim.includes('modeloDaReservaDoTeste(shots)'))
checa('envio sem repetição', envio.includes('submitKling4TrialH3Fallback') && !/retry/i.test(envio.slice(envio.indexOf('export async function submitKling4TrialH3Fallback'), envio.indexOf('/** Called only'))))
checa('imagem aprovada viaja no plano assinado', rota.includes('image_url: kling4ApprovedStills[i]'))
checa('caminho síncrono sem a trava do grátis; desenho segue no Seedance', rota.includes('h3TurboNoFilmePadrao(user.email) && !desenhoInfantil.ativo ? H3_TURBO_I2V_MODEL : SEEDANCE_I2V_MODEL'))
checa('Kling 4 entregue mantém o selo', selo.includes("teste.engine_used !== 'seedance15_fallback' && teste.engine_used !== 'seedance15_cap'") && selo.includes('claim.response?.kling4_paid || claim.response?.kling4_trial'))
checa('reserva grava o motor real nas 2 gravações', (status.match(/engineDaReservaDoGratis\(prepaidCinematicClaim\)/g) || []).length === 2)
checa('lista do claim aceita o H3', ler('lib/kling4TrialClaim.ts').includes("model === 'minimax/h3-max-turbo/image-to-video'"))
checa('status de clipe aceita H3', clip.includes('H3_TURBO_I2V_MODEL, //'))
if (falhas) { console.error(falhas + ' falha(s)'); process.exit(1) }
console.log('TUDO OK')
