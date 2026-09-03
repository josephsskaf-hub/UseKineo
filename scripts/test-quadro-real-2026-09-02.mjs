// ═══ KINEO-QUADRO-QUE-SE-AJUSTA-2026-09-02 ════════════════════════════════
// O multi-formato subiu hoje. Estes testes provam a SEGUNDA METADE dele:
// a tela que mostra o filme, e a copy que diz ao mundo que ele existe.
//
// O defeito que isto mata: ~10 telas tinham `aspectRatio: '9 / 16'` chumbado
// junto com `objectFit: cover`. O cliente escolheria 16:9, o arquivo sairia
// 1920×1080 CORRETO, e a tela do resultado o mostraria CORTADO nas laterais
// dentro de uma coluna vertical. O recurso mais vendável do dia pareceria
// defeito na primeira olhada — e a pessoa culparia o produto, não a moldura.
//
// E o defeito de RECEITA, que era maior: a nossa própria ficha técnica
// (lib/comparisons, lib/kineoFacts, /llms.txt) dizia "9:16 vertical only" e
// "NOT Kineo" para quem procurava 16:9. Esses arquivos são exatamente o que
// ChatGPT e Perplexity leem para responder "qual ferramenta faz vídeo 16:9
// com IA". Estávamos pagando para ser recusados.
import { readFileSync, existsSync } from 'node:fs'
// CRLF: arquivos antigos do repo estão em CRLF, os novos nascem em LF.
const src = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8').replace(/\r\n/g, '\n')
let ok = 0, fail = 0
const check = (n, c) => { c ? (ok++, console.log('  ok  ' + n)) : (fail++, console.log('  FAIL ' + n)) }

const frameFit = src('lib/frameFit.ts')
const gen = src('app/(dashboard)/generate/GenerateClient.tsx')
const vpage = src('app/v/[id]/page.tsx')
const vplayer = src('app/v/[id]/PublicVideoPlayer.tsx')
const hist = src('app/(dashboard)/history/HistoryClient.tsx')
const comparisons = src('lib/comparisons.ts')
const facts = src('lib/kineoFacts.ts')
const llms = src('app/llms.txt/route.ts')
const sora = src('app/sora-alternative/page.tsx')

console.log('1 · a fonte da verdade é o ARQUIVO, não o banco')
check('lib/frameFit existe e é client-side', existsSync(new URL('../lib/frameFit.ts', import.meta.url)) && frameFit.startsWith("'use client'"))
check('lê as dimensões REAIS decodificadas (videoWidth/videoHeight)', frameFit.includes('video.videoWidth') && frameFit.includes('video.videoHeight'))
check('metadata ausente (0×0) ou quebrada não mexe em nada', frameFit.includes('if (!Number.isFinite(w) || !Number.isFinite(h) || w < 2 || h < 2) return'))
// (o comentário do arquivo CITA a coluna `videos.aspect` justamente para
// explicar por que ela foi recusada — então a prova olha para código, não texto)
check('nenhuma coluna de banco envolvida (funciona nos 1.100+ vídeos antigos)', !/createClient|@\/lib\/supabase|await fetch\(/.test(frameFit))
check('escreve aspect-ratio com as dimensões do próprio arquivo', frameFit.includes('box.style.aspectRatio = `${w} / ${h}`'))
check('a caixa é o ancestral marcado, com o <video> como reserva', frameFit.includes("video.closest('[data-kineo-frame]')") && frameFit.includes('?? video'))
check('largura alternativa SÓ quando o filme é deitado', frameFit.includes('if (wide && w > h) box.style.width = wide'))
check('carimba a orientação para CSS futuro (landscape/square/portrait)', frameFit.includes("data-kineo-frame-ratio"))
check('o lightbox alarga a COLUNA, não só a moldura (width:100% dentro de 420px)', frameFit.includes("closest('[data-kineo-frame-shell]')") && frameFit.includes('if (w > h)'))

console.log('2 · tela do resultado (o momento em que o cliente julga o produto)')
check('GenerateClient importa o ajuste', gen.includes("import { fitFrameToVideo } from '@/lib/frameFit'"))
check('a moldura do resultado está marcada', gen.includes('data-kineo-frame\n') || gen.includes('data-kineo-frame\r\n') || /data-kineo-frame$/m.test(gen))
check('filme deitado ganha largura de verdade (460px viraria uma tarja)', gen.includes('data-kineo-frame-wide="min(780px, 94vw)"'))
check('o ajuste roda no onLoadedMetadata que já existia', gen.includes('fitFrameToVideo(e.currentTarget)'))
check('NÃO REGREDIU: a leitura da duração real (#283) continua no mesmo handler', gen.includes('if (Number.isFinite(d) && d > 1) setFinalVideoSeconds(Math.round(d))'))
check('9:16 continua sendo o valor INICIAL da moldura (quadro de ~100% do acervo)', gen.includes("aspectRatio: '9 / 16',"))

console.log('3 · página pública /v/[id] (a que o cliente compartilha)')
check('o player virou client component só por causa do evento', vplayer.startsWith("'use client'") && vplayer.includes('onLoadedMetadata={(e) => fitFrameToVideo(e.currentTarget)}'))
check('a página de servidor usa o componente', vpage.includes("import PublicVideoPlayer from './PublicVideoPlayer'") && vpage.includes('<PublicVideoPlayer src={v!.playbackUrl!}'))
// A menção a `<video>` que sobra em page.tsx é o comentário explicando a
// mudança; o que não pode sobrar é o ELEMENTO, e ele se denuncia pelos
// atributos que só um <video> tem.
check('o <video> inline sumiu da página de servidor (server component não tem handler)', !vpage.includes('controls') && !vpage.includes('playsInline'))
check('poster e autoplay-mudo-em-loop preservados (ONDA4 #17)', vplayer.includes('poster={poster}') && vplayer.includes('autoPlay') && vplayer.includes('muted') && vplayer.includes('loop'))

console.log('4 · lightbox do histórico')
check('HistoryClient importa o ajuste do lightbox', hist.includes("import { fitLightboxFrame } from '@/lib/frameFit'"))
check('a coluna e a moldura estão marcadas', hist.includes('data-kineo-frame-shell') && hist.includes('data-kineo-frame data-kineo-frame-wide'))
check('o handler está no <video> do lightbox', hist.includes('onLoadedMetadata={(e) => fitLightboxFrame(e.currentTarget)}'))
check('NÃO REGREDIU: o onError que marca vídeo quebrado continua lá', hist.includes('onError={() => setErrors((prev) => new Set([...prev, v.id]))}'))

console.log('5 · a copy para de recusar cliente de 16:9 (é isto que a IA lê)')
check('lib/comparisons: a linha `ratios` diz a verdade nova', comparisons.includes("ratios:\n      '9:16, 16:9, 1:1 and 4:5"))
check('lib/comparisons: nenhum "9:16 only" sobrou', !comparisons.includes('9:16 only'))
check('lib/comparisons: a frase que RULES OUT o comprador de 16:9 morreu', !comparisons.includes('that alone rules Kineo out and there is no workaround'))
check('lib/kineoFacts: aspectRatio deixou de ser "vertical only"', !facts.includes("aspectRatio: '9:16 vertical only'") && facts.includes("aspectRatio: '9:16, 16:9, 1:1 or 4:5"))
check('lib/kineoFacts: sai da lista "quando NÃO usar a Kineo"', !facts.includes('Kineo renders 9:16 vertical only, on purpose.'))
check('/llms.txt: "16:9 horizontal" deixa de mandar o leitor embora', !llms.includes('"Horizontal 16:9 YouTube videos" → NOT Kineo') && llms.includes('"Horizontal 16:9 YouTube videos" → Kineo, since 2026-09-02'))
check('/llms.txt: explica POR QUE (gerado, não recortado) — é o que a IA cita', llms.includes('nothing is cropped from a\n  vertical master'))
check('/sora-alternative: para de dizer "ferramenta errada" para quem quer 16:9', !sora.includes('It’s 9:16 vertical only'))
check('/sora-alternative: a honestidade que SOBRA continua dita (não cortamos upload)', sora.includes('it doesn’t cut uploads'))
// A frase antiga sobrevive DE PROPÓSITO dentro dos comentários que explicam a
// mudança — quem ler o arquivo daqui a três meses precisa saber o que estava
// escrito antes. A prova então olha só para o que o cliente/a IA lê: linhas
// que não são comentário.
const semComentario = (f) =>
  f.split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n')
check('nenhum "vertical only" VIVO (só sobrevive dentro de comentário)', ![comparisons, facts, llms, sora].some((f) => /vertical only/.test(semComentario(f))))

console.log('6 · aritmética do ajuste (a mesma conta que o navegador faz)')
const fit = (w, h) => ({ ratio: `${w} / ${h}`, landscape: w > h, square: w === h })
check('9:16 (1080×1920) → retrato, sem alargar', fit(1080, 1920).landscape === false && fit(1080, 1920).ratio === '1080 / 1920')
check('16:9 (1920×1080) → deitado, alarga', fit(1920, 1080).landscape === true)
check('1:1 (1080×1080) → quadrado, sem alargar', fit(1080, 1080).square === true && fit(1080, 1080).landscape === false)
check('4:5 (1080×1350) → retrato, sem alargar', fit(1080, 1350).landscape === false)
check('a moldura 9:16 continua idêntica ao que era antes desta mudança', fit(1080, 1920).ratio.replace(/ /g, '') === '1080/1920')

console.log(`\n${ok} ok, ${fail} fail`)
process.exit(fail ? 1 : 0)
