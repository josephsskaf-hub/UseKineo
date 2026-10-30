// KINEO-REVISOR-RESTO-3010 — guardião sem rede: texto curto que pede fala, narração ou mais tempo do que o clipe tem ganha o aviso
// "isto vira um clipe curto" com a porta do Filme narrado (revisões de 30/10: 6 clipes MUDOS para quem pediu fala; anúncio de 30 s em 10 s).
import { pareceRoteiroDeFilme } from '../lib/clips/clipTextoLongo'
const casos: [string, boolean][] = [
 ['Ad for Trans Web Internet, a young man knocking on doors speaking in Urdu, 30 seconds', true],
 ['terror: não deixe a mamãe entrar, narração em espanhol', true],
 ['Toto the Truck 35s 3D', true],
 ['Mia: "Did you hear that?"\nLeo: "No..."', true],
 ['a golden retriever running on the beach at sunset', false],
 ['perfume bottle rotating, 5 seconds, cinematic light', false],
 ['a cat jumps on a table, 10 s', false],
]
let f = 0; for (const [t, e] of casos) { const r = pareceRoteiroDeFilme(t); if (r !== e) { f++; console.log('FAIL', t) } }
console.log(`${f ? '🔴' : '🟢'} clipe-pede-fala-3010: ${casos.length - f}/${casos.length}`); if (f) process.exit(1)
