// Offline rendering of the real page; no Next server, credentials or provider calls.
import { writeFileSync, readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { React, offlineModules, renderToStaticMarkup } from '../../scripts/gpt24h-offline-support.mjs'
const root = resolve(import.meta.dirname, '../..')
const load = offlineModules({ mocks: {
  'components/Footer.tsx': { __esModule: true, default: () => null },
  'lib/analytics.ts': { trackEvent() {} },
  'lib/supabase/client.ts': { createClient: () => ({ auth: { getSession: async () => ({ data: {} }) } }) },
} })
for (const lang of ['en', 'pt', ...(process.argv.includes('--after') ? ['es'] : [])]) {
  const { BlackFridayPage } = load('components/ugc/UgcPages.tsx')
  let html = renderToStaticMarkup(React.createElement(BlackFridayPage, { lang }))
  html = html.replace(/<video[^>]*poster="([^"]+)"[^>]*><\/video>/g, '<img src="$1" alt="Existing Kineo product ad example">')
  html = html.replace(/(src|poster)="(\/[^"?#]+)"/g, (all, attr, path) => {
    const file = resolve(root, 'public' + path)
    if (!existsSync(file)) return all
    const mime = path.endsWith('.webp') ? 'image/webp' : path.endsWith('.png') ? 'image/png' : path.endsWith('.svg') ? 'image/svg+xml' : 'image/jpeg'
    return `${attr}="data:${mime};base64,${readFileSync(file).toString('base64')}"`
  })
  const phase = process.argv.includes('--after') ? 'after' : 'before'
  writeFileSync(resolve(import.meta.dirname, `${phase}-${lang}.html`), `<!doctype html><html lang="${lang}"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Kit Black Friday ${phase} ${lang}</title><style>*{box-sizing:border-box}body{margin:0;font-family:Arial,sans-serif}</style>${html}</html>`)
}
