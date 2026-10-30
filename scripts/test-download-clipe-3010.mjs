// KINEO-DOWNLOAD-CLIPE-3010 — guardião estático: o Clipe baixa pelo helper comum (emite video_download_clicked e, com bytes,
// video_downloaded) e o painel conta "baixou" só com bytes recebidos. Briefing do Codex 30/10 (ClipsClient sem evento; painel somava clique).
import { readFileSync } from 'node:fs'
const rd = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8')
let ok = 0, f = 0
const check = (n, c) => { if (c) { ok++; console.log('ok   ' + n) } else { f++; console.log('FAIL ' + n) } }
const clips = rd('app/(dashboard)/clips/ClipsClient.tsx')
check('Clipe importa o helper comum', /import \{ downloadVideoFile \} from '@\/lib\/videoDownload'/.test(clips))
check('download do Clipe chama downloadVideoFile com surface clips', /downloadVideoFile\(\{[^}]*surface: 'clips'/.test(clips))
check('o fetch+blob próprio sem evento saiu', !/URL\.createObjectURL\(blob\)/.test(clips))
check('os dois botões passam o id do clipe', (clips.match(/, c\.id\)/g) ?? []).length >= 2)
check('o tipo aceita a tela clips', /export type DownloadSurface = [^\n]*'clips'/.test(rd('lib/videoDownload.ts')))
check('painel: baixou = só video_downloaded', /chave: 'baixou', rotulo: 'baixou', eventos: \['video_downloaded'\] \}/.test(rd('lib/admin/clientesJornadaRegras.ts')))
console.log(`${f ? '🔴' : '🟢'} download-clipe-3010: ${ok}/${ok + f}`)
if (f) process.exit(1)
