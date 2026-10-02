// KINEO-LACOS-SHARE-2026-10-02 (+ KINEO-LACOS-STICKY / KINEO-LACOS-KIT) — guardião (laços C3): a página pública do filme
// (/v/<id>) e o kit de publicação.
// Prova: (a) "Send to a friend" grava public_video_share_clicked com o id do filme e o método que DE FATO aconteceu —
// executado com navigator falso; (b) a barra fixa da CTA existe só no celular (<= 640px), leva a CTA principal
// ("Make your own version"), respeita a safe-area e o corpo ganha padding-bottom; (c) o kit aponta a linha de crédito
// para a /v/ do próprio filme com ?ref=<código do dono> quando published_at existe, e fica como hoje sem ele —
// executado com banco falso; (d) mutantes. Estilo readFileSync + transpile.
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const ts = require(path.join(ROOT, 'node_modules', 'typescript'))
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n')
let pass = 0
let fail = 0
const ok = (c, m) => { if (c) { pass++; console.log('  ok  ' + m) } else { fail++; console.log('  FAIL ' + m) } }
function compile(src, mocks = {}, globals = {}) {
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.React, esModuleInterop: true } }).outputText
  const mod = { exports: {} }
  vm.runInNewContext(js, {
    module: mod, exports: mod.exports, URL, URLSearchParams, Promise, setTimeout, Date, console: { log() {}, warn() {}, error() {} },
    process: { env: {} },
    React: { createElement: (type, props, ...children) => ({ type, props: props ?? {}, children }) },
    require: (id) => { if (Object.hasOwn(mocks, id)) return mocks[id]; throw new Error('import inesperado: ' + id) },
    ...globals,
  })
  return mod.exports
}

console.log('== (a) share rastreado ==')
const shareSrc = read('app/v/[id]/ShareVideoButton.tsx')
async function clique({ share, clipboardOk = true }) {
  const eventos = []
  const window = { location: { href: 'https://www.usekineo.com/v/abc?ref=ABCDEFGH' } }
  const navigator = {
    ...(share ? { share } : {}),
    clipboard: { writeText: async () => { if (!clipboardOk) throw new Error('blocked') } },
  }
  const M = compile(shareSrc, {
    react: { useState: (v) => [v, () => {}] },
    '@/lib/analytics': { trackEvent: async (name, meta) => { eventos.push({ name, meta }); return true } },
  }, { window, navigator })
  const el = M.default({ title: 'Filme', videoId: 'vid-123' })
  await el.props.onClick()
  return eventos
}
{
  const e = await clique({ share: async () => {} })
  ok(e.length === 1 && e[0].name === 'public_video_share_clicked' && e[0].meta.video_id === 'vid-123' && e[0].meta.method === 'native_share', 'celular: compartilhar nativo concluído → method native_share + video_id')
}
{
  const e = await clique({ share: async () => { throw new Error('AbortError') } })
  ok(e.length === 1 && e[0].meta.method === 'clipboard' && e[0].meta.native_cancelled === true, 'nativo cancelado → cai no copiar e o evento diz clipboard + native_cancelled')
}
{
  const e = await clique({})
  ok(e.length === 1 && e[0].meta.method === 'clipboard' && e[0].meta.native_available === false, 'desktop: copiar link → method clipboard')
}
{
  const e = await clique({ clipboardOk: false })
  ok(e.length === 1 && e[0].meta.method === 'unavailable', 'clipboard bloqueado → o clique conta como unavailable')
}
{
  const e = await clique({ share: async () => {} })
  ok(!JSON.stringify(e[0].meta).includes('usekineo.com') && !/email/i.test(JSON.stringify(e[0].meta)), 'o botão não põe URL nem e-mail no metadado')
}
const page = read('app/v/[id]/page.tsx')
ok(page.includes("<ShareVideoButton title={v?.title ?? 'A Short made with Kineo'} videoId={params.id} />"), 'a página passa o id do filme ao botão')
ok(/import \{ trackEvent \} from '@\/lib\/analytics'/.test(shareSrc), 'usa o trackEvent de lib/analytics')

console.log('== (b) barra fixa só no celular ==')
const css = (page.match(/__html:\s*\n?\s*('[^']*'(?:\s*\+\s*'[^']*')*)/) || [])[1] || ''
const cssText = css.replace(/'\s*\+\s*'/g, '').replace(/^'|'$/g, '')
ok(/\.pv-sticky\{display:none\}/.test(cssText), 'fora do celular a barra não aparece (display:none por padrão)')
ok(/@media \(max-width:640px\)\{\.pv-sticky\{display:flex\}/.test(cssText), 'até 640px a barra aparece')
ok(/\.pv-main\{padding-bottom:calc\(96px \+ env\(safe-area-inset-bottom\)\) !important\}/.test(cssText), 'no celular o corpo ganha padding-bottom (barra + safe-area): a barra não cobre conteúdo')
const barra = page.slice(page.indexOf('className="pv-sticky"'), page.indexOf('</main>'))
ok(barra.length > 0 && !/display: 'flex'/.test(barra.slice(0, barra.indexOf('<PublicVideoCtaLink'))), 'a barra não tem display inline (venceria a media query)')
ok(/padding: '10px 14px calc\(10px \+ env\(safe-area-inset-bottom\)\)'/.test(barra), 'a barra respeita a safe-area do iPhone')
ok(/href=\{generateFromScriptHref\(title, 'public_video_remake'\)\}\s*videoId=\{params\.id\}\s*placement="sticky_bar"\s*destination="\/signup"/.test(barra) && barra.includes('Make your own version — free →'), 'a barra leva a CTA principal da página (criar o próprio vídeo), medida como sticky_bar')
ok(page.includes('className="pv-main"'), 'o corpo tem a classe que recebe o padding')

console.log('== (c) kit aponta para a /v/ do filme publicado ==')
const VD = compile(read('lib/videoDescription.ts'))
const VS = compile(read('lib/videoShare.ts'))
const PP = compile(read('lib/publishPack.ts'))
const LINHA = VD.KINEO_CREDIT_LINE
const url = 'https://www.usekineo.com/v/vid-1?utm_source=kineo_user&ref=ABCDEFGH'
const base = { ytTitle: 'T', ytDescription: `Gancho.\n\n#a #b\n\n${LINHA}`, tiktokCaption: 'x', pinnedComment: 'y' }
const trocado = PP.apontarCreditoParaFilme(base, LINHA, url)
ok(trocado.ytDescription.endsWith(LINHA.replace(/https:\/\/\S+$/, url)) && !trocado.ytDescription.includes('utm_source=video_desc'), 'puro: a URL da linha da casa vira a /v/ do filme; o texto da linha fica')
ok(PP.apontarCreditoParaFilme(base, LINHA, null) === base && PP.apontarCreditoParaFilme(base, LINHA, 'https://evil.example/v/x') === base, 'puro: sem URL (ou URL fora de usekineo.com/v/) nada muda')
const pago = { ...base, ytDescription: 'Gancho limpo.' }
ok(PP.apontarCreditoParaFilme(pago, LINHA, url) === pago, 'puro: pacote de assinante (sem linha da casa) segue limpo — a regra do plano não muda')

const serverSrc = read('lib/publishPackServer.ts')
async function kit({ publicado, codigo = 'ABCDEFGH', descricao = base.ytDescription, quebra = false, src = serverSrc }) {
  const consultas = []
  const respostas = {
    events: { list: { data: [{ metadata: { ...base, ytDescription: descricao }, created_at: new Date().toISOString() }], error: null } },
    videos: { one: { data: publicado === undefined ? null : { id: 'vid-1', published_at: publicado }, error: null } },
    profiles: { one: { data: { referral_code: codigo }, error: null } },
  }
  const admin = {
    from(t) {
      consultas.push(t)
      if (quebra && t !== 'events') throw new Error('fora do ar')
      const b = { select: () => b, eq: () => b, order: () => b, limit: async () => respostas[t].list, maybeSingle: async () => respostas[t].one }
      return b
    },
  }
  const M = compile(src, { '@/lib/videoDescription': VD, '@/lib/videoShare': VS, '@/lib/publishPack': PP })
  const p = await M.garantirPacote(admin, 'user-1', { id: 'vid-1', title: 'T' }, { escrever: false, isFreePlan: true })
  return { p, consultas }
}
{
  const { p } = await kit({ publicado: '2026-10-01T10:00:00Z' })
  const esperado = 'https://www.usekineo.com' + VS.buildPublishedVideoSharePath('vid-1', 'ABCDEFGH')
  ok(p && p.ytDescription.includes(esperado) && /[?&]ref=ABCDEFGH/.test(esperado), 'publicado: o kit aponta para /v/<id> com ?ref=<código do dono> (o mesmo link do My Videos)')
}
{
  const { p } = await kit({ publicado: '2026-10-01T10:00:00Z', codigo: null })
  ok(p && p.ytDescription.includes('https://www.usekineo.com/v/vid-1?') && !/ref=/.test(p.ytDescription), 'publicado sem código de indicação: /v/ do filme, sem ref')
}
{
  const { p } = await kit({ publicado: null })
  ok(p && p.ytDescription.endsWith(LINHA), 'sem published_at: o link de hoje (home) fica')
}
{
  const { p, consultas } = await kit({ publicado: '2026-10-01T10:00:00Z', descricao: 'Gancho limpo.' })
  ok(p && p.ytDescription === 'Gancho limpo.' && !consultas.includes('videos'), 'assinante: pacote limpo e nenhuma consulta extra')
}
{
  const { p } = await kit({ publicado: '2026-10-01T10:00:00Z', quebra: true })
  ok(p && p.ytDescription.endsWith(LINHA), 'banco fora do ar na consulta do filme: falha aberta, o pacote sai como hoje')
}
ok(/creditLine: opts\?\.isFreePlan === true \? KINEO_CREDIT_LINE : null/.test(serverSrc), 'controle: a regra "crédito só no gratuito" segue intacta no escritor')

console.log('== (d) mutantes ==')
const mutShare = shareSrc.replace("record('native_share', false)", '')
ok(mutShare !== shareSrc, 'mutante preparado: share nativo sem evento')
{
  const eventos = []
  const M = compile(mutShare, { react: { useState: (v) => [v, () => {}] }, '@/lib/analytics': { trackEvent: async (n, m) => { eventos.push(m) } } }, { window: { location: { href: 'x' } }, navigator: { share: async () => {}, clipboard: { writeText: async () => {} } } })
  await M.default({ title: 't', videoId: 'v' }).props.onClick()
  ok(eventos.length === 0, 'mutante: sem o record do nativo, o caso do celular fica sem evento — e a prova acima o pegaria')
}
const mutCss = page.replace("'.pv-sticky{display:none}' +", "'' +")
const cssMut = ((mutCss.match(/__html:\s*\n?\s*('[^']*'(?:\s*\+\s*'[^']*')*)/) || [])[1] || '').replace(/'\s*\+\s*'/g, '')
ok(mutCss !== page && !/\.pv-sticky\{display:none\}/.test(cssMut), 'mutante: barra visível no desktop é pega')
const mutKit = serverSrc.replace('return apontarCreditoParaFilme(pacote, KINEO_CREDIT_LINE, url)', 'return pacote')
{
  const { p } = await kit({ publicado: '2026-10-01T10:00:00Z', src: mutKit })
  ok(mutKit !== serverSrc && p && p.ytDescription.endsWith(LINHA), 'mutante: sem apontar o crédito, o filme publicado volta a mandar para a home — a prova acima o pega')
}

console.log(`\n  ${pass} ok · ${fail} falha(s)`)
process.exit(fail ? 1 : 0)
