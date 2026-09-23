// KINEO-LACO-VIRAL-2026-09-17 — guardião do laço viral ("refaça este filme"). Fundador: "vai pro 5 laço viral".
// Sem rede, sem banco. Números de 17/09: 716 filmes/30 d, 1 publicado; /v/: 234 sessões, 7 cliques, 0 contas.
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const rd = (p) => readFileSync(join(root, p), 'utf8').replace(/\r\n/g, '\n')
let ok = 0; const falhas = []
const checa = (nome, cond) => { if (cond) { ok += 1; return } falhas.push(nome); console.error('  ✗ ' + nome) }

console.log('1) a rota de visibilidade do dono')
const rt = rd('app/api/video/visibility/route.ts')
checa('exige sessão e devolve 401 sem usuário', rt.includes('await supabase.auth.getUser()') && rt.includes("if (!user) return json({ error: 'unauthorized' }, 401)"))
checa('só o DONO muda o próprio filme (403), e só filme completo publica (409)', rt.includes("if (row.user_id !== user.id) return json({ error: 'forbidden' }, 403)") && rt.includes("if (action === 'publish' && row.status !== 'completed') return json({ error: 'not_completed' }, 409)"))
checa('compare-and-set igual ao da rota assinada (dois cliques não emitem dois consentimentos)', rt.includes("query = undo ? query.eq('published_at', row.published_at) : query.is('published_at', null)") && rt.includes(".eq('id', videoId).eq('user_id', user.id)"))
checa('grava o MESMO evento da rota assinada, com origem, e com await', /await writeServerEvent\(\{\n\s*name: undo \? 'video_unpublished_v1' : 'video_published_v1',/.test(rt) && rt.includes("path: '/api/video/visibility'"))
checa('recusa origem cruzada e só aceita ação/fonte conhecidas', rt.includes("if (origin && origin !== new URL(req.url).origin) return json({ error: 'bad_origin' }, 403)") && rt.includes("body.action === 'publish' || body.action === 'unpublish'") && rt.includes("VISIBILITY_SOURCES = ['done_screen', 'my_videos']"))

console.log('2) o caminho público só nasce depois do clique')
const vs = rd('lib/videoShare.ts')
checa('a trava global continua false (quem não sabe se a página existe não fabrica URL)', vs.includes('export const PUBLIC_VIDEO_SHARING_ENABLED = false as const'))
checa('buildPublicVideoSharePath continua atrás da trava e delega ao caminho publicado', vs.includes('if (!PUBLIC_VIDEO_SHARING_ENABLED) return null\n  return buildPublishedVideoSharePath(videoId, referralCode)'))
checa('buildPublishedVideoSharePath existe, sem a trava, e leva o referral', /export function buildPublishedVideoSharePath\(\n\s*videoId: string \| null \| undefined,\n\s*referralCode\?: string \| null,\n\): string \| null \{\n\s*const id = \(videoId \?\? ''\)\.trim\(\)/.test(vs) && vs.includes("export const VIRAL_LOOP_VERSION = 'laco_viral_v1'"))

console.log('3) a tela do filme pronto')
const gc = rd('app/(dashboard)/generate/GenerateClient.tsx')
checa('estado por filme (zera quando o vídeo muda)', gc.includes("const [publicPagePublished, setPublicPagePublished] = useState(false)") && gc.includes("useEffect(() => { setPublicPagePublished(false); setPublishPageState('idle') }, [publicVideoId])"))
checa('o caminho público só usa o builder sem trava DEPOIS de publicado', /if \(publicPagePublished\) return buildPublishedVideoSharePath\(publicVideoId, shareReferralCode\)\n\s*return buildPublicVideoSharePath\(publicVideoId, shareReferralCode\)/.test(gc))
checa('o botão chama a rota do dono com publish + done_screen e só vira estado com res.ok', gc.includes("fetch('/api/video/visibility', {") && gc.includes("body: JSON.stringify({ videoId: publicVideoId, action: 'publish', source: 'done_screen' })") && /if \(!res\.ok\) throw new Error\(String\(res\.status\)\)\n\s*setPublicPagePublished\(true\)/.test(gc))
checa('eventos: clique, publicado, falhou', gc.includes("trackEvent('video_page_publish_clicked'") && gc.includes("trackEvent('video_page_published'") && gc.includes("trackEvent('video_page_publish_failed'"))
checa('o cartão público (WhatsApp/X/copiar) volta quando publicado; a trava global segue valendo para o resto', gc.includes('{(PUBLIC_VIDEO_SHARING_ENABLED || publicPagePublished) ? (') )
checa('a frase "temporarily paused" do rodapé saiu; o botão diz o que acontece e nada é público antes dele', !gc.includes('Public watch links are temporarily paused. Kineo will not publish') && gc.includes("'Create a public watch page & share it →'") && gc.includes('Nothing is public until you press it.'))
checa('o botão só aparece com um vídeo público identificável', /\{publicVideoId && \(\n\s*<button\n\s*type="button"\n\s*onClick=\{handlePublishWatchPage\}/.test(gc))

console.log('4) a página pública pede "faça o seu"')
const pg = rd('app/v/[id]/page.tsx')
checa('botão principal: cadastro com o tema deste filme (mesmo contrato das vitrines), campanha própria', pg.includes("href={generateFromScriptHref(title, 'public_video_remake')}") && pg.includes('Make your own version — free →') && /placement="under_player"\n\s*destination="\/signup"/.test(pg))
checa('o remix sem cadastro continua, como secundário, medido à parte', pg.includes('placement="under_player_secondary"') && pg.includes('Or remix just the script — no signup'))
checa('a página de preview expirado continua com a porta antiga', pg.includes('placement="expired_preview"'))

console.log('5) My Videos: publicar e despublicar pela própria lista (antes: só pelo link do e-mail)')
const hc = rd('app/(dashboard)/history/HistoryClient.tsx'), hp = rd('components/library/VideoCollection.tsx')
checa('a página lê published_at da linha do vídeo', hp.includes("duration, platform, published_at')") && hc.includes('published_at?: string | null'))
checa('o clique fala com a rota do dono (publish/unpublish, origem my_videos) e só muda estado com res.ok', hc.includes("body: JSON.stringify({ videoId: video.id, action, source: 'my_videos' })") && /if \(!res\.ok\) throw new Error\(String\(res\.status\)\)\n\s*setVisibility/.test(hc))
checa('publicada: Share link + Unpublish; privada e completa: Publish page; incompleta: Private', hc.includes("(PUBLIC_VIDEO_SHARING_ENABLED || isPublished(video)) && video.status === 'completed' ? (") && hc.includes("handleVisibility(video, 'unpublish')") && hc.includes("handleVisibility(video, 'publish')") && hc.includes('Only finished films can have a public page'))
checa('o link copiado usa o caminho publicado só depois do clique', /if \(isPublished\(video\)\) return buildPublishedVideoSharePath\(video\.id, referralCode\)/.test(hc))
checa('eventos de publicar/despublicar no My Videos', hc.includes("'video_page_unpublish_clicked'") && hc.includes("'video_page_unpublished'"))

console.log(`\n═══ ${ok} passaram, ${falhas.length} falharam ═══`)
process.exit(falhas.length ? 1 : 0)
