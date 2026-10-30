// KINEO-CLIPE-CONTO-3010 + KINEO-CLIPE-LETRAS-3010 — guardião sem rede com os pedidos reais da revisão de 30/10 (15:45):
// conto em prosa no Clipe ganha o aviso do Filme narrado; espelho/tela/camiseta mandam "texto ilegível" ao motor.
import { pareceRoteiroDeFilme, frasesDoTexto } from '../lib/clips/clipTextoLongo'
import { buildClipFalInput, promptDoClipeSemLetras, CLIPE_SEM_LETRAS } from '../lib/clips/clipCatalog'
let ok = 0, f = 0
const check = (n: string, c: boolean) => { if (c) { ok++; console.log('ok   ' + n) } else { f++; console.log('FAIL ' + n) } }
const CONTO = 'Às 3:33 da madrugada, alguém começou a bater na janela do meu quarto. Eu moro no décimo andar. Levantei devagar. Peguei o celular para iluminar. Do outro lado do vidro, um vulto sorria. Ele sabia o meu nome.'
check('conto de 6 frases conta 6', frasesDoTexto(CONTO) === 6)
check('conto em prosa ganha o aviso (sem palavra de fala)', pareceRoteiroDeFilme(CONTO))
check('pedido de clipe de 2 frases segue clipe', !pareceRoteiroDeFilme('A golden retriever runs on the beach at sunset. Slow motion.'))
check('pedido de 1 linha sem ponto segue clipe', !pareceRoteiroDeFilme('perfume bottle rotating on black marble'))
const ESPELHO = 'Anoche fui al baño a las 3 y mi reflejo en el espejo no estaba haciendo lo mismo que yo'
check('espelho (ES) manda texto ilegível', promptDoClipeSemLetras(ESPELHO).endsWith(CLIPE_SEM_LETRAS))
check('celular (PT) manda texto ilegível', promptDoClipeSemLetras('ele pega o celular no escuro').endsWith(CLIPE_SEM_LETRAS))
check('sem superfície de texto, o prompt fica igual', promptDoClipeSemLetras('a cat jumps on a table') === 'a cat jumps on a table')
check('não duplica a ordem', promptDoClipeSemLetras(promptDoClipeSemLetras(ESPELHO)) === promptDoClipeSemLetras(ESPELHO))
const payload = buildClipFalInput({ engine: 'kling', mode: 't2v', model: 'x', seconds: 5, aspect: '9:16', prompt: ESPELHO, imageUrl: null } as never)
check('o payload da fal leva a ordem', String(payload.prompt).endsWith(CLIPE_SEM_LETRAS))
console.log(`${f ? '🔴' : '🟢'} clipe-conto-letras-3010: ${ok}/${ok + f}`)
if (f) process.exit(1)
