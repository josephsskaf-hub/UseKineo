// sprint-ui #10 — prova da busca na Library (3 abas), 30/08/2026.
// Continuacao do sprint #9: /history e /my-videos ja buscavam; a Library nao.
import { readFileSync } from 'node:fs'
const src = readFileSync(new URL('../app/(dashboard)/library/LibraryClient.tsx', import.meta.url), 'utf8')
let pass = 0, fail = 0
const check = (name, cond) => { cond ? pass++ : (fail++, console.error('FAIL: ' + name)) }

// estado e filtro em memoria (zero rede)
check('estado q existe', src.includes("const [q, setQ] = useState('')"))
check('needle normalizado (trim+lowercase)', src.includes('q.trim().toLowerCase()'))
check('videos filtram por titulo', src.includes("(v.title ?? '').toLowerCase().includes(needle)"))
check('imagens filtram por motor', src.includes("(im.model ?? '').toLowerCase().includes(needle)"))
check('audio filtra por texto/voz/motor', src.includes('[a.text, a.voice, a.model].filter(Boolean)'))

// campo de busca
check('so aparece com 6+ itens na aba ativa', src.includes('activeCount >= 6'))
check('placeholder por aba', src.includes("'Search your videos…'") && src.includes("'Search your images…'") && src.includes("'Search your audio…'"))
check('16px anti-zoom iOS (licao sprint #1)', /type="search"[\s\S]{0,600}fontSize: 16/.test(src))
check('input type=search', src.includes('type="search"'))
check('aria-label acessivel', src.includes("'Search your videos by title'"))

// grids usam a lista FILTRADA
check('grid de videos renderiza fVids', src.includes('fVids.map((v)'))
check('grid de imagens renderiza fImgs', src.includes('fImgs.map((im)'))
check('lista de audio renderiza fAuds', src.includes('fAuds.map((a)'))

// zero resultado mostra o termo + Clear search (nunca mascara como acervo vazio)
check('zero resultado video mostra o termo', src.includes('No videos match'))
check('zero resultado imagem mostra o termo', src.includes('No images match'))
check('zero resultado audio mostra o termo', src.includes('No audio matches'))
check('botao Clear search limpa a busca', src.includes('Clear search') && src.includes("setQ('')"))

// invariantes preservadas
check('abas contam o acervo TOTAL (nao o filtrado)', src.includes('count: vids.length') && !src.includes('count: fVids.length'))
check('CTA de vazio decide pelo acervo REAL', src.includes('vids.length === 0 ?'))
check('trocar de aba limpa a busca', src.includes("setTab(t.key); setQ('')"))
check('estado de erro de leitura preservado (sprint #3)', src.includes('loadFailed') && src.includes('Try again'))
check('skeleton de loading preservado', src.includes('Loading your library'))

console.log(`\n${pass} passaram, ${fail} falharam`)
process.exit(fail ? 1 : 0)
