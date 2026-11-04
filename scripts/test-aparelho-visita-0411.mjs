// KINEO-APARELHO-VISITA-0411 [fundador 04/11: "quantos são por celular e quantos são por computador"] — guardião.
import fs from 'node:fs'
import { createOfflineLoader } from './test-support/offline-ts-loader.mjs'
let falhas = 0
const checa = (n, c) => { console.log((c ? '  ok  ' : '  FALHA ') + n); if (!c) falhas++ }
const com = (ua, doc) => createOfflineLoader({ globals: { navigator: { userAgent: ua }, document: doc ?? {} } })('lib/deviceClass.ts').deviceClass()
checa('iPhone e Android contam como celular', com('Mozilla iPhone') === 'mobile' && com('Linux Android 14 Mobile') === 'mobile')
checa('iPad que se diz Mac conta como celular pelo toque', com('Mozilla Macintosh', { ontouchend: null }) === 'mobile')
checa('Windows e Mac sem toque contam como computador', com('Mozilla Windows NT 10') === 'desktop' && com('Mozilla Macintosh') === 'desktop')
const t = fs.readFileSync('components/SourceCapture.tsx', 'utf8')
const ligado = (x) => x.includes('device: deviceClass()')
checa('toda visita grava o aparelho', ligado(t))
checa('mutante sem o campo fica vermelho', !ligado(t.replace('device: deviceClass()', '')))
console.log(falhas ? falhas + ' falha(s)' : 'tudo verde')
process.exit(falhas ? 1 : 0)
