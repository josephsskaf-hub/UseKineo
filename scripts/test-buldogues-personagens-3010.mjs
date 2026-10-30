// KINEO-BULDOGUES-PERSONAGENS-3010 — guardião estático: Preta, Guilhermina e Amora são personagens fixos do AI Cartoon Videos,
// com retrato no public/ e ficha que começa pelo nome; a Amora sempre com a cadeirinha rosa.
import { readFileSync, existsSync } from 'node:fs'
const src = readFileSync(new URL('../lib/kidsCartoon/kidsCartoon.ts', import.meta.url), 'utf8')
let ok = 0, f = 0
const check = (n, c) => { if (c) { ok++; console.log('ok   ' + n) } else { f++; console.log('FAIL ' + n) } }
for (const [id, nome] of [['preta', 'Preta'], ['guilhermina', 'Guilhermina'], ['amora', 'Amora']]) {
  check(`${nome} no tipo`, new RegExp(`KidsCharacterId = [^\n]*'${id}'`).test(src))
  check(`${nome} na lista com retrato`, src.includes(`{ id: '${id}', name: '${nome}'`) && src.includes(`portrait: '/kids-cartoon/${id}.webp'`))
  check(`${nome}: ficha começa pelo nome`, src.includes(`sheet: '${nome}, `))
  check(`${nome}: retrato existe`, existsSync(new URL(`../public/kids-cartoon/${id}.webp`, import.meta.url)))
}
check('Amora com cadeirinha rosa na ficha', /sheet: 'Amora, [^']*pink dog wheelchair/.test(src))
check('os 6 antigos continuam', ['leo', 'mia', 'dino', 'pip', 'bibi', 'ollie'].every((id) => src.includes(`{ id: '${id}',`)))
console.log(`${f ? '🔴' : '🟢'} buldogues-personagens-3010: ${ok}/${ok + f}`)
if (f) process.exit(1)
