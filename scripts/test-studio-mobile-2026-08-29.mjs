// KINEO-MOBILE-2026-08-29 — provas do conserto mobile do /studio.
//
// Reproduzido na auditoria com viewport 375x812 no site em producao:
//   1. .rail (coluna dos motores) ficava sticky com o grid empilhado -> a
//      caixa de escrever rolava POR BAIXO dos cards, texto sobre texto;
//   2. o modal de boas-vindas estourava pra direita (card Studio cortado,
//      botao de comprar inalcancavel) e nao rolava em tela baixa.
// Rodar: node scripts/test-studio-mobile-2026-08-29.mjs
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
const R = join(dirname(fileURLToPath(import.meta.url)), '..')
let ok = 0, bad = 0
const chk = (n, c, d = '') => { if (c) { ok++; console.log(`  ✓ ${n}`) } else { bad++; console.log(`  ✗ ${n}${d ? ' — ' + d : ''}`) } }
const ler = (p) => readFileSync(join(R, p), 'utf8')

console.log('\n═══ MOBILE /studio — a caixa de escrever alcançável de novo ═══\n')

const kit = ler('components/studioKit.tsx')
chk('desktop mantém o rail sticky (duas colunas lado a lado)',
  kit.includes('.stu .rail{position:sticky;top:20px'))
chk('mobile DESLIGA o sticky (a causa raiz da sobreposição)',
  /\@media\(max-width:900px\)\{[^}]*\}[\s\S]*?\.stu \.rail\{position:static\}/.test(kit) || kit.includes('.stu .rail{position:static}'))
chk('o bloco mobile existe dentro de @media 900px',
  /@media\(max-width:900px\)\{\s*\.stu\{padding:16px 14px 96px\}/.test(kit))
chk('grid continua empilhando em 1 coluna no mobile',
  kit.includes('.stu .grid{grid-template-columns:1fr;gap:16px}'))
chk('padding lateral mobile reduzido (34px era desktop)',
  kit.includes('padding:16px 14px 96px'))

const modal = ler('components/WelcomeOfferModal.tsx')
chk('planos do modal EMPILHAM no celular (flexWrap)',
  modal.includes("display: 'flex', gap: 10, flexWrap: 'wrap'"))
chk('card de plano tem base 230px (nunca mais cortado à direita)',
  modal.includes("flex: '1 1 230px', minWidth: 0"))
chk('modal rola por dentro em tela baixa (92vh)',
  modal.includes("maxHeight: '92vh', overflowY: 'auto'"))

console.log(`\n═══ ${ok} passaram, ${bad} falharam ═══\n`)
process.exit(bad === 0 ? 0 : 1)
