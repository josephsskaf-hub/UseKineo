// ═══ KINEO-PORTA-DE-EMAIL-2026-09-06 ════════════════════════════════════════
// O DEFEITO, medido em produção em 06/09 (curl com UA de navegador, controle
// 404 na mesma medição):
//   · /studio/create?utm_source=lifecycle&utm_medium=email&utm_campaign=X
//       → 307 → /signup?redirect=…
//   · /generate?…utm_campaign=trial_d0 → 307 → /studio/create → 307 → /signup
//   · /library?utm… → 307 → /login ✅   /history → 307 → /login ✅
// A página decidia /login vs /signup só pelo cookie `sb-…auth-token` do
// APARELHO. Clique de inbox chega sem cookie; o cliente cadastrado recebia
// formulário de CRIAR CONTA. 9 remetentes carregam a porta; só o d0_welcome
// foram 188/7d.
//
// O PRINCÍPIO que este guardião protege: a regra vive em UM lugar
// (lib/lifecycle/emailReturnDoor.ts), exige TRÊS sinais para reconhecer
// e-mail nosso, falha ABERTA para /signup sem sinal, e a página CHAMA a regra
// (contrato sem chamador serve zero). E o desvio de deslogado passa a EMITIR
// evento em todo ramo, inclusive o `standard` — a cegueira que escondeu isto.
//
// ESTILO: `readFileSync` sobre os arquivos REAIS. Nunca `import` com alias
// `@/` — 72 testes de scripts/ morrem no import antes da primeira verificação.
// E o guardião se amarra à VARIÁVEL QUE DECIDE, não só conta texto: mutante
// que troque a condição por `true`, inverta '/login'/'/signup' ou remova a
// exigência de `utm_medium === 'email'` tem que ficar vermelho aqui.
import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
const src = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8').replace(/\r\n/g, '\n')
let ok = 0, fail = 0
const check = (n, c) => { c ? (ok++, console.log('  ok  ' + n)) : (fail++, console.log('  FAIL ' + n)) }

const porta = src('lib/lifecycle/emailReturnDoor.ts')
const pagina = src('app/(dashboard)/studio/create/page.tsx')

// Recorta o corpo de uma função pelo nome — do `function nome(` até a próxima
// `export` de nível de arquivo (ou o fim).
function corpo(texto, assinatura) {
  const ini = texto.indexOf(assinatura)
  if (ini < 0) return ''
  const fim = texto.indexOf('\nexport ', ini + assinatura.length)
  return texto.slice(ini, fim < 0 ? texto.length : fim)
}

// Recorta um bloco `{ … }` a partir da assinatura, casando chaves de verdade
// (não por contagem de linhas). Devolve '' se não achar.
function bloco(texto, assinatura, desde = 0) {
  const ini = texto.indexOf(assinatura, desde)
  if (ini < 0) return ''
  const abre = texto.indexOf('{', ini)
  let prof = 0
  for (let i = abre; i < texto.length; i++) {
    if (texto[i] === '{') prof++
    else if (texto[i] === '}') { prof--; if (prof === 0) return texto.slice(ini, i + 1) }
  }
  return ''
}

console.log('1 · lib/lifecycle/emailReturnDoor.ts — a fonte única é pura e exige os três sinais')
check('o arquivo NÃO importa nada (puro: sem next/headers, fs, crypto, node:*)',
  !/^\s*import\s/m.test(porta) && !/from ['"](next\/|node:|fs|crypto|path)/.test(porta))
check('exporta OUR_EMAIL_UTM_SOURCES como ReadonlySet',
  /export const OUR_EMAIL_UTM_SOURCES: ReadonlySet<string> = new Set\(\[/.test(porta))
const conjunto = (porta.match(/OUR_EMAIL_UTM_SOURCES: ReadonlySet<string> = new Set\(\[([^\]]*)\]\)/) ?? [])[1] ?? ''
check("o conjunto contém 'lifecycle' (a fonte de TODA carta com utm_medium=email)", /'lifecycle'/.test(conjunto))
check("o conjunto NÃO contém 'lead_magnet' (leitor de isca não tem conta)", !/lead_magnet/.test(conjunto))
check("o conjunto NÃO contém 'checkout_success' (viaja com utm_medium=first_win)", !/checkout_success/.test(conjunto))
check('o conjunto não está vazio nem inclui coringa', conjunto.trim().length > 0 && !/\*/.test(conjunto))

const chegou = corpo(porta, 'export function arrivouDeEmailNosso(')
check('arrivouDeEmailNosso foi localizada', chegou.length > 150)
check('aceita o formato do searchParams do Next (QueryLike)',
  /export type QueryLike = Record<string, string \| string\[\] \| undefined>/.test(porta) &&
  /arrivouDeEmailNosso\(params: QueryLike \| null \| undefined\): boolean/.test(chegou))
// As três variáveis que decidem, cada uma amarrada à sua origem.
check("sinal 1: isEmail nasce de `medium === 'email'` (não de constante)", /const isEmail = medium === 'email'/.test(chegou))
check("medium é lido de 'utm_medium'", /const medium = primeiro\(params, 'utm_medium'\)/.test(chegou))
check('sinal 2: isOurs nasce do conjunto (OUR_EMAIL_UTM_SOURCES.has(source))', /const isOurs = OUR_EMAIL_UTM_SOURCES\.has\(source\)/.test(chegou))
check("source é lido de 'utm_source'", /const source = primeiro\(params, 'utm_source'\)/.test(chegou))
check('sinal 3: hasCampaign exige campaign não vazio', /const hasCampaign = campaign\.length > 0/.test(chegou))
check("campaign é lido de 'utm_campaign'", /const campaign = primeiro\(params, 'utm_campaign'\)/.test(chegou))
check('o retorno é a CONJUNÇÃO dos três (exigência tripla, nenhum sozinho basta)',
  /return isEmail && isOurs && hasCampaign\s*$/m.test(chegou))
check('nenhum `return true` / `return false` solto na função (mutante de constante)',
  !/return (true|false)\b/.test(chegou))
check('nenhum `||` na função (mutante que afrouxe a tripla para "qualquer um")', !/\|\|/.test(chegou))
const primeiroFn = corpo(porta, 'function primeiro(')
check('o leitor aceita string e string[] (formato do Next) e apara espaços',
  /typeof v === 'string' \? v : Array\.isArray\(v\) && typeof v\[0\] === 'string' \? v\[0\] : ''/.test(primeiroFn) &&
  /return s\.trim\(\)/.test(primeiroFn))

const escolhe = corpo(porta, 'export function escolherPortaDeAuth(')
check('escolherPortaDeAuth foi localizada', escolhe.length > 100)
check("o tipo de retorno é '/login' | '/signup'",
  /export type PortaDeAuth = '\/login' \| '\/signup'/.test(porta) && /\): PortaDeAuth \{/.test(escolhe))
check('a decisão é a DISJUNÇÃO dos dois sinais (cookie OU e-mail nosso)',
  /const jaTemConta = temCookieDeSessao \|\| veioDeEmailNosso/.test(escolhe))
check("sentido certo: sinal → '/login', sem sinal → '/signup' (mutante invertido cai aqui)",
  /return jaTemConta \? '\/login' : '\/signup'/.test(escolhe))
check("'/signup' é o ÚNICO caminho sem sinal (falha aberta para o comportamento de ontem)",
  escolhe.split("'/signup'").length === 2 && escolhe.split("'/login'").length === 2)
check('nenhum `&&` na decisão (mutante que exija os dois sinais juntos)', !/&&/.test(escolhe))
check('não há `return` de string literal fora do ternário', !/return '\//.test(escolhe))

console.log('2 · o cabeçalho diz a verdade: defeito medido, por que no portão, condição de morte')
check('a sonda de produção está escrita (307 → /signup)', porta.includes('→ 307 → /signup?redirect=…'))
check('o controle 404 está escrito', porta.includes('/rota-que-nao-existe → 404'))
check('as irmãs (/library, /history → /login) estão escritas', porta.includes('/library?utm… → 307 → /login'))
check('o volume está escrito (9 remetentes, 188 d0_welcome/7d)',
  porta.includes('NOVE rotas de e-mail') && porta.includes('188 e-mails/7d'))
check('explica por que no portão e não nos 9 remetentes (falha SILENCIOSA, 10ª campanha)',
  porta.includes('SILENCIOSO') && porta.includes('10ª campanha'))
check('a condição de morte está escrita', porta.includes('CONDIÇÃO DE MORTE'))
check('declara pureza (sem next/headers, fs, crypto)', porta.includes('PURO por contrato'))

console.log('3 · app/(dashboard)/studio/create/page.tsx — o portão CHAMA a regra (prova de chamador)')
check('importa arrivouDeEmailNosso e escolherPortaDeAuth da fonte única',
  pagina.includes("import { arrivouDeEmailNosso, escolherPortaDeAuth } from '@/lib/lifecycle/emailReturnDoor'"))
const deslogado = bloco(pagina, 'if (!user) {')
check('o bloco `if (!user)` foi localizado', deslogado.length > 300)
check('hasPriorSession continua calculado igual (cookie sb-…auth-token)',
  /const hasPriorSession = cookies\(\)\s*\.getAll\(\)\s*\.some\(\(c\) => c\.name\.startsWith\('sb-'\) && c\.name\.includes\('auth-token'\)\)/.test(deslogado))
check('lê o sinal novo do searchParams: arrivouDeEmailNosso(searchParams)',
  /const veioDeEmailNosso = arrivouDeEmailNosso\(searchParams\)/.test(deslogado))
check('a porta vem de escolherPortaDeAuth com os DOIS sinais (cookie → temCookieDeSessao)',
  /const authPath = escolherPortaDeAuth\(\{\s*temCookieDeSessao: hasPriorSession,\s*veioDeEmailNosso,?\s*\}\)/.test(deslogado))
check("o ternário antigo `hasPriorSession ? '/login' : '/signup'` MORREU no bloco",
  !/hasPriorSession \? '\/login' : '\/signup'/.test(deslogado))
check("nenhum '/login' ou '/signup' literal sobrou no bloco (a página não decide mais sozinha)",
  !/'\/login'|'\/signup'/.test(deslogado))
check('o redirect preserva o destino COMPLETO: `${authPath}?redirect=${encodeURIComponent(path)}`',
  deslogado.includes('redirect(`${authPath}?redirect=${encodeURIComponent(path)}`)'))
check('o redirect é a ÚLTIMA instrução do bloco (nada roda depois dele)',
  /redirect\(`\$\{authPath\}\?redirect=\$\{encodeURIComponent\(path\)\}`\)\s*\}$/.test(deslogado))
check('path continua vindo de createPath(searchParams) (query inteira, utm inclusa)',
  pagina.includes('const path = createPath(searchParams)'))
check('a página é a ÚNICA chamadora de escolherPortaDeAuth entre os arquivos deste guardião',
  pagina.split('escolherPortaDeAuth(').length === 2)

console.log('4 · a CEGUEIRA: o desvio de deslogado emite evento em TODO ramo, inclusive o standard')
const antigo = bloco(deslogado, "if (activationEntry !== 'standard') {")
check("o evento antigo `generate_activation_auth_missing` continua, intacto, dentro do ramo != standard",
  antigo.includes("name: 'generate_activation_auth_missing'") &&
  antigo.includes("metadata: { activation_entry: activationEntry }"))
const idxAntigoFim = deslogado.indexOf(antigo) + antigo.length
const idxNovo = deslogado.indexOf("name: 'studio_create_auth_door_v1'")
const idxRedirect = deslogado.indexOf('redirect(`${authPath}')
check('o evento novo `studio_create_auth_door_v1` existe no bloco de deslogado', idxNovo > 0)
check('o evento novo está FORA do `if (activationEntry !== \'standard\')` (ramo standard emite)',
  idxNovo > idxAntigoFim && !antigo.includes('studio_create_auth_door_v1'))
check('o evento novo é emitido ANTES do redirect (redirect lança; depois dele nada roda)',
  idxNovo > 0 && idxNovo < idxRedirect)
check('o evento novo vem DEPOIS da decisão da porta (grava a porta escolhida, não um chute)',
  deslogado.indexOf('const authPath = escolherPortaDeAuth(') < idxNovo)
const evento = bloco(deslogado, "await writeServerEvent({\n      name: 'studio_create_auth_door_v1'")
check('o bloco do evento novo foi localizado', evento.length > 200)
check('usa o mesmo sessionId e o mesmo path da casa',
  /sessionId,/.test(evento) && evento.includes("path: '/studio/create'"))
check('metadata.porta é a VARIÁVEL decidida (authPath), não literal', /porta: authPath,/.test(evento))
check('metadata.veio_de_email é a variável do sinal novo', /veio_de_email: veioDeEmailNosso,/.test(evento))
check('metadata.tem_cookie é a variável do sinal antigo', /tem_cookie: hasPriorSession,/.test(evento))
check('metadata carrega utm_campaign e utm_source lidos do searchParams',
  /utm_campaign: firstParam\(searchParams, 'utm_campaign'\)/.test(evento) &&
  /utm_source: firstParam\(searchParams, 'utm_source'\)/.test(evento))
check('metadata carrega activation_entry', /activation_entry: activationEntry,/.test(evento))
check('não usa dedupe (todo desvio conta — é o denominador)', !/dedupeMinutes/.test(evento))
// writeServerEvent engole erro por dentro (try/catch, devolve boolean) — a
// página nunca quebra pelo evento. Prova no arquivo real, não em promessa.
const serverEvents = src('lib/serverEvents.ts')
const writeFn = bloco(serverEvents, 'export async function writeServerEvent(')
check('writeServerEvent engole erro por dentro (o redirect acontece sempre)',
  /^\s*try \{/m.test(writeFn) && /\} catch/.test(writeFn) && /Promise<boolean>/.test(writeFn))

console.log('5 · limites: nada além do portão e da fonte única foi tocado')
check('a página NÃO ganhou lógica de JSX nova (GenerateClient montado igual)',
  pagina.includes('<GenerateClient initialViralPrompt={seedPrompt} initialUserId={user.id} />'))
check('generate_arrived_server (logado) segue intacto',
  pagina.includes("name: 'generate_arrived_server'") && pagina.includes('dedupeMinutes: 30,'))
// A fonte única não pode ser importada por remetente nenhum: o conserto é no
// portão. Se um remetente passar a importar, o defeito da "cópia da regra"
// voltou por outra porta.
for (const f of [
  'app/api/admin/send-winback-25/route.ts',
  'app/api/cron/send-activation-nudge/route.ts',
  'app/api/cron/send-failure-recovery/route.ts',
  'app/api/cron/send-video-rescue/route.ts',
  'app/api/cron/send-blackout-winback/route.ts',
  'app/api/cron/send-credits-back/route.ts',
  'app/api/cron/send-reminders/route.ts',
  'app/api/cron/trial-lifecycle-emails/route.ts',
  'app/api/cron/finish-stranded-renders/route.ts',
]) {
  check(`remetente intocado: ${f} não importa emailReturnDoor`, !src(f).includes('emailReturnDoor'))
}
check("composerUrl continua com default source='lifecycle' medium='email' (o que a regra reconhece)",
  /source = 'lifecycle', medium = 'email'/.test(src('lib/lifecycle/composerUrl.ts')))

console.log('6 · os 4 links que viajavam SEM os três sinais agora nascem no composerUrl')
// Levantado por grep em 06/09: `stranded_rescue` (×2), `attempt_lost` e
// `launch_email` viajavam SEM utm_medium e SEM utm_campaign; o blackout ia a
// `${APP_URL}/generate` sem query nenhuma — e o porteiro de /generate degrada
// visita vazia para a VITRINE (/studio, sem composer). Nenhum leitor da casa
// (app/ lib/ scripts/ supabase/ docs/) lê esses valores como utm_source, então
// o rótulo antigo vira utm_campaign (identidade preservada) e source/medium
// ficam nos DEFAULTS do helper — exatamente os que a regra da seção 1
// reconhece. Cada checagem se amarra à variável que o e-mail USA.
// Só o CÓDIGO: linhas que são comentário inteiro (`^\s*//`) saem antes de
// qualquer regex de "URL crua" — senão o comentário que EXPLICA o defeito faz
// o guardião reprovar (aconteceu na primeira rodada, 06/09). Não mexe em
// `https://` dentro de string: só remove linha que COMEÇA com //.
const semComentarios = (t) => t.split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n')
const REMETENTES = [
  { arq: 'app/api/cron/send-blackout-winback/route.ts', campanha: 'blackout_winback',
    chamada: "const makeUrl = composerUrl({ base: APP_URL, campaign: 'blackout_winback' })",
    uso: 'Pick up exactly where you left off: ${makeUrl}',
    cru: [/\$\{APP_URL\}\/generate(?![?\w])/, /utm_source=blackout/] },
  { arq: 'app/api/cron/finish-stranded-renders/route.ts', campanha: 'stranded_rescue',
    chamada: "const rescueUrl = composerUrl({ base: APP_URL, campaign: 'stranded_rescue' })",
    uso: 'rescueText(rescueUrl), rescueHtml(rescueUrl, userId)',
    cru: [/utm_source=stranded_rescue/, /\/generate\?utm_source=stranded/] },
  { arq: 'app/api/cron/finish-stranded-renders/route.ts', campanha: 'attempt_lost',
    chamada: "? composerUrl({ base: APP_URL, campaign: 'attempt_lost', prompt: topic })",
    uso: 'attemptLostText(startUrl, topic)',
    cru: [/\/studio\/create\?prompt=\$\{encodeURIComponent\(topic\)\}/, /studio\/create\?[^`\n]*utm_source=attempt_lost/] },
  { arq: 'app/api/admin/send-avatar-launch/route.ts', campanha: 'avatar_launch',
    chamada: "const AVATAR_CTA_URL = `${composerUrl({ base: 'https://usekineo.com', campaign: 'avatar_launch' })}&avatar=1`",
    uso: '<a href="${AVATAR_CTA_URL}"',
    cru: [/utm_source=launch_email/, /\/generate\?avatar=1/] },
]
for (const r of REMETENTES) {
  const s = semComentarios(src(r.arq))
  const nome = r.arq.split('/').slice(-2, -1)[0] + ' · ' + r.campanha
  check(`${nome}: importa composerUrl da fonte única`, /import \{ composerUrl \} from '@\/lib\/lifecycle\/composerUrl'/.test(s))
  const iChamada = s.indexOf(r.chamada)
  check(`${nome}: a chamada existe, com o rótulo antigo como utm_campaign`, iChamada >= 0)
  check(`${nome}: a variável que o helper devolve é a que o e-mail USA`, s.includes(r.uso))
  // Lido do CÓDIGO (não da constante acima): toda chamada de composerUrl com
  // esta campanha, no arquivo real, sem `source:`/`medium:` — os defaults são
  // o que a regra da seção 1 reconhece; sobrescrever um deles fecha a porta.
  const chamadasReais = s.match(new RegExp("composerUrl\\(\\{[^}]*campaign: '" + r.campanha + "'[^}]*\\}\\)", 'g')) ?? []
  check(`${nome}: a chamada real não sobrescreve source/medium (defaults 'lifecycle'/'email')`,
    chamadasReais.length >= 1 && chamadasReais.every((c) => !/\b(source|medium):/.test(c)))
  for (const cru of r.cru) check(`${nome}: a URL crua morreu (/${cru.source.slice(0, 44)}/)`, !cru.test(s))
}
// attempt_lost: a chamada é o ramo `?` da ternária que ALIMENTA `startUrl`, e
// o prefill (`prompt: topic`) só existe quando a dica é o texto INTEIRO.
{
  const s = semComentarios(src('app/api/cron/finish-stranded-renders/route.ts'))
  // A ternária INTEIRA, no formato exato: decide → `?` helper com prefill →
  // `:` vitrine sem prefill. Mutante que troque a ordem, tire o prompt ou
  // devolva a string crua ao ramo verdadeiro reprova aqui.
  check('attempt_lost: a chamada com prefill é o ramo verdadeiro de `startUrl = hintComplete && topic`',
    /const startUrl = hintComplete && topic\s*\n\s*\? composerUrl\(\{ base: APP_URL, campaign: 'attempt_lost', prompt: topic \}\)\s*\n\s*: `\$\{APP_URL\}\/studio\?utm_source=attempt_lost`/.test(s))
  check('attempt_lost: o ramo SEM prefill segue apontando para /studio (fora deste conserto, guardado por test-clique-perdido)',
    s.includes("`${APP_URL}/studio?utm_source=attempt_lost`"))
}
// Varredura global: nenhum dos três rótulos volta a viajar como utm_source.
for (const arq of new Set(REMETENTES.map((r) => r.arq))) {
  const sobras = semComentarios(src(arq)).match(/utm_source=(stranded_rescue|attempt_lost|launch_email)\b/g) ?? []
  check(`${arq.split('/').slice(-2, -1)[0]}: nenhum utm_source=stranded_rescue|attempt_lost|launch_email sobrou (só o /studio do ramo sem prefill)`,
    sobras.every((x) => x === 'utm_source=attempt_lost') && sobras.length <= 1)
}

console.log('7 · prova VIVA: o link que o helper devolve entra pela porta certa (TS real, sem alias)')
// Executa `composerUrl` e `arrivouDeEmailNosso` DE VERDADE num filho
// `node --experimental-strip-types` (Node ≥ 22.6; aqui 24). Se o filho falhar,
// isto fica VERMELHO — nunca verde por ausência.
const campanhas = REMETENTES.map((r) => r.campanha)
const prova = spawnSync(process.execPath, ['--experimental-strip-types', '--no-warnings', '--input-type=module', '-e', `
  const { composerUrl } = await import(${JSON.stringify(new URL('../lib/lifecycle/composerUrl.ts', import.meta.url).href)})
  const porta = await import(${JSON.stringify(new URL('../lib/lifecycle/emailReturnDoor.ts', import.meta.url).href)})
  const out = {}
  for (const campaign of ${JSON.stringify(campanhas)}) {
    const raw = composerUrl({ base: 'https://www.usekineo.com', campaign, prompt: campaign === 'attempt_lost' ? 'why the sky is blue & more' : undefined })
    const u = new URL(campaign === 'avatar_launch' ? raw + '&avatar=1' : raw)
    const q = Object.fromEntries(u.searchParams)
    const veio = porta.arrivouDeEmailNosso(q)
    out[campaign] = { path: u.pathname, q, veio, porta: porta.escolherPortaDeAuth({ temCookieDeSessao: false, veioDeEmailNosso: veio }) }
  }
  console.log('PROVA ' + JSON.stringify(out))
`], { encoding: 'utf8' })
check('a prova viva rodou (exit 0)', prova.status === 0)
let vivo = {}
try { vivo = JSON.parse((prova.stdout.split('\n').find((l) => l.startsWith('PROVA ')) ?? '').slice(6)) } catch {}
for (const c of campanhas) {
  const r = vivo[c]
  check(`${c}: o helper leva a /studio/create (composer), nunca à vitrine`, r?.path === '/studio/create')
  check(`${c}: a URL carrega os TRÊS sinais (medium=email, source=lifecycle, campaign=${c})`,
    r?.q?.utm_medium === 'email' && r?.q?.utm_source === 'lifecycle' && r?.q?.utm_campaign === c)
  check(`${c}: arrivouDeEmailNosso=true → porta=/login SEM cookie (o defeito consertado)`, r?.veio === true && r?.porta === '/login')
}
check('attempt_lost: o prefill atravessa a URL e volta decodificado (& inclusive)', vivo.attempt_lost?.q?.prompt === 'why the sky is blue & more')
check('avatar_launch: `avatar=1` sobrevive ao lado dos três sinais', vivo.avatar_launch?.q?.avatar === '1')


console.log(`\n${ok} ok, ${fail} fail`)
process.exit(fail ? 1 : 0)
