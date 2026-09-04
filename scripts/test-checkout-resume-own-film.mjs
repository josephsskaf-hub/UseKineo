#!/usr/bin/env node
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const requireFromRepo = createRequire(join(root, 'package.json'))
const ts = requireFromRepo('typescript')
const rel = 'lib/growth/checkoutResumeFilm.ts'
const source = readFileSync(join(root, rel), 'utf8')
const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }, fileName: join(root, rel) }).outputText
const module = { exports: {} }
new Function('require', 'module', 'exports', output)((id) => { throw new Error(rel + ' imported unexpected module: ' + id) }, module, module.exports)
const policy = module.exports
let checks = 0
const equal = (actual, expected, message) => { assert.deepEqual(actual, expected, message); checks++ }
const ok = (value, message) => { assert.ok(value, message); checks++ }
const older = { id: 'secret-id', status: 'completed', title: '  My first   mystery\nfilm  ', video_url: 'https://cdn.example.com/older.mp4', thumbnail_url: 'https://cdn.example.com/older.jpg', duration: '35', created_at: '2026-09-01T12:00:00Z' }
const newer = { status: 'completed', title: 'The lighthouse that answered back', video_url: 'https://cdn.example.com/newer.mp4', enhanced_url: 'https://cdn.example.com/newer-hd.mp4', thumbnail_url: null, duration: 60, created_at: '2026-09-03T12:00:00Z' }
const selected = policy.selectCheckoutResumeFilm([older, newer])
equal(selected.title, 'The lighthouse that answered back', 'latest completed film wins')
equal(selected.playbackUrl, 'https://cdn.example.com/newer-hd.mp4', 'enhanced owner film is preferred')
equal(selected.posterUrl, null, 'missing poster stays honest')
equal(selected.durationSeconds, 60, 'numeric duration survives')
equal(policy.selectCheckoutResumeFilm([{ ...newer, status: 'processing' }]), null, 'processing film never appears as proof')
equal(policy.selectCheckoutResumeFilm([{ ...newer, status: 'failed' }]), null, 'failed film never appears as proof')
equal(policy.selectCheckoutResumeFilm([{ ...newer, video_url: 'javascript:alert(1)', enhanced_url: null }]), null, 'script URL is rejected')
equal(policy.selectCheckoutResumeFilm([{ ...newer, video_url: 'http://cdn.example.com/video.mp4', enhanced_url: null }]), null, 'mixed-content URL is rejected')
equal(policy.selectCheckoutResumeFilm(null), null, 'invalid API body has generic fallback')
const cleaned = policy.selectCheckoutResumeFilm([older])
equal(cleaned.title, 'My first mystery film', 'owner-visible title is compact and control-free')
equal(cleaned.durationSeconds, 35, 'numeric string is normalized')
const withFilm = policy.checkoutResumeFilmTelemetry(selected)
equal(withFilm.personal_film_version, 'checkout_resume_own_film_v1', 'experiment is versioned')
equal(withFilm.has_personal_film, true, 'film presence is measurable')
equal(withFilm.film_has_thumbnail, false, 'poster availability is measurable')
equal(withFilm.film_duration_bucket, 'medium', 'duration is bucketed')
const withoutFilm = policy.checkoutResumeFilmTelemetry(null)
equal(withoutFilm.has_personal_film, false, 'generic fallback is measurable')
equal(withoutFilm.film_duration_bucket, 'unknown', 'missing duration is not invented')
const serialized = JSON.stringify(withFilm)
for (const secret of ['secret-id', 'lighthouse', 'cdn.example.com', '.mp4', 'title', 'url']) ok(!serialized.toLowerCase().includes(secret), 'telemetry excludes ' + secret)
const client = readFileSync(join(root, 'components/CheckoutResumeBanner.tsx'), 'utf8')
const hook = readFileSync(join(root, 'components/useCheckoutResumeFilm.ts'), 'utf8')
ok(hook.includes("fetch('/api/videos'"), 'hook reads owner-scoped route')
ok(hook.includes('selectCheckoutResumeFilm'), 'hook executes film policy')
const css = readFileSync(join(root, 'components/CheckoutResumeBanner.module.css'), 'utf8')
ok(client.includes("import styles from './CheckoutResumeBanner.module.css'"), 'live banner imports responsive layout')
ok(client.includes('className={styles.film}'), 'film uses responsive dimensions')
ok(css.includes('@media (max-width: 520px)'), 'mobile breakpoint is explicit')
ok(css.includes('flex-wrap: wrap'), 'mobile layout gives actions their own row')
ok(client.includes('checkoutResumeFilmTelemetry'), 'live events use closed metadata')
ok(client.includes('poster={film.posterUrl ?? undefined}'), 'live preview uses selected poster')
ok(client.includes('src={film.playbackUrl}'), 'live preview uses selected playback URL')
ok(client.includes('Your latest film is ready'), 'film variant leads with delivered value')
ok(client.includes('Finish secure checkout'), 'film variant names next action')
ok(client.includes('checkout_resume_film_proof_loaded'), 'visible proof has its own denominator')
console.log('checkout-resume-own-film: ' + checks + '/' + checks + ' checks passed')
