// KINEO-MCP-RAIZ-2610 — guardião: a raiz /.well-known/oauth-protected-resource não anuncia OAuth.
// Motivo: o portal de plugins da OpenAI lia o anúncio da raiz (que descreve o /api/mcp/studio) e pedia login para o
// /api/mcp/chatgpt, que é anônimo ("Authorization required"). O Claude acha o login do Studio pelo resource_metadata
// do 401, que aponta para o caminho próprio /.well-known/oauth-protected-resource/api/mcp/studio.
//   A. a raiz devolve 404 antes de montar o documento (interruptor RAIZ_SEM_OAUTH = true);
//   B. o caminho próprio do Studio continua servindo o documento, sem a camada;
//   C. o 401 do Studio continua apontando para o caminho próprio;
//   D. o /api/mcp/chatgpt continua sem 401 e com noauth nas ferramentas;
//   E. desfaz exato (apagar as linhas marcadas = base) + mutante.
import fs from 'node:fs'
import { execFileSync } from 'node:child_process'

const MARCA = 'KINEO-MCP-RAIZ-2610'
const lf = (t) => t.replace(/\r\n/g, '\n')
const rd = (p) => lf(fs.readFileSync(p, 'utf8'))
const git = (...a) => lf(execFileSync('git', a, { encoding: 'utf8', maxBuffer: 1 << 26 }))
let ok = 0
const falhas = []
const checa = (n, c) => { if (c) { ok++; console.log('  ok  ' + n) } else { falhas.push(n); console.log('  FALHA ' + n) } }

const RAIZ = 'app/.well-known/oauth-protected-resource/route.ts'
const PROPRIO = 'app/.well-known/oauth-protected-resource/api/mcp/studio/route.ts'
const raiz = rd(RAIZ)
const get = raiz.slice(raiz.indexOf('export function GET'))
checa('A1 interruptor ligado', /const RAIZ_SEM_OAUTH = true/.test(raiz))
checa('A2 404 vem ANTES do documento', get.indexOf('if (RAIZ_SEM_OAUTH)') > 0 && get.indexOf('if (RAIZ_SEM_OAUTH)') < get.indexOf('protectedResourceMetadata('))
checa('A3 o 404 da raiz é not_found sem cache', /if \(RAIZ_SEM_OAUTH\) return NextResponse\.json\(\{ error: 'not_found' \}, \{ status: 404/.test(get))

const proprio = rd(PROPRIO)
checa('B1 caminho próprio do Studio sem a camada', !proprio.includes(MARCA) && /protectedResourceMetadata\(/.test(proprio))

const launch = rd('lib/mcp/studioLaunch.ts')
checa('C1 o 401 aponta para o caminho próprio', /STUDIO_RESOURCE_METADATA_PATH = `\/\.well-known\/oauth-protected-resource\$\{STUDIO_MCP_PATH\}`/.test(launch) && /STUDIO_MCP_PATH = '\/api\/mcp\/studio'/.test(launch))

const contrato = rd('lib/mcp/chatgptContract.ts')
checa('D1 ferramentas do ChatGPT declaram noauth', /noauth/.test(contrato))
checa('D2 rota do ChatGPT nunca devolve 401', !/status:\s*401/.test(rd('app/api/mcp/chatgpt/route.ts')))

const commits = git('log', '--format=%H', `--grep=${MARCA}`).trim().split('\n').filter(Boolean)
const base = commits.length ? `${commits[commits.length - 1]}^` : 'HEAD'
const baseTxt = git('show', `${base}:${RAIZ}`)
const desfaz = (t) => t.split('\n').filter((l) => !l.includes(MARCA)).join('\n')
checa('E1 apagar as linhas marcadas = base byte a byte', desfaz(raiz) === baseTxt)
checa('E2 toda linha nova traz a marca', git('diff', '-U0', base, '--', RAIZ).split('\n').filter((l) => /^\+(?!\+)/.test(l)).every((l) => l.includes(MARCA)))
const mutante = raiz.replace('const RAIZ_SEM_OAUTH = true', 'const RAIZ_SEM_OAUTH = false')
checa('M1 mutante (interruptor desligado) seria vermelho em A1', mutante !== raiz && !/const RAIZ_SEM_OAUTH = true/.test(mutante))

console.log(`\n${ok} ok, ${falhas.length} falha(s)`)
if (falhas.length) process.exit(1)
