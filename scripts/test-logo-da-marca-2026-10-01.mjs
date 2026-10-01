// KINEO-LOGO-DA-MARCA-2026-10-01 — guardião do "Your logo": o logo da empresa do cliente no canto de todo filme.
// Só readFileSync + transpile local (guardião com alias @/ não roda — ver memória "Alias @/").
import { readFileSync } from 'node:fs'
import { execSync } from 'node:child_process'
import ts from 'typescript'

let ok = 0, falhas = 0
function checa(nome, cond) { if (cond) { ok++; console.log('  ✓', nome) } else { falhas++; console.log('  ✗', nome) } }
const ler = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n')

const rota = ler('app/api/compose/route.ts')
const unlock = ler('app/api/compose/unlock/route.ts')
const lib = ler('lib/brandLogo.ts')
const api = ler('app/api/brand-logo/route.ts')
const studio = ler('app/(dashboard)/studio/StudioClient.tsx')
const picker = ler('components/BrandLogoPicker.tsx')

// ── o elemento e o acréscimo, EXECUTADOS (só as duas funções puras do arquivo) ──
const puro = ['brandLogoElement', 'withBrandLogo'].map((n) => {
  const m = lib.match(new RegExp(`export function ${n}[\\s\\S]*?\\n}\\n`))
  return m ? m[0].replace('export ', '') : ''
}).join('\n')
const js = ts.transpileModule(puro, { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText
const { brandLogoElement, withBrandLogo } = new Function(`${js}; return { brandLogoElement, withBrandLogo }`)()
checa('L1 as duas funções puras existem em lib/brandLogo.ts', typeof brandLogoElement === 'function' && typeof withBrandLogo === 'function')
const URL_OK = 'https://x.supabase.co/storage/v1/object/public/avatars/u/brand-logo.png?v=1'
const el = brandLogoElement(URL_OK, 42)
checa('L2 https vira imagem na faixa 10, do 0 ao fim, contain', !!el && el.type === 'image' && el.track === 10 && el.time === 0 && el.duration === 42 && el.fit === 'contain' && el.source === URL_OK)
// 1º filme real (Viva Connect, 01/10): em y 8% o logo cobria o 'usekineo.com/free' (faixa 9 termina em ~7,1% = 137 px).
checa('L3 canto esquerdo, com o TOPO da caixa abaixo da faixa da marca dágua (≥ 8%) e longe da legenda (≤ 25%)', !!el && parseFloat(el.x) <= 20 && parseFloat(el.y) - parseFloat(el.height) / 2 >= 8 && parseFloat(el.y) + parseFloat(el.height) / 2 <= 25)
checa('L4 sem URL / http / duração 0 = nenhum elemento', brandLogoElement(null, 30) === null && brandLogoElement('http://a/b.png', 30) === null && brandLogoElement(URL_OK, 0) === null)
const src = { duration: 33.5, elements: [{ type: 'video', track: 1 }, { type: 'text', track: 9 }] }
withBrandLogo(src, URL_OK)
checa('L5 withBrandLogo acrescenta UM elemento com a duração do próprio source', src.elements.length === 3 && src.elements[2].track === 10 && src.elements[2].duration === 33.5)
const sem = { duration: 30, elements: [{ type: 'video', track: 1 }] }
const antes = JSON.stringify(sem)
withBrandLogo(sem, null)
checa('L6 sem logo o source sai byte a byte igual', JSON.stringify(sem) === antes)

// ── onde entra: depois de montado, nos dois caminhos e no unlock; o montador não muda ──
checa('L7 compose acrescenta o logo da CONTA nos dois caminhos (hollywood + clássico)', rota.includes('withBrandLogo(hollywoodSource, await findBrandLogoUrl(authenticatedUserId, composeAdmin))') && rota.includes('withBrandLogo(source, await findBrandLogoUrl(authenticatedUserId, composeAdmin))'))
const iHw = rota.indexOf('withBrandLogo(hollywoodSource'), iHwSubmit = rota.indexOf('submitCreatomateOnce(hollywoodSource')
const iCl = rota.indexOf('withBrandLogo(source,'), iClBuild = rota.indexOf('      source = buildCreatomateSource({')
checa('L8 o logo entra DEPOIS de montar e ANTES de enviar', iHw > 0 && iHw < iHwSubmit && iCl > iClBuild)
checa('L9 a versão limpa (unlock) mantém o logo', unlock.includes('withBrandLogo(source, await findBrandLogoUrl(user.id, admin))'))
let composeIgual = null
try { composeIgual = execSync('git diff --quiet origin/main -- lib/compose.ts && echo same || echo diff', { encoding: 'utf8' }).trim() === 'same' } catch { composeIgual = null }
checa('L10 lib/compose.ts (trava 8.2) não muda', composeIgual !== false && !/brandLogo/i.test(ler('lib/compose.ts')))

// ── armazenamento e API ──
checa('L11 caminho fixo por conta: <uid>/brand-logo.(png|jpg)', lib.includes('`${userId}/${BRAND_LOGO_BASENAME}.${ext}`') && lib.includes("'image/png': 'png', 'image/jpeg': 'jpg'"))
checa('L12 busca nunca derruba o render (try/catch → null)', /export async function findBrandLogoUrl[\s\S]*?catch \(err\)[\s\S]*?return null/.test(lib))
checa('L13 API exige login, autorização de uso, PNG/JPG, ≤5 MB e moderação', api.includes('status: 401') && api.includes("form.get('rights')") && api.includes('BRAND_LOGO_TYPES[mime]') && api.includes('BRAND_LOGO_MAX_BYTES') && api.includes('moderateContent(') && api.includes('removeBrandLogo(userId)'))

// ── a tela ──
checa('L14 /studio mostra "Your logo" fora do modo clipe', studio.includes("import BrandLogoPicker from '@/components/BrandLogoPicker'") && studio.includes("{scriptMode !== 'clip' && <BrandLogoPicker />}"))
checa('L15 o picker só sobe com a caixa marcada e envia rights=true', picker.includes('disabled={!consent || busy}') && picker.includes("form.append('rights', 'true')"))

console.log(`\ntest-logo-da-marca-2026-10-01: ${ok} ok · ${falhas} falhas`)
process.exit(falhas ? 1 : 0)
