// KINEO-STUDIO-ADS-AEO-2026-09-24 — guardião do Studio Ads no /llms.txt e no /api/facts.
// Verificação da sessão Research (24/09 23:28 UTC): /ads no ar com o botão de compra e ZERO menções no llms.txt e no
// facts — quem perguntava a um motor de resposta "como faço um anúncio com as minhas fotos" ouvia que a Kineo só faz por
// gente. Este guardião RENDERIZA as duas rotas de verdade (gancho de require que transpila .ts e resolve '@/'), com o
// passe ligado e desligado, e prova: (1) ligado → bloco próprio, roteamento e o fato no JSON, tudo derivado de
// adsPassCopy(); (2) desligado → nenhuma menção e o JSON com studioAds null; (3) nenhum preço digitado.
import { readFileSync, existsSync, statSync } from 'node:fs'
import { createRequire } from 'node:module'
import Module from 'node:module'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(join(RAIZ, 'package.json'))
const ts = require('typescript')
const rd = (p) => readFileSync(join(RAIZ, p), 'utf8').replace(/\r\n/g, '\n')
let passou = 0
const falhas = []
const ok = (cond, nome) => { if (cond) passou++; else falhas.push(nome) }

// ── gancho: .ts/.tsx transpilados, '@/x' → <raiz>/x ─────────────────────────────────────────────────────
const achaArquivo = (base) => [base, base + '.ts', base + '.tsx', join(base, 'index.ts')].find((c) => existsSync(c) && statSync(c).isFile())
const resolveOriginal = Module._resolveFilename
Module._resolveFilename = function (request, parent, ...rest) {
  if (request.startsWith('@/')) { const f = achaArquivo(join(RAIZ, request.slice(2))); if (f) return f }
  if ((request.startsWith('./') || request.startsWith('../')) && parent?.filename?.match(/\.tsx?$/)) {
    const f = achaArquivo(resolve(dirname(parent.filename), request)); if (f) return f
  }
  return resolveOriginal.call(this, request, parent, ...rest)
}
for (const ext of ['.ts', '.tsx']) {
  require.extensions[ext] = (mod, filename) => {
    const out = ts.transpileModule(readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true }, fileName: filename }).outputText
    mod._compile(out, filename)
  }
}
const limpaCache = () => { for (const k of Object.keys(require.cache)) if (k.startsWith(RAIZ) && !k.includes('node_modules')) delete require.cache[k] }
async function renderiza(envLive) {
  limpaCache()
  if (envLive === undefined) delete process.env.NEXT_PUBLIC_ADS_PASS_LIVE
  else process.env.NEXT_PUBLIC_ADS_PASS_LIVE = envLive
  const llms = await (await require(join(RAIZ, 'app/llms.txt/route.ts')).GET()).text()
  const facts = JSON.parse(await require(join(RAIZ, 'app/api/facts/route.ts')).GET().text())
  const offer = require(join(RAIZ, 'lib/ads/offer.ts'))
  const models = require(join(RAIZ, 'lib/ads/models.ts'))
  return { llms, facts, offer, models }
}

// ── 1. passe ligado (padrão do código) ─────────────────────────────────────────────────────────────────
const on = await renderiza(undefined)
const copy = on.offer.adsPassCopy()
ok(on.offer.adsPassLive() === true, '1a. premissa: com o código de hoje o passe está ligado (ADS_PASS_LIVE_IN_CODE)')
const bloco = on.llms.slice(on.llms.indexOf(`## Business video ads you make yourself — ${copy.name}`), on.llms.indexOf('## One-time packs for agencies'))
ok(bloco.length > 200, '1b. llms.txt ligado: seção própria "Business video ads you make yourself — Studio Ads" antes dos pacotes')
ok(bloco.includes(`[${copy.name}](https://www.usekineo.com/ads)`) && bloco.includes(`- Price: ${copy.price} once`), `1c. a seção leva o link /ads e o preço de adsPassCopy (${copy.price})`)
ok(copy.includes.every((line) => bloco.includes(`- ${line}\n`)), '1d. cada linha de "includes" da página /ads aparece igual no llms.txt (mesma fonte, nada redigitado)')
ok(copy.excludes.every((line) => bloco.includes(line.replace(/[.]$/, ''))), '1e. o que NÃO entra no passe também aparece (excludes da página)')
ok(/does not promise instant, no-human or self-service production\. For the self-service way, see Studio Ads below\./.test(on.llms), '1f. a frase das Empresas ("não promete self-service") passa a apontar para o Studio Ads')
ok(on.llms.includes(`"A video ad for my business from my own photos and logo, made myself" → [${copy.name}](https://www.usekineo.com/ads), ${copy.price} once, no subscription.`), '1g. o roteador de perguntas manda "anúncio com as minhas fotos, feito por mim" para /ads')
ok(on.llms.includes('For self-service generation, Kineo'), '1h. a frase antiga dos planos segue lá (guardada pelo test-tres-jogadas)')
const f = on.facts.studioAds
ok(f && f.url === 'https://www.usekineo.com/ads' && f.price === copy.price && f.kind === 'self_service_ad_pass' && f.recurring === false && f.humanOperated === false, '1i. /api/facts ganha studioAds com url, preço, kind, sem recorrência e sem operação humana')
const n35 = on.models.ADS_MODELS.filter((m) => m.seconds === 35).length
const n60 = on.models.ADS_MODELS.filter((m) => m.seconds === 60).length
ok(f && f.models.total === on.models.ADS_MODELS.length && f.models.seconds35 === n35 && f.models.seconds60 === n60 && n35 + n60 === on.models.ADS_MODELS.length, `1j. contagem de modelos vem de ADS_MODELS (${n35} de 35 s + ${n60} de 60 s)`)
ok(f && f.credits === on.offer.ADS_PASS_CREDITS && f.accessDays === on.offer.ADS_PASS_ACCESS_DAYS && JSON.stringify(f.includes) === JSON.stringify(copy.includes), '1k. créditos, dias de acesso e includes no JSON são os de offer.ts')
ok(on.facts.businessVideoService && on.facts.businessVideoService.humanOperated === true, '1l. o serviço feito por gente (Empresas) segue no JSON ao lado')

// ── 2. passe desligado (emergência: NEXT_PUBLIC_ADS_PASS_LIVE=0 + deploy) ──────────────────────────────
const off = await renderiza('0')
ok(off.offer.adsPassLive() === false, '2a. premissa: env 0 desliga o passe')
ok(!/Studio Ads|usekineo\.com\/ads\b/.test(off.llms), '2b. desligado: o llms.txt não cita Studio Ads nem /ads')
ok(off.facts.studioAds === null, '2c. desligado: /api/facts devolve studioAds null')
ok(/self-service production\.\n\n## One-time packs for agencies/.test(off.llms), '2d. desligado: o bloco das Empresas fecha exatamente como antes (sem linha em branco a mais nem a menos)')

// ── 3. nada digitado ───────────────────────────────────────────────────────────────────────────────────
const fatos = rd('lib/growth/studioAdsFacts.ts')
ok(!/US\$|\$\d|19[.,]90|\b60 credits\b/.test(fatos.replace(/^\s*\/\/.*$/gm, '')), '3a. studioAdsFacts.ts não digita preço nem créditos (vêm de offer.ts)')
ok(/import \{[^}]*adsPassCopy[^}]*adsPassLive[^}]*\} from '\.\.\/ads\/offer'/.test(fatos) && /if \(!adsPassLive\(\)\) return null/.test(fatos), '3b. o fato lê adsPassCopy e se anula com adsPassLive() falso')
const kf = rd('lib/kineoFacts.ts')
ok(/export const STUDIO_ADS_FACT: StudioAdsFact \| null = studioAdsFact\(\)/.test(kf) && /\n    studioAds: STUDIO_ADS_FACT,\n/.test(kf), '3c. kineoFacts expõe STUDIO_ADS_FACT e o põe no getKineoFacts')
ok(/lida pela página \/ads e, via lib\/growth\/studioAdsFacts\.ts, pelo \/llms\.txt e pelo \/api\/facts/.test(rd('lib/ads/offer.ts')), '3d. o comentário de adsPassCopy (offer.ts) diz a verdade sobre quem o lê')

console.log(`test-ads-aeo-2026-09-24: ${passou} ok · ${falhas.length} falhas`)
for (const x of falhas) console.log('  FAIL ' + x)
process.exit(falhas.length ? 1 : 0)
