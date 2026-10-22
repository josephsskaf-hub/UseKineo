// KINEO-ADS-CENA-95-2110 — preparação local apenas; não existe caminho de render, cobrança ou transporte nesta ferramenta.
import { readFile } from 'node:fs/promises'
import { extname } from 'node:path'
import { pathToFileURL } from 'node:url'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'
export const FOUNDER_PHOTO_PREFIX = 'https://cqqukkvjjrguayiyjvhh.supabase.co/storage/v1/object/public/renders/images/e92d81bf-0068-46c3-8de7-1f67e2006756/'
// Supplied by Joseph in the conversation on21/10/2026. References only: no HTTP, visual inspection or ownership lookup.
export const DEFAULT_FOUNDER_PHOTOS = Object.freeze({
  creamUGCpt: FOUNDER_PHOTO_PREFIX + '6973ac07-c0e1-4945-9268-0c107f2c4ff9.png',
  shoeProducten: FOUNDER_PHOTO_PREFIX + 'da91f983-1a1f-45ff-ab51-9c19ecbc39f7.png',
  watchProducten: FOUNDER_PHOTO_PREFIX + 'bba61b7d-3092-4a0d-ab2e-6441edd40081.png',
  perfumeUGCen: FOUNDER_PHOTO_PREFIX + 'd3d268db-fb6f-40a7-805b-cd86b3de7a4a.png',
  bagProductpt: FOUNDER_PHOTO_PREFIX + 'b34414ce-0f38-4422-96d2-62a224bf76c6.png',
  teaUGCpt: FOUNDER_PHOTO_PREFIX + '987fe4b9-0b56-436a-8088-95b14fae9aa6.png',
})
export const CALIBRATION_CASES = [
  { role: 'creamUGCpt', category: 'skincare', product: 'Creme GLOW', language: 'pt', formato: 'ugc', benefit: 'Textura leve.', offer: 'Frete grátis.', hooks: ['Textura pesa?', 'Creme sem excesso?', 'Hora do cuidado?'], pain: 'Procurando um passo simples para cuidar da pele na sua rotina?', demonstration: 'Veja o Creme GLOW sendo aplicado no próprio antebraço, com as mãos da mesma pessoa no banheiro claro.', cta: 'Peça seu Creme GLOW.' },
  { role: 'shoeProducten', category: 'footwear', product: 'Stride shoes', language: 'en', formato: 'product', benefit: 'Lightweight upper.', offer: 'Free shipping.', hooks: ['Ready to move?', 'Shoes by the door?', 'Next stop outside?'], pain: 'Wondering which shoes to put on before heading outside today?', demonstration: "Watch the Stride shoes go from being laced on the same person's feet to a short outdoor run.", cta: 'Choose your Stride shoes.' },
  { role: 'watchProducten', category: 'wearable', product: 'Pulse watch', language: 'en', formato: 'product', benefit: 'Battery for seven days.', offer: 'Free shipping this week.', hooks: ['Ready for your run?', 'Check your pace.', 'Time to run?'], pain: 'Your pace changes along the way.', demonstration: 'Look at the Pulse watch on your own wrist while you run around the track this morning.', cta: 'Order your Pulse watch.' },
  { role: 'perfumeUGCen', category: 'perfume', product: 'LUME perfume', language: 'en', formato: 'ugc', benefit: 'Floral scent.', offer: '20% off.', hooks: ['One spray before leaving?', 'Ready to head out?', 'A finishing spray?'], pain: 'Looking for a small finishing step before you head out tonight?', demonstration: 'See the LUME perfume bottle stay whole as the same person sprays it onto their own wrist.', cta: 'Shop your LUME perfume.' },
  { role: 'bagProductpt', category: 'bag', product: 'bolsa VIVA', language: 'pt', formato: 'product', benefit: 'Alça ajustável.', offer: 'Frete grátis.', hooks: ['Saindo com tudo?', 'Bolsa no ombro?', 'Pronta para sair?'], pain: 'Os seus objetos precisam acompanhar você entre a rua e o trabalho?', demonstration: 'Veja a bolsa VIVA no ombro da mesma pessoa, abrindo o compartimento principal antes de seguir.', cta: 'Escolha sua bolsa VIVA.' },
  { role: 'teaUGCpt', category: 'tea', product: 'Chá MESA', language: 'pt', formato: 'ugc', benefit: 'Sabor de camomila.', offer: 'Frete grátis.', hooks: ['Uma pausa agora?', 'Hora de preparar?', 'Chá na cozinha?'], pain: 'O preparo de uma bebida pode fazer parte do seu intervalo em casa.', demonstration: 'Veja o Chá MESA sendo preparado na cozinha pela mesma pessoa, com a embalagem inteira aparecendo.', cta: 'Peça seu Chá MESA.' },
]
const ROUTES = ['kling3', 'seedance2', 'veo31'], MODES = ['narrated', 'talking']

/** Structural provenance only. Offline code cannot verify availability, contents, ownership or a visual match. */
export function calibrationPhotos(raw = DEFAULT_FOUNDER_PHOTOS) {
  if (raw === null) return null
  if (typeof raw !== 'object' || Array.isArray(raw)) throw new Error('calibration_bad_photo_manifest')
  const roles = CALIBRATION_CASES.map(c => c.role)
  if (Object.keys(raw).length !== roles.length || Object.keys(raw).some(k => !roles.includes(k))) throw new Error('calibration_manifest_requires_six_roles')
  return Object.fromEntries(roles.map(role => {
    let url; try { url = new URL(raw[role]) } catch { throw new Error('calibration_bad_photo_url:' + role) }
    if (typeof raw[role] !== 'string' || !raw[role].startsWith(FOUNDER_PHOTO_PREFIX) || url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.href !== raw[role] || url.pathname.endsWith('/') || /%(?:2e|2f|5c)/i.test(url.pathname)) throw new Error('calibration_bad_photo_url:' + role)
    return [role, url.href]
  }))
}

function fixtureJson(c) {
  return async call => {
    if (call.images.length) return { category: c.category, confidence: .99, product: c.product, offer: '', benefits: [], photo_is_isolated_product: true }
    return { hooks: [...c.hooks], pain: c.pain, demonstration: c.demonstration, benefit: c.benefit, offer: c.offer, cta: c.cta }
  }
}

/** Imports only the pure planner through the SDK/network-denying loader. Every model response is labelled fixture data. */
export async function runCalibration(options, deps = {}) {
  if (options?.dry_run !== true || options.live || options.render) throw new Error('calibration_dry_run_required')
  const photos = calibrationPhotos(options.photos)
  const routes = options.route === undefined || options.route === 'all' ? ROUTES : [options.route]
  const modes = options.mode === undefined || options.mode === 'all' ? MODES : [options.mode]
  if (routes.some(r => !ROUTES.includes(r)) || modes.some(m => !MODES.includes(m))) throw new Error('calibration_bad_route_or_mode')
  const load = deps.load ?? createOfflineLoader()
  const { planCena95 } = load('lib/ads/cena/plan95.ts')
  const cases = []
  for (const c of CALIBRATION_CASES) {
    const sourcephoto = photos?.[c.role] ?? null
    const foto = sourcephoto ?? `offline://founder-photo-needed/${c.role}`
    const plans = []
    for (const voice_mode of modes) for (const route of routes) {
      const input = { foto, frase: `${c.product}; ${c.benefit}`, oferta: c.offer, beneficios: [c.benefit], language: c.language, formato: c.formato, voice_mode }
      let plan
      try { plan = await planCena95(input, route, fixtureJson(c), { userId: 'offline-calibration-founder', recentActors: [] }) }
      catch (e) {
        const reason = typeof e?.message === 'string' ? e.message : 'unknown'
        if (reason === 'cena_kling_native_speech_unsupported') { plans.push({ route, voice_mode, status: 'unsupported_route_language', reason, plan: null, estimated_cost: null, rendered: false }); continue }
        throw new Error(`calibration_fixture_rejected:${c.role}:${route}:${voice_mode}:${reason}`)
      }
      if (plan.input.foto !== foto || plan.quality95.closePhoto !== foto) throw new Error('calibration_photo_reference_lost:' + c.role)
      plans.push({ route, voice_mode, status: sourcephoto ? 'prepared_dry_run' : 'needs_founder_photo', plan_complete: Boolean(sourcephoto), executable: false, rendered: false, estimated_cost: plan.quality95.costs[route], prompts: { keyframes: plan.keyframePrompts, person: plan.videoPrompt, segments: plan.segmentPrompts, close_photo: plan.quality95.closePhoto }, plan })
    }
    cases.push({ role: c.role, product_example: c.product, language: c.language, formato: c.formato, sourcephoto, status: sourcephoto ? 'prepared_dry_run' : 'needs_founder_photo', executable: false, diagnostic: sourcephoto ? 'Referência fornecida; somente o caminho foi validado offline. Conteúdo da foto e correspondência visual NÃO verificados; dublê JSON não observa a imagem.' : 'Falta a foto exata do fundador. O marcador offline é incompleto e não pode ser enviado a um fornecedor. Forneça o manifest de seis fotos para preparar as referências.', sample_data_only: true, photo_validation: { performed: false, classifier: 'fixture_json', isolated_product: 'assumed_by_fixture_not_observed' }, plans })
  }
  return { marker: 'KINEO-ADS-CENA-95-2110', dry_run: true, offline: true, rendered: false, executable: false, actual_spend_usd: 0, actual_provider_usage: null, photo_manifest: photos ? options.photos === undefined ? 'founder_supplied_chat_2026_10_21_structure_checked_only' : 'provided_structure_checked_only' : 'missing', sample_data_only: true, requires_founder_copy_review: true, disclaimer: 'Produtos, ofertas e benefícios são dados EXEMPLO de calibração, não uma oferta real aprovada. Nenhuma foto foi lida por visão; nenhum filme foi gerado; notas e defeitos dependem de avaliação posterior.', cases }
}

export async function main(argv, deps = {}) {
  const options = { dry_run: false }
  let manifest
  for (let n = 0; n < argv.length; n++) {
    const arg = argv[n]
    if (arg === '--dry-run' || arg === '--dry_run') options.dry_run = true
    else if (['--live', '--render', '--no-dry-run', '--nodry'].includes(arg)) throw new Error('calibration_dry_run_required')
    else if (arg === '--photos' || arg === '--route' || arg === '--mode') {
      const value = argv[++n]; if (!value || value.startsWith('--')) throw new Error('calibration_argument_value_required')
      if (arg === '--photos') manifest = value; else options[arg.slice(2)] = value
    } else throw new Error('calibration_unknown_argument:' + arg)
  }
  if (!options.dry_run) throw new Error('calibration_dry_run_required')
  if (manifest) {
    if (extname(manifest).toLowerCase() !== '.json') throw new Error('calibration_manifest_must_be_json')
    options.photos = JSON.parse(await (deps.readFile ?? readFile)(manifest, 'utf8'))
  }
  return runCalibration(options, deps)
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).then(result => process.stdout.write(JSON.stringify(result, null, 2) + '\n')).catch(e => { process.stderr.write((e instanceof Error ? e.message : 'calibration_failed') + '\n'); process.exitCode = 1 })
}
