// KINEO-AFILIADO-50-2610: preserve the original historical boundary, not a later test adaptation.
// Every exception has an exact approved subject, exact complete path set, one parent and ancestry after BASE.
import { AFILIADO50_2610_BASE, semAfiliado50_2610 } from './desfaz-afiliado50-2610.mjs'
export const AFFILIATE50_HISTORY_SCOPES = {
  "test: project affiliate layer at historical Ads and film guard ingresses [TRAVA 8.2 — vai do fundador 26/10 A]": [
    "scripts/test-ads-cena-2110.mjs",
    "scripts/test-ads-cena-95-plan-failed-2110.mjs",
    "scripts/test-ads-cena-ajuste-2110.mjs",
    "scripts/test-ads-cena-respaldo-2110.mjs",
    "scripts/test-ads-escolha-publico-2410.mjs",
    "scripts/test-ads-qualidade-2110.mjs",
    "scripts/test-apresentador-olhos-1910.mjs",
    "scripts/test-close-real-v3-1910.mjs",
    "scripts/test-filmes-f1-virgula-1910.mjs",
    "scripts/test-filmes-f1f3-ajuste-1910.mjs",
    "scripts/test-filmes-f1f4-1910.mjs"
  ],
  "test: preserve Close adjustment exact checks across affiliate test updates [TRAVA 8.2 — vai do fundador 26/10 A]": [
    "scripts/test-close-real-ajuste-1910.mjs",
    "scripts/test-support/desfaz-afiliado50-2610.mjs"
  ],
  "KINEO-AFILIADO-50-2610: project exact source at historical test ingresses [TRAVA 8.2 — vai do fundador 26/10 \"A\"]": [
    "scripts/test-admin-leve-undo-2310.mjs",
    "scripts/test-ads-cena-95-pacing-2110.mjs",
    "scripts/test-ads-cena-retomada-2110.mjs",
    "scripts/test-ads-cena-segue-2110.mjs",
    "scripts/test-ads-cena-texto-2310.mjs",
    "scripts/test-ads-escolha-2310.mjs",
    "scripts/test-ads-nota9-2110.mjs",
    "scripts/test-close-real-legenda-1910.mjs",
    "scripts/test-close-real-legenda-corte-1910.mjs",
    "scripts/test-close-real-legenda-pilula-1910.mjs",
    "scripts/test-close-real-v3-1910.mjs",
    "scripts/test-e4-saida-b-cota-seedance-2026-09-29.mjs",
    "scripts/test-filmes-f1f3-publico-2010.mjs",
    "scripts/test-kit-bf-1910.mjs",
    "scripts/test-legenda-bengali-2010.mjs",
    "scripts/test-meta95-escrita-2010.mjs",
    "scripts/test-meta95-personagem-2010.mjs",
    "scripts/test-meta95-personagem-ajuste-2010.mjs",
    "scripts/test-trafego-undo-2310.mjs",
    "scripts/test-ugc-ajustes-2010.mjs",
    "scripts/test-verbatim-intocavel-2010.mjs"
  ],
  "test: preserve Close exact undo across affiliate guard updates [TRAVA 8.2 — vai do fundador 26/10 A]": [
    "scripts/test-close-real-1910.mjs",
    "scripts/test-support/desfaz-afiliado50-2610.mjs"
  ],
  "test: preserve EOL and MCP historical inputs after affiliate layer [TRAVA 8.2 — vai do fundador 26/10 A]": [
    "scripts/test-cards-giro-undo-2410.mjs",
    "scripts/test-idiomas-formatos-undo-2410.mjs",
    "scripts/test-mcp-studio-2010.mjs",
    "scripts/test-mcp-studio-ajuste-2010.mjs",
    "scripts/test-roteiro-curto-undo-2210.mjs"
  ],
  "test: project affiliate layer at ten historical source ingresses [TRAVA 8.2 — vai do fundador 26/10 A]": [
    "scripts/test-avatar-estorno-2010.mjs",
    "scripts/test-avatar-preso-2010.mjs",
    "scripts/test-bebe-que-fala-2010.mjs",
    "scripts/test-desenho-nota9-2110.mjs",
    "scripts/test-desenho-som-2110.mjs",
    "scripts/test-home-3-cards-1910.mjs",
    "scripts/test-home-cards-botoes-2010.mjs",
    "scripts/test-home-cards-claros-2010.mjs",
    "scripts/test-home-remodela-2010.mjs",
    "scripts/test-menu-ugc-2010.mjs"
  ],
  "KINEO-AFILIADO-50-2610: keep later test compatibility outside historical delivery ownership [TRAVA 8.2 — vai do fundador 26/10 \"A\"]": [
    "scripts/test-avatar-preso-2010.mjs"
  ],
  "KINEO-AFILIADO-50-2610: preserve verified historical foreign boundaries and all reader sites [TRAVA 8.2 — vai do fundador 26/10 \"A\"]": [
    "scripts/test-filmes-f1-virgula-1910.mjs",
    "scripts/test-filmes-f1f3-ajuste-1910.mjs",
    "scripts/test-filmes-f1f4-1910.mjs",
    "scripts/test-kids-venda-2010.mjs",
    "scripts/test-support/affiliate50-history-2610.mjs",
    "scripts/test-verbatim-intocavel-2010.mjs"
  ]
}

export function isAffiliate50CompatibilityCommit(git, hash) {
  if (!/^[a-f0-9]{40}$/.test(hash)) return false
  try {
    const [parents, subject] = git(['show', '-s', '--format=%P%x00%s', hash]).trim().split('\0')
    const expected = AFFILIATE50_HISTORY_SCOPES[subject]
    if (!expected || parents.trim().split(/\s+/).length !== 1) return false
    const paths = git(['diff-tree', '--no-commit-id', '--name-only', '--no-renames', '-r', hash]).trim().split('\n').filter(Boolean).sort()
    if (JSON.stringify(paths) !== JSON.stringify(expected)) return false
    return hash !== AFILIADO50_2610_BASE && git(['merge-base', AFILIADO50_2610_BASE, hash]).trim() === AFILIADO50_2610_BASE
  } catch { return false }
}

export function selectAffiliate50ForeignRef(git, args) {
  if (args[0] !== 'log' || !args.includes('-1') || !args.includes('--format=%H') || !args.includes('--invert-grep')) {
    throw new Error('Expected the original single-result historical foreign selector')
  }
  const candidates = git(args.filter(arg => arg !== '-1')).trim().split('\n').filter(Boolean)
  return candidates.find(hash => !isAffiliate50CompatibilityCommit(git, hash)) ?? ''
}

export function readAffiliate50ForeignSource(git, hash, rel) {
  const source = git(['show', hash + ':' + rel])
  // A genuinely earlier foreign version must retain its original layers. Later
  // unrelated edits keep their selected ref and lose only the exact affiliate layer.
  return git(['merge-base', AFILIADO50_2610_BASE, hash]).trim() === AFILIADO50_2610_BASE
    ? semAfiliado50_2610(rel, source) : source
}
